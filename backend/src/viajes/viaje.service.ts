import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Viaje } from './viaje.entity.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { EstadoViaje, EstadoPasaje, MetodoPago, Sentido } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { liberarHoldsVencidos } from '../pasajes/hold.service.js';

/** Umbral de inasistencias en efectivo que activa el marcado de moroso (RN-05). */
const UMBRAL_MOROSO = 3;

export interface CupoViajeDto {
  viajeId: number;
  capacidadTotal: number;
  cuposOcupados: number;
  cuposLibres: number;
}

export class ViajeService {
  private getEm(): EntityManager {
    const em = RequestContext.getEntityManager() as EntityManager;
    if (!em) throw new Error('No se encontró EntityManager en el contexto actual');
    return em;
  }

  /**
   * Obtiene un viaje por ID.
   * Ejecuta primero la limpieza lazy de holds vencidos (§7) para que el cupo
   * disponible esté actualizado al momento de la consulta.
   */
  async obtenerPorId(id: number): Promise<Viaje> {
    const em = this.getEm();

    // 1. Limpieza lazy de holds vencidos para este viaje
    await liberarHoldsVencidos(em, id);

    // 2. Buscar viaje con horario poblado
    const viaje = await em.findOne(Viaje, { id }, { populate: ['horario'] });
    if (!viaje) {
      throw new HttpError(404, 'Viaje no encontrado');
    }

    return viaje;
  }

  /**
   * Lista los viajes según filtros opcionales (sentido, fecha).
   * Ejecuta primero la limpieza lazy de holds vencidos a nivel general (§7)
   * antes de responder el catálogo con cupos actualizados.
   */
  async listar(filtros?: { sentido?: Sentido; fecha?: string }): Promise<Viaje[]> {
    const em = this.getEm();

    // 1. Limpieza lazy de holds vencidos en todos los viajes
    await liberarHoldsVencidos(em);

    // 2. Filtrado de viajes
    const where: Record<string, any> = {};
    if (filtros?.fecha) {
      where.fecha = filtros.fecha;
    }
    if (filtros?.sentido) {
      where.horario = { sentido: filtros.sentido };
    }

    return em.find(Viaje, where, {
      populate: ['horario'],
      orderBy: { fecha: 'ASC', hora: 'ASC' },
    });
  }

  /**
   * Consulta el cupo disponible de un viaje en tiempo real (RF-12, §7).
   */
  async consultarCupo(viajeId: number): Promise<CupoViajeDto> {
    const viaje = await this.obtenerPorId(viajeId);
    return {
      viajeId: viaje.id,
      capacidadTotal: viaje.capacidadTotal,
      cuposOcupados: viaje.cuposOcupados,
      cuposLibres: Math.max(0, viaje.capacidadTotal - viaje.cuposOcupados),
    };
  }

  /**
   * Cierra un viaje y aplica la lógica de marcado de morosos (HU-16, RN-05).
   *
   * Pasos dentro de la transacción:
   *   1. Verifica que el viaje exista y esté en estado PROGRAMADO o EN_CURSO.
   *   2. Cambia el estado del viaje a FINALIZADO.
   *   3. Busca todos los pasajes del viaje con estado NO_SHOW y método de pago EFECTIVO.
   *   4. Por cada pasaje no-show en efectivo: incrementa inasistenciasEfectivo del usuario.
   *      Si el nuevo valor llega a UMBRAL_MOROSO (3), marca esMoroso = true.
   *   5. COMMIT.
   *
   * Retorna un resumen con cuántos usuarios fueron actualizados y cuántos
   * quedaron recién marcados como morosos en este cierre.
   */
  async cerrarViaje(viajeId: number): Promise<{
    viajeId: number;
    noShowsEfectivo: number;
    nuevosMorosos: number;
    mensaje: string;
  }> {
    const em = this.getEm();

    return em.transactional(async (txEm) => {
      // 1. Verificar existencia y estado del viaje
      const viaje = await txEm.findOne(Viaje, { id: viajeId });
      if (!viaje) {
        throw new HttpError(404, 'Viaje no encontrado');
      }
      if (viaje.estado === EstadoViaje.FINALIZADO) {
        throw new HttpError(400, 'El viaje ya se encuentra finalizado');
      }
      if (viaje.estado === EstadoViaje.CANCELADO) {
        throw new HttpError(400, 'No se puede finalizar un viaje cancelado');
      }

      // 2. Marcar el viaje como finalizado
      viaje.estado = EstadoViaje.FINALIZADO;

      // 3. Buscar pasajes no_show con pago en efectivo en este viaje
      const pasajesNoShow = await txEm.find(
        Pasaje,
        {
          viaje: viajeId,
          estado: EstadoPasaje.NO_SHOW,
          pago: { metodo: MetodoPago.EFECTIVO },
        },
        { populate: ['usuario', 'pago'] }
      );

      // 4. Actualizar inasistencias y marcar morosos
      let nuevosMorosos = 0;

      for (const pasaje of pasajesNoShow) {
        const usuario = pasaje.usuario as Usuario;

        usuario.inasistenciasEfectivo += 1;

        if (!usuario.esMoroso && usuario.inasistenciasEfectivo >= UMBRAL_MOROSO) {
          usuario.esMoroso = true;
          nuevosMorosos += 1;
        }
      }

      // 5. COMMIT de todos los cambios en una sola transacción
      await txEm.flush();

      const mensaje =
        pasajesNoShow.length === 0
          ? 'Viaje finalizado. No hubo pasajes no-show en efectivo.'
          : `Viaje finalizado. Se procesaron ${pasajesNoShow.length} no-show(s) en efectivo.` +
            (nuevosMorosos > 0
              ? ` ${nuevosMorosos} usuario(s) quedaron marcados como morosos.`
              : '');

      return {
        viajeId,
        noShowsEfectivo: pasajesNoShow.length,
        nuevosMorosos,
        mensaje,
      };
    });
  }
}
