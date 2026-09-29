import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Pago } from '../pagos/pago.entity.js';
import { Viaje } from '../viajes/viaje.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { EstadoPago, EstadoPasaje, MetodoPago, Rol } from '../shared/types/index.js';
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

  /**
   * Lista todos los usuarios con es_moroso = true (HU-17, RF-19).
   * Solo pasajeros — los administradores y choferes no pueden ser morosos.
   */
  async listarMorosos(): Promise<Usuario[]> {
    const em = this.getEm();
    return em.find(
      Usuario,
      { esMoroso: true, rol: Rol.PASAJERO },
      { orderBy: { apellido: 'ASC', nombre: 'ASC' } }
    );
  }

  /**
   * Reactiva manualmente a un pasajero moroso (HU-17, RF-20, RN-05).
   * Pone es_moroso = false e inasistencias_efectivo = 0.
   */
  async reactivarMoroso(usuarioId: number): Promise<{
    usuarioId: number;
    nombre: string;
    apellido: string;
    mensaje: string;
  }> {
    const em = this.getEm();

    const usuario = await em.findOne(Usuario, { id: usuarioId });
    if (!usuario) {
      throw new HttpError(404, 'Usuario no encontrado');
    }
    if (usuario.rol !== Rol.PASAJERO) {
      throw new HttpError(400, 'Solo se pueden reactivar cuentas de pasajeros');
    }
    if (!usuario.esMoroso) {
      throw new HttpError(400, 'El usuario no está marcado como moroso');
    }

    usuario.esMoroso = false;
    usuario.inasistenciasEfectivo = 0;
    await em.flush();

    return {
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      mensaje: `${usuario.nombre} ${usuario.apellido} fue reactivado. Ya puede volver a reservar en efectivo.`,
    };
  }
}
