import { Request, Response, NextFunction } from 'express';
import { ChoferService } from './chofer.service.js';

const choferService = new ChoferService();

export class ChoferController {
  /**
   * GET /chofer/viajes/:id/ruta
   *
   * Devuelve la ruta optimizada del viaje para el chofer (RF-16, T-08).
   * Recolecta los puntos de parada de todos los pasajes confirmados y
   * llama a la API de Directions de Google Maps con optimize_waypoints=true.
   */
  async getRuta(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const viajeId = parseInt(req.params['id'] as string, 10);
      if (isNaN(viajeId) || viajeId <= 0) {
        res.status(400).json({ error: true, message: 'El ID del viaje debe ser un número entero positivo.' });
        return;
      }

      const resultado = await choferService.obtenerRuta(viajeId);

      res.status(200).json({ error: false, data: resultado });
    } catch (err) {
      next(err);
    }
  }
}
