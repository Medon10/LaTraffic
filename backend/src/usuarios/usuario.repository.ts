import { EntityManager } from '@mikro-orm/core';
import { Repository } from '../repository.js';
import { Usuario } from './usuario.entity.js';

export class UsuarioRepository extends Repository<Usuario> {
  constructor(em: EntityManager) {
    super(em, Usuario);
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.findOne({ email });
  }

  async findByDni(dni: string): Promise<Usuario | null> {
    return this.findOne({ dni });
  }
}
