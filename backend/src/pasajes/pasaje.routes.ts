import { Router } from 'express';
import { PasajeController } from './pasaje.controller.js';
import { crearPasajeSchema, subirComprobanteSchema } from './pasaje.schema.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';
import { Rol } from '../shared/types/index.js';

const router = Router();
const pasajeController = new PasajeController();

/**
 * POST /pasajes
 *
 * Crea una reserva de pasaje para el pasajero autenticado (HU-08, HU-09, HU-10).
 */
router.post(
  '/',
  verificarToken,
  autorizar(Rol.PASAJERO),
  validate(crearPasajeSchema),
  asyncHandler(pasajeController.crear)
);

/**
 * GET /pasajes/mis-reservas
 *
 * Lista el historial y reservas del pasajero autenticado (HU-09, HU-11).
 * Ejecuta la limpieza lazy de holds antes de responder.
 */
router.get(
  '/mis-reservas',
  verificarToken,
  autorizar(Rol.PASAJERO),
  asyncHandler(pasajeController.misReservas)
);

/**
 * POST /pasajes/:id/comprobante
 *
 * Permite al pasajero subir comprobante en la web como opción adicional a WhatsApp (HU-09).
 */
router.post(
  '/:id/comprobante',
  verificarToken,
  autorizar(Rol.PASAJERO),
  validate(subirComprobanteSchema),
  asyncHandler(pasajeController.subirComprobante)
);

export { router as pasajeRoutes };

