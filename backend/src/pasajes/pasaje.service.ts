import { EntityManager, RequestContext } from '@mikro-orm/core';
import { CuponService } from '../cupones/cupon.service.js';

export interface CrearPasajeDto {
  viajeId: number;
  paradaOrigenId?: number;
  domicilioOrigen?: string;
  paradaDestinoId?: number;
  domicilioDestino?: string;
  cuponId?: number;
  montoTotal: number;
}

/**
 * Servicio de pasajes (HU-07, HU-08, HU-09, HU-10).
 *
 * crearPasaje: persiste el Pasaje y, si viene un cuponId validado,
 * registra el CuponUso en la misma transacción (HU-22).
 *
 * Nota: el endpoint HTTP POST /pasajes se activa en HU-07/08/09/10.
 * Esta implementación de la capa de servicio ya deja lista la integración
 * con cupones para no tener que tocar este archivo en esa historia.
 */
export class PasajeService {
  constructor(
    private readonly cuponService: CuponService = new CuponService()
  ) {}

  /**
   * Crea un pasaje y, opcionalmente, registra el uso del cupón.
   * Toda la operación corre dentro de una única transacción.
   */
  async crearPasaje(dto: CrearPasajeDto, usuarioId: number): Promise<{ pasajeId: number }> {
    const em: EntityManager = RequestContext.getEntityManager() as EntityManager;
    if (!em) {
      throw new Error('No se encontró un EntityManager disponible en el contexto.');
    }

    return em.transactional(async (txEm) => {
      // 1. Crear el pasaje
      const { Pasaje } = await import('../pasajes/pasaje.entity.js');
      const pasaje = txEm.create(Pasaje, {
        usuario: usuarioId as any,
        viaje: dto.viajeId as any,
        paradaOrigen: dto.paradaOrigenId ? (dto.paradaOrigenId as any) : undefined,
        domicilioOrigen: dto.domicilioOrigen ?? null,
        paradaDestino: dto.paradaDestinoId ? (dto.paradaDestinoId as any) : undefined,
        domicilioDestino: dto.domicilioDestino ?? null,
      } as any);
      txEm.persist(pasaje);
      await txEm.flush();

      // 2. Si hay cupón validado, registrar el uso (HU-22)
      if (dto.cuponId !== undefined && dto.cuponId !== null) {
        await this.cuponService.registrarUso(dto.cuponId, usuarioId, pasaje.id, txEm);
        await txEm.flush();
      }

      return { pasajeId: pasaje.id };
    });
  }
}
