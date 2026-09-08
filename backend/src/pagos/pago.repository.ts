import { EntityManager } from '@mikro-orm/core';
import { Repository } from '../repository.js';
import { Pago } from './pago.entity.js';

export class PagoRepository extends Repository<Pago> {
  constructor(em: EntityManager) {
    super(em, Pago);
  }
}
