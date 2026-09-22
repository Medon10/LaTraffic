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

  /**
   * GET /chofer/viajes/:id/pasajeros  (HU-12)
   *
   * Lista los pasajeros confirmados del viaje con su punto de origen/parada
   * y destino. NO expone email, método de pago ni datos financieros.
   */
  async getPasajeros(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const viajeId = parseInt(req.params['id'] as string, 10);
      if (isNaN(viajeId) || viajeId <= 0) {
        res.status(400).json({ error: true, message: 'El ID del viaje debe ser un número entero positivo.' });
        return;
      }

      const resultado = await choferService.obtenerPasajeros(viajeId);

      res.status(200).json({ error: false, data: resultado });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /chofer/pasajes/:id/documento  (HU-14, RF-17)
   *
   * Marca documento_verificado = false en el pasaje indicado.
   * No dispara ninguna lógica automática; solo registra la excepción
   * para que el administrador pueda consultarla.
   */
  async patchDocumento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pasajeId = parseInt(req.params['id'] as string, 10);
      if (isNaN(pasajeId) || pasajeId <= 0) {
        res.status(400).json({ error: true, message: 'El ID del pasaje debe ser un número entero positivo.' });
        return;
      }

      const resultado = await choferService.marcarDocumentoNoVerificado(pasajeId);

      res.status(200).json({ error: false, data: resultado });
    } catch (err) {
      next(err);
    }
  }
}
