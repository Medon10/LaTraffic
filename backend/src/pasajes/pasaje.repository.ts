import { EntityManager } from '@mikro-orm/core';
import { Repository } from '../repository.js';
import { Pasaje } from './pasaje.entity.js';

export class PasajeRepository extends Repository<Pasaje> {
  constructor(em: EntityManager) {
    super(em, Pasaje);
  }
}
