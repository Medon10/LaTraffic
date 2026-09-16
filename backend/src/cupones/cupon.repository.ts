import { EntityManager } from '@mikro-orm/core';
import { Repository } from '../repository.js';
import { Cupon } from './cupon.entity.js';
import { CuponUso } from './cupon-uso.entity.js';

/**
 * Repositorio para la entidad Cupon.
 */
export class CuponRepository extends Repository<Cupon> {
  constructor(em?: EntityManager) {
    super(em, Cupon);
  }

  /** Busca un cupón por su código (case-insensitive). */
  findByCodigo(codigo: string): Promise<Cupon | null> {
    return this.findOne({ codigo: { $ilike: codigo } } as any);
  }
}

/**
 * Repositorio para la entidad CuponUso.
 */
export class CuponUsoRepository extends Repository<CuponUso> {
  constructor(em?: EntityManager) {
    super(em, CuponUso);
  }

  /**
   * Verifica si un usuario ya usó un cupón determinado.
   * Usado para la regla uso_unico_por_persona (HU-22, RN-02).
   */
  findUso(cuponId: number, usuarioId: number): Promise<CuponUso | null> {
    return this.findOne({ cupon: cuponId, usuario: usuarioId } as any);
  }
}
