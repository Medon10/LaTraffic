import { Request, Response } from 'express';
import { ParadaService } from './parada.service.js';

export class ParadaController {
  constructor(
    private readonly paradaService: ParadaService = new ParadaService()
  ) {}

  /**
   * GET /paradas
   * Catálogo de puntos fijos de encuentro (HU-05, DER §1.4).
   * Público — no requiere autenticación.
   */
  getAll = async (_req: Request, res: Response): Promise<void> => {
    const paradas = await this.paradaService.findAll();
    res.status(200).json({ error: false, paradas });
  };
}

