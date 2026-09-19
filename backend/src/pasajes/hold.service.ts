import { EntityManager } from '@mikro-orm/core';
import { Pasaje } from './pasaje.entity.js';
import { Viaje } from '../viajes/viaje.entity.js';
import { EstadoPasaje, EstadoPago, MetodoPago } from '../shared/types/index.js';

export interface LiberarHoldsResult {
  liberados: number;
  pasajesIds: number[];
}

/**
 * Limpieza lazy de holds vencidos según diseno-arquitectura.md §7.
 *
 * Busca reservas de pasajes en estado 'pendiente_pago' con método 'transferencia' (hold 4h)
 * o 'mercadopago' (hold 30m) cuya 'fecha_expiracion_hold' ya haya caducado (fechaExpiracionHold < now()).
 *
 * Para cada reserva vencida:
 *  1. Pasa el Pasaje a estado 'vencida'.
 *  2. Pasa el Pago a estado 'vencido'.
 *  3. Decrementa 'cupos_ocupados' del Viaje correspondiente (asegurando cupos >= 0)
 *     para liberar el asiento para otros usuarios.
 *
 * Parámetros:
 *  - em: EntityManager (puede ser txEm si se ejecuta dentro de una transacción).
 *  - viajeId: (opcional) Si se pasa, solo procesa los pasajes de ese viaje específico.
 *  - viajeInstancia: (opcional) Instancia ya bloqueada (ej. vía FOR UPDATE) para
 *    actualizar su propiedad cuposOcupados en memoria de inmediato.
 */
export async function liberarHoldsVencidos(
  em: EntityManager,
  viajeId?: number,
  viajeInstancia?: Viaje
): Promise<LiberarHoldsResult> {
  const ahora = new Date();

  const whereClause: Record<string, any> = {
    estado: EstadoPasaje.PENDIENTE_PAGO,
  };
  if (viajeId) {
    whereClause.viaje = viajeId;
  }

  // Obtenemos los pasajes con su pago y viaje
  const pasajes = await em.find(
    Pasaje,
    whereClause,
    { populate: ['pago', 'viaje'] }
  );

  const pasajesVencidos = pasajes.filter((p) => {
    const pago = p.pago;
    return (
      pago &&
      (pago.metodo === MetodoPago.TRANSFERENCIA || pago.metodo === MetodoPago.MERCADOPAGO) &&
      pago.fechaExpiracionHold &&
      pago.fechaExpiracionHold < ahora
    );
  });

  if (pasajesVencidos.length === 0) {
    return { liberados: 0, pasajesIds: [] };
  }

  const pasajesIds: number[] = [];
  for (const pasaje of pasajesVencidos) {
    pasaje.estado = EstadoPasaje.VENCIDA;
    if (pasaje.pago) {
      pasaje.pago.estado = EstadoPago.VENCIDO;
    }

    const viaje =
      viajeInstancia && viajeInstancia.id === pasaje.viaje.id
        ? viajeInstancia
        : (pasaje.viaje as Viaje);

    if (viaje && viaje.cuposOcupados > 0) {
      viaje.cuposOcupados -= 1;
    }
    pasajesIds.push(pasaje.id);
  }

  await em.flush();

  return {
    liberados: pasajesVencidos.length,
    pasajesIds,
  };
}
