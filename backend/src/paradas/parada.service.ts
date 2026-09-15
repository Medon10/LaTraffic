import { ParadaRepository } from './parada.repository.js';
import { Parada } from './parada.entity.js';

export class ParadaService {
  constructor(
    private readonly paradaRepo: ParadaRepository = new ParadaRepository()
  ) {}

  /**
   * GET /paradas
   * Retorna el catálogo completo de paradas fijas (Colón y pueblos intermedios),
   * ordenadas por id ascendente para reflejar el orden geográfico del recorrido.
   * Sección 1.4 del DER.
   */
  async findAll(): Promise<Parada[]> {
    return this.paradaRepo.findAll({ orderBy: { id: 'ASC' } });
  }
}

