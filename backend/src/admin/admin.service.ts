import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Pago } from '../pagos/pago.entity.js';
import { Viaje } from '../viajes/viaje.entity.js';
import { EstadoPago, EstadoPasaje, MetodoPago } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { liberarHoldsVencidos } from '../pasajes/hold.service.js';

export class AdminService {
  private getEm(): EntityManager {
    const em = RequestContext.getEntityManager() as EntityManager;
    if (!em) throw new Error('No se encontró EntityManager en el contexto actual');
    return em;
  }

  /**
   * Lista los pagos por transferencia pendientes de validación (HU-15).
   * Ejecuta primero la limpieza lazy de holds vencidos (§7).
   */
  async listarPagosPendientes(): Promise<Pago[]> {
    const em = this.getEm();

    // 1. Limpiar holds vencidos antes de listar
    await liberarHoldsVencidos(em);

    // 2. Buscar pagos pendientes de transferencia
    return em.find(
      Pago,
      {
        metodo: MetodoPago.TRANSFERENCIA,
        estado: EstadoPago.PENDIENTE,
      },
      {
        populate: ['pasaje', 'pasaje.usuario', 'pasaje.viaje', 'pasaje.paradaOrigen', 'pasaje.paradaDestino'],
        orderBy: { id: 'DESC' },
      }
    );
  }

  /**
   * Valida manualmente un pago de transferencia (HU-15 / Opción 1: Híbrido WhatsApp).
   *
   *  - Si acción = 'aprobar':
   *      pago.estado pasa a 'aprobado', fechaPago = now(), pasaje.estado pasa a 'confirmada'.
   *  - Si acción = 'rechazar':
   *      pago.estado pasa a 'rechazado', pasaje.estado pasa a 'cancelada', viaje.cuposOcupados decrementa.
   */
  async validarPago(
    pagoId: number,
    accion: 'aprobar' | 'rechazar',
    _motivo?: string
  ): Promise<{
    pagoId: number;
    estadoPago: string;
    estadoPasaje: string;
    mensaje: string;
  }> {
    const em = this.getEm();

    const pago = await em.findOne(
      Pago,
      { id: pagoId },
      { populate: ['pasaje', 'pasaje.viaje'] }
    );

    if (!pago) {
      throw new HttpError(404, 'Pago no encontrado');
    }

    if (pago.estado !== EstadoPago.PENDIENTE) {
      throw new HttpError(
        400,
        `El pago ya se encuentra en estado '${pago.estado}' y no puede ser validado nuevamente`
      );
    }

    const ahora = new Date();
    if (
      pago.fechaExpiracionHold &&
      pago.fechaExpiracionHold < ahora
    ) {
      // Hold vencido
      pago.estado = EstadoPago.VENCIDO;
      pago.pasaje.estado = EstadoPasaje.VENCIDA;
      const viaje = pago.pasaje.viaje as Viaje;
      if (viaje && viaje.cuposOcupados > 0) {
        viaje.cuposOcupados -= 1;
      }
      await em.flush();
      throw new HttpError(
        400,
        'El plazo de 4 horas del hold ha expirado. La reserva ya fue dada de baja.'
      );
    }

    if (accion === 'aprobar') {
      pago.estado = EstadoPago.APROBADO;
      pago.fechaPago = new Date();
      pago.pasaje.estado = EstadoPasaje.CONFIRMADA;
      await em.flush();

      return {
        pagoId: pago.id,
        estadoPago: pago.estado,
        estadoPasaje: pago.pasaje.estado,
        mensaje: 'Pago aprobado con éxito. El pasaje ha quedado confirmado.',
      };
    } else {
      pago.estado = EstadoPago.RECHAZADO;
      pago.pasaje.estado = EstadoPasaje.CANCELADA;
      const viaje = pago.pasaje.viaje as Viaje;
      if (viaje && viaje.cuposOcupados > 0) {
        viaje.cuposOcupados -= 1;
      }
      await em.flush();

      return {
        pagoId: pago.id,
        estadoPago: pago.estado,
        estadoPasaje: pago.pasaje.estado,
        mensaje: 'Pago rechazado. El pasaje fue cancelado y el cupo liberado.',
      };
    }
  }
}
