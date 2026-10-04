import { Router } from 'express';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';
import { Rol } from '../shared/types/index.js';
import { CuponAdminController } from './cupon.admin.controller.js';
import { crearCuponSchema, actualizarCuponSchema } from './cupon.schema.js';

const router = Router();
const cuponAdminController = new CuponAdminController();

// Todas las rutas requieren autenticación con rol administrador
router.use(verificarToken, autorizar(Rol.ADMINISTRADOR));

/**
 * GET /admin/cupones
 * Lista todos los cupones del sistema (HU-23).
 */
router.get('/', asyncHandler(cuponAdminController.listar));

/**
 * POST /admin/cupones
 * Crea un nuevo cupón (HU-23).
 * Body: { codigo, tipo, valor, fechaInicio?, fechaFin?, usoUnicoPorPersona, activo }
 */
router.post('/', validate(crearCuponSchema), asyncHandler(cuponAdminController.crear));

/**
 * PATCH /admin/cupones/:id
 * Edita un cupón existente — tipo, valor, vigencia, activo/inactivo, uso único (HU-23).
 * El código no es editable (ver decisión en decisiones-tecnicas.md).
 */
router.patch('/:id', validate(actualizarCuponSchema), asyncHandler(cuponAdminController.actualizar));

export { router as cuponAdminRoutes };
