import MercadoPago, { Preference, Payment } from 'mercadopago';
import crypto from 'crypto';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Resultado normalizado de una notificación de Mercado Pago.
 * Contiene los datos necesarios para actualizar Pago y Pasaje.
 */
export interface MpNotificacionResult {
  mpPaymentId: string;
  pasajeId: number;
  /**
   * 'aprobado' | 'rechazado' | 'pendiente' | 'ignorado'
   * 'ignorado' se usa cuando el tipo de notificación no es un pago (ej. preference)
   */
  resultado: 'aprobado' | 'rechazado' | 'pendiente' | 'ignorado';
}

export class MercadoPagoService {
  private readonly client: MercadoPago;
  private readonly preferenceApi: Preference;
  private readonly paymentApi: Payment;

  constructor() {
    if (!MP_ACCESS_TOKEN) {
      console.warn('[MercadoPago] MP_ACCESS_TOKEN no configurado — las llamadas fallarán en producción');
    }
    this.client = new MercadoPago({ accessToken: MP_ACCESS_TOKEN });
    this.preferenceApi = new Preference(this.client);
    this.paymentApi = new Payment(this.client);
  }

  /**
   * Crea una preferencia de pago en Mercado Pago (sandbox o prod, según el access token).
   *
   * @param pasajeId   ID del pasaje al que corresponde este pago
   * @param monto      Monto total en pesos argentinos
   * @param descripcion Texto descriptivo que verá el comprador (ej. "Pasaje Colón → Rosario")
   * @returns          { preferenceId, initPoint } — initPoint es la URL de pago de MP
   */
  async crearPreferencia(
    pasajeId: number,
    monto: number,
    descripcion: string = 'Pasaje La Traffic'
  ): Promise<{ preferenceId: string; initPoint: string }> {
    const preference = await this.preferenceApi.create({
      body: {
        items: [
          {
            id: `pasaje-${pasajeId}`,
            title: descripcion,
            quantity: 1,
            unit_price: monto,
            currency_id: 'ARS',
          },
        ],
        /**
         * external_reference: clave para correlacionar la notificación del webhook
         * con el pasaje en nuestra base de datos.
         */
        external_reference: String(pasajeId),
        back_urls: {
          success: `${FRONTEND_URL}/mis-reservas?pago=exitoso`,
          failure: `${FRONTEND_URL}/mis-reservas?pago=fallido`,
          pending: `${FRONTEND_URL}/mis-reservas?pago=pendiente`,
        },
        /**
         * auto_return: redirige automáticamente al usuario en caso de pago exitoso.
         * Solo funciona en integraciones con checkout básico (no checkout pro brickless).
         */
        auto_return: 'approved',
        /**
         * Notificaciones IPN deshabilitadas por defecto aquí;
         * se recomienda configurar la URL en el panel de MP para sandbox.
         * El webhook se recibe en POST /pagos/mercadopago/webhook
         */
      },
    });

    if (!preference.id || !preference.init_point) {
      throw new Error('[MercadoPago] La API no devolvió preferenceId ni init_point');
    }

    return {
      preferenceId: preference.id,
      initPoint: preference.init_point,
    };
  }

  /**
   * Procesa un webhook de Mercado Pago.
   *
   * MP envía notificaciones en dos formatos posibles:
   *   1. IPN (legacy): { id, topic }
   *   2. Webhooks v2: { action, data: { id } }
   *
   * En ambos casos, cuando topic/action es "payment", consultamos
   * la API de MP para obtener el estado real del pago.
   *
   * @param body   El body parseado del webhook
   * @param xSignature   Header x-signature para validar firma (opcional pero recomendado)
   * @param xRequestId   Header x-request-id para validar firma (opcional)
   */
  async procesarNotificacion(
    body: Record<string, any>,
    xSignature?: string,
    xRequestId?: string
  ): Promise<MpNotificacionResult> {
    // ── Validar firma si está configurado el secret ──
    if (MP_WEBHOOK_SECRET && xSignature && xRequestId) {
      this.validarFirma(body, xSignature, xRequestId);
    }

    // ── Detectar tipo de notificación y extraer paymentId ──
    let mpPaymentId: string | null = null;

    // Webhooks v2: { action: "payment.created", data: { id: "123" } }
    if (body.action && body.data?.id) {
      if (!body.action.startsWith('payment')) {
        return { mpPaymentId: '', pasajeId: 0, resultado: 'ignorado' };
      }
      mpPaymentId = String(body.data.id);
    }
    // IPN legacy: { id: "123", topic: "payment" }
    else if (body.topic === 'payment' && body.id) {
      mpPaymentId = String(body.id);
    }
    // IPN legacy alternativo: { type: "payment", data: { id: "123" } }
    else if (body.type === 'payment' && body.data?.id) {
      mpPaymentId = String(body.data.id);
    }

    if (!mpPaymentId) {
      // Notificación de otro tipo (preference, plan, etc.) — ignorar
      return { mpPaymentId: '', pasajeId: 0, resultado: 'ignorado' };
    }

    // ── Consultar el estado real del pago en la API de MP ──
    const pago = await this.paymentApi.get({ id: mpPaymentId });

    const pasajeId = pago.external_reference ? Number(pago.external_reference) : 0;

    if (!pasajeId || isNaN(pasajeId)) {
      throw new Error(
        `[MercadoPago] external_reference inválido o ausente en el pago ${mpPaymentId}: "${pago.external_reference}"`
      );
    }

    // ── Normalizar el estado ──
    let resultado: MpNotificacionResult['resultado'];
    switch (pago.status) {
      case 'approved':
        resultado = 'aprobado';
        break;
      case 'rejected':
      case 'cancelled':
        resultado = 'rechazado';
        break;
      default:
        resultado = 'pendiente';
    }

    return { mpPaymentId, pasajeId, resultado };
  }

  /**
   * Valida la firma HMAC-SHA256 que Mercado Pago incluye en el header x-signature.
   * Lanza HttpError 401 si la firma no es válida.
   * Documentación: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
   */
  private validarFirma(
    body: Record<string, any>,
    xSignature: string,
    xRequestId: string
  ): void {
    // El header x-signature tiene formato: "ts=<timestamp>,v1=<hash>"
    const parts = xSignature.split(',');
    let ts = '';
    let hash = '';
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    }

    if (!ts || !hash) {
      throw Object.assign(new Error('Firma de webhook inválida o ausente'), { statusCode: 401 });
    }

    // La cadena a firmar es: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
    const dataId = body.data?.id ?? '';
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expectedHash = crypto
      .createHmac('sha256', MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex');

    if (expectedHash !== hash) {
      throw Object.assign(new Error('Firma de webhook no coincide'), { statusCode: 401 });
    }
  }
}
