import { EntityManager, RequestContext } from '@mikro-orm/core';
import { MercadoPagoService } from './mercadopago.service.js';
import { PagoRepository } from './pago.repository.js';
import { Pago } from './pago.entity.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';
import { MetodoPago, EstadoPago, EstadoPasaje } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';

export class PagoService {
  constructor(
    private readonly mpService: MercadoPagoService = new MercadoPagoService(),
    private readonly pagoRepo: PagoRepository | null = null
  ) {}

  private getEm(): EntityManager {
    const em = RequestContext.getEntityManager() as EntityManager;
    if (!em) throw new Error('No se encontró EntityManager en el contexto actual');
    return em;
  }

  /**
   * Crea una preferencia de pago en Mercado Pago para el pasaje indicado (HU-08).
   *
   * Flujo:
   *  1. Valida que el pasaje exista, pertenezca al usuario y esté en estado pendiente_pago.
   *  2. Si ya existe un Pago asociado con método mercadopago, reutiliza la preferencia
   *     (idempotente — el usuario puede recargar la página sin generar una preferencia nueva).
   *  3. Crea el Pago en BD con estado "pendiente" y llama a MP para obtener el initPoint.
   *  4. Devuelve { preferenceId, initPoint } para que el frontend redirija al checkout de MP.
   */
  async crearPreferenciaMp(
    pasajeId: number,
    usuarioId: number
  ): Promise<{ preferenceId: string; initPoint: string }> {
    const em = this.getEm();

    // 1. Verificar que el pasaje existe y pertenece al usuario autenticado
    const pasaje = await em.findOne(
      Pasaje,
      { id: pasajeId, usuario: usuarioId },
      { populate: ['pago'] }
    );

    if (!pasaje) {
      throw new HttpError(404, 'Pasaje no encontrado o no pertenece a tu cuenta');
    }

    if (pasaje.estado !== EstadoPasaje.PENDIENTE_PAGO) {
      throw new HttpError(
        400,
        `El pasaje ya no está en estado pendiente_pago (estado actual: ${pasaje.estado})`
      );
    }

    // 2. Si ya existe un Pago MP pendiente asociado, reutilizarlo (idempotencia)
    if (pasaje.pago && pasaje.pago.metodo === MetodoPago.MERCADOPAGO) {
      // Necesitamos regenerar el initPoint porque MP no lo almacena; creamos una nueva preferencia
      // pero reutilizamos el registro de pago existente para no duplicar filas
      const result = await this.mpService.crearPreferencia(
        pasajeId,
        Number(pasaje.pago.monto),
        'Pasaje La Traffic'
      );
      return result;
    }

    // 3. Determinar el monto (por ahora lo exigimos en el body; en HU-09 se puede calcular acá)
    //    El monto real debería venir del viaje/horario; lo recibimos en el controller
    throw new HttpError(400, 'Para crear la preferencia enviá el monto en el body');
  }

  /**
   * Crea la preferencia y el registro de Pago en BD en un solo paso.
   * Llamado por el controller con el monto ya validado.
   */
  async iniciarPagoMp(
    pasajeId: number,
    usuarioId: number,
    monto: number
  ): Promise<{ preferenceId: string; initPoint: string }> {
    const em = this.getEm();

    // 1. Validar pasaje
    const pasaje = await em.findOne(
      Pasaje,
      { id: pasajeId, usuario: usuarioId },
      { populate: ['pago'] }
    );

    if (!pasaje) {
      throw new HttpError(404, 'Pasaje no encontrado o no pertenece a tu cuenta');
    }

    if (pasaje.estado !== EstadoPasaje.PENDIENTE_PAGO) {
      throw new HttpError(
        400,
        `El pasaje no está en estado pendiente_pago (estado actual: ${pasaje.estado})`
      );
    }

    // 2. Si ya existe un pago MP, regenerar preferencia sin duplicar
    if (pasaje.pago && pasaje.pago.metodo === MetodoPago.MERCADOPAGO) {
      return this.mpService.crearPreferencia(pasajeId, monto, 'Pasaje La Traffic');
    }

    // 3. Crear el registro de Pago en BD
    const pago = em.create(Pago, {
      pasaje,
      metodo: MetodoPago.MERCADOPAGO,
      monto,
      estado: EstadoPago.PENDIENTE,
      mpPaymentId: null,
    } as any);
    await em.flush();

    // 4. Crear la preferencia en MP
    const result = await this.mpService.crearPreferencia(pasajeId, monto, 'Pasaje La Traffic');
    return result;
  }

  /**
   * Procesa la notificación de Mercado Pago (webhook).
   *
   * Flujo (RF-08 / sección 8 del diseño):
   *  1. Delega la validación de firma y extracción del estado al MercadoPagoService.
   *  2. Busca el Pago por pasaje_id.
   *  3. Si fue aprobado: actualiza Pago (estado=aprobado, fechaPago, mpPaymentId)
   *     y Pasaje (estado=confirmada).
   *  4. Si fue rechazado: actualiza Pago (estado=rechazado) — el pasaje queda
   *     en pendiente_pago para que el usuario reintente con otro método.
   */
  async procesarWebhookMp(
    body: Record<string, any>,
    xSignature?: string,
    xRequestId?: string
  ): Promise<void> {
    const em = this.getEm();

    const notif = await this.mpService.procesarNotificacion(body, xSignature, xRequestId);

    // No hacemos nada si no es una notificación de pago
    if (notif.resultado === 'ignorado') return;
    // Tampoco si está pending (MP puede renotificar cuando pase a aprobado/rechazado)
    if (notif.resultado === 'pendiente') return;

    // Buscar el Pago correspondiente al pasaje
    const pago = await em.findOne(
      Pago,
      { pasaje: notif.pasajeId },
      { populate: ['pasaje'] }
    );

    if (!pago) {
      // Puede ocurrir si el webhook llega antes de que se persista el Pago (raro pero posible)
      throw new HttpError(
        404,
        `No se encontró el pago para el pasaje ${notif.pasajeId}`
      );
    }

    pago.mpPaymentId = notif.mpPaymentId;

    if (notif.resultado === 'aprobado') {
      pago.estado = EstadoPago.APROBADO;
      pago.fechaPago = new Date();
      // Confirmar el pasaje (RF-08)
      pago.pasaje.estado = EstadoPasaje.CONFIRMADA;
    } else {
      // rechazado / cancelado
      pago.estado = EstadoPago.RECHAZADO;
      // El pasaje sigue en pendiente_pago para que el usuario reintente
    }

    await em.flush();
  }
}
