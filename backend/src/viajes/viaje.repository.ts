import { EntityManager } from '@mikro-orm/core';
import { Repository } from '../repository.js';
import { Viaje } from './viaje.entity.js';

export class ViajeRepository extends Repository<Viaje> {
  constructor(em: EntityManager) {
    super(em, Viaje);
  }
}
