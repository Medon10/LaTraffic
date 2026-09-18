import { EntityManager, RequestContext } from '@mikro-orm/core';
import { MercadoPagoService } from './mercadopago.service.js';
import { PagoRepository } from './pago.repository.js';
import { Pago } from './pago.entity.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';
import { Viaje } from '../viajes/viaje.entity.js';
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
   * Crea una nueva preferencia MP para un pasaje ya existente en estado pendiente_pago.
   * Endpoint de recuperación idempotente: si el usuario cerró la pestaña o MP falló
   * al crear la preferencia post-commit, puede reintentarlo desde "Mis Reservas".
   *
   * No crea un nuevo Pago en BD — el Pago ya fue creado por PasajeService.reservarPasaje().
   */
  async iniciarPagoMp(
    pasajeId: number,
    usuarioId: number,
    monto: number
  ): Promise<{ preferenceId: string; initPoint: string }> {
    const em = this.getEm();

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

    if (!pasaje.pago || pasaje.pago.metodo !== MetodoPago.MERCADOPAGO) {
      throw new HttpError(
        400,
        'Este pasaje no tiene un pago por Mercado Pago asociado'
      );
    }

    // Reutilizar el monto guardado en BD (no confiar en el body en este endpoint)
    return this.mpService.crearPreferencia(
      pasajeId,
      Number(pasaje.pago.monto),
      'Pasaje La Traffic'
    );
  }

  /**
   * Procesa la notificación de Mercado Pago (webhook).
   *
   * Flujo (RF-08 / diseno-arquitectura.md §8):
   *  1. Delega la validación de firma y extracción del estado al MercadoPagoService.
   *  2. Si es 'ignorado' o 'pendiente', retorna sin hacer nada.
   *  3. Si es 'aprobado':
   *     - Actualiza Pago (estado=aprobado, fechaPago, mpPaymentId).
   *     - Confirma el Pasaje (estado=confirmada).
   *  4. Si es 'rechazado':
   *     - Actualiza Pago (estado=rechazado).
   *     - Cancela el Pasaje (estado=cancelada).
   *     - Decrementa cupos_ocupados del Viaje para liberar el lugar (RF-12).
   */
  async procesarWebhookMp(
    body: Record<string, any>,
    xSignature?: string,
    xRequestId?: string
  ): Promise<void> {
    const em = this.getEm();

    const notif = await this.mpService.procesarNotificacion(body, xSignature, xRequestId);

    if (notif.resultado === 'ignorado' || notif.resultado === 'pendiente') return;

    const pago = await em.findOne(
      Pago,
      { pasaje: notif.pasajeId },
      { populate: ['pasaje', 'pasaje.viaje'] }
    );

    if (!pago) {
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
      // Rechazado o cancelado por MP
      pago.estado = EstadoPago.RECHAZADO;
      // Cancelar el pasaje y liberar el cupo
      pago.pasaje.estado = EstadoPasaje.CANCELADA;
      // Decrementar cupos_ocupados del viaje (RF-12)
      const viaje = pago.pasaje.viaje as Viaje;
      if (viaje && viaje.cuposOcupados > 0) {
        viaje.cuposOcupados -= 1;
      }
    }

    await em.flush();
  }
}
