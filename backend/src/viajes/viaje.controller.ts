import { Request, Response } from 'express';
import { ViajeService } from './viaje.service.js';
import { Sentido } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';

export class ViajeController {
  constructor(private readonly viajeService: ViajeService = new ViajeService()) {}

  /**
   * GET /viajes?sentido=&fecha=
   *
   * Lista los viajes disponibles aplicando limpieza lazy de holds vencidos.
   */
  listar = async (req: Request, res: Response): Promise<void> => {
    const { sentido, fecha } = req.query;

    const viajes = await this.viajeService.listar({
      sentido: sentido as Sentido | undefined,
      fecha: typeof fecha === 'string' ? fecha : undefined,
    });

    const respuesta = viajes.map((v) => ({
      ...v,
      cupos_libres: Math.max(0, v.capacidadTotal - v.cuposOcupados),
    }));

    res.status(200).json(respuesta);
  };

  /**
   * GET /viajes/:id
   *
   * Obtiene un viaje por ID con información de cupo actualizada (lazy cleanup).
   */
  obtenerPorId = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'ID de viaje inválido');
    }

    const viaje = await this.viajeService.obtenerPorId(id);
    res.status(200).json({
      ...viaje,
      cupos_libres: Math.max(0, viaje.capacidadTotal - viaje.cuposOcupados),
    });
  };

  /**
   * GET /viajes/:id/cupo
   *
   * Consulta directa del cupo disponible para un viaje.
   */
  consultarCupo = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'ID de viaje inválido');
    }

    const cupo = await this.viajeService.consultarCupo(id);
    res.status(200).json(cupo);
  };
}
