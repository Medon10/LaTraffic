import { Router } from 'express';
import { CuponController } from './cupon.controller.js';
import { validarCuponSchema } from './cupon.schema.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { verificarToken } from '../shared/middleware/auth.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';

const router = Router();
const cuponController = new CuponController();

/**
 * POST /cupones/validar
 * Valida un código de cupón para el usuario autenticado (HU-22).
 * Requiere JWT válido: el cupón de uso único por persona necesita saber quién pregunta.
 */
router.post(
  '/validar',
  verificarToken,
  validate(validarCuponSchema),
  asyncHandler(cuponController.validar)
);

export { router as cuponRoutes };
