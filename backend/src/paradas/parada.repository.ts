import { EntityManager } from '@mikro-orm/core';
import { Repository } from '../repository.js';
import { Parada } from './parada.entity.js';

export class ParadaRepository extends Repository<Parada> {
  constructor(em: EntityManager) {
    super(em, Parada);
  }
}
