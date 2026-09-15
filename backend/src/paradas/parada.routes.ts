import { Router } from 'express';
import { ParadaController } from './parada.controller.js';
import { asyncHandler } from '../shared/utils/index.js';

const router = Router();
const paradaController = new ParadaController();

/**
 * GET /paradas
 * Catálogo de puntos fijos de encuentro (HU-05, DER §1.4).
 * Público — sin autenticación requerida.
 */
router.get('/', asyncHandler(paradaController.getAll));

export { router as paradaRoutes };

