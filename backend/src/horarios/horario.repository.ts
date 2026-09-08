import { EntityManager } from '@mikro-orm/core';
import { Repository } from '../repository.js';
import { Horario } from './horario.entity.js';

export class HorarioRepository extends Repository<Horario> {
  constructor(em: EntityManager) {
    super(em, Horario);
  }
}
