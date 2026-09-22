import { Router } from 'express';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { Rol } from '../shared/types/index.js';
import { ChoferController } from './chofer.controller.js';

const router = Router();
const controller = new ChoferController();

// Todas las rutas del chofer requieren autenticación y rol de chofer
router.use(verificarToken, autorizar(Rol.CHOFER));

/**
 * GET /chofer/viajes/:id/ruta
 * Devuelve la ruta optimizada del día para el chofer (RF-16, T-08).
 * Recolecta los puntos de origen/destino de los pasajes confirmados del viaje
 * y llama a Google Maps Directions API con optimize_waypoints=true.
 */
router.get('/viajes/:id/ruta', (req, res, next) => controller.getRuta(req, res, next));

/**
 * GET /chofer/viajes/:id/pasajeros  (HU-12)
 * Lista los pasajeros confirmados con origen/destino.
 * No expone email, método de pago ni datos financieros.
 */
router.get('/viajes/:id/pasajeros', (req, res, next) => controller.getPasajeros(req, res, next));

/**
 * PATCH /chofer/pasajes/:id/documento  (HU-14, RF-17)
 * Marca documento_verificado = false en el pasaje indicado.
 * Sin payload requerido ni lógica automática adicional.
 */
router.patch('/pasajes/:id/documento', (req, res, next) => controller.patchDocumento(req, res, next));

export { router as choferRoutes };
