import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Viaje } from './viaje.entity.js';
import { Sentido } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { liberarHoldsVencidos } from '../pasajes/hold.service.js';

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
}
