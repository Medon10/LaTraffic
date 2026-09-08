import { FilterQuery, FindOptions, EntityManager, EntityName, RequiredEntityData, AnyEntity, EntityData, FromEntityType } from '@mikro-orm/core';

/**
 * Repositorio base genérico.
 * Encapsula las operaciones CRUD comunes para cualquier entidad.
 * Los repositorios específicos de cada módulo extienden esta clase.
 */
export class Repository<T extends AnyEntity> {
  constructor(
    protected readonly em: EntityManager,
    protected readonly entityClass: EntityName<T>
  ) {}

  async findAll(options?: FindOptions<T>): Promise<T[]> {
    return this.em.find(this.entityClass, {} as FilterQuery<NoInfer<T>>, options);
  }

  async findOne(where: FilterQuery<NoInfer<T>>, options?: FindOptions<T>): Promise<T | null> {
    return this.em.findOne(this.entityClass, where, options);
  }

  async findOneOrFail(where: FilterQuery<NoInfer<T>>, options?: FindOptions<T>): Promise<T> {
    return this.em.findOneOrFail(this.entityClass, where, options);
  }

  async create(data: RequiredEntityData<T>): Promise<T> {
    const entity = this.em.create(this.entityClass, data);
    this.em.persist(entity);
    await this.em.flush();
    return entity;
  }

  async update(entity: T, data: EntityData<FromEntityType<T>, false>): Promise<T> {
    this.em.assign(entity, data);
    await this.em.flush();
    return entity;
  }

  async delete(entity: T): Promise<void> {
    this.em.remove(entity);
    await this.em.flush();
  }

  async count(where?: FilterQuery<NoInfer<T>>): Promise<number> {
    return this.em.count(this.entityClass, where);
  }
}
