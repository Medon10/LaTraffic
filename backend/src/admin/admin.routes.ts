import { Router } from 'express';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';
import { Rol } from '../shared/types/index.js';
import { AdminController } from './admin.controller.js';
import { validarPagoSchema } from './admin.schema.js';

const router = Router();
const adminController = new AdminController();

// Todas las rutas de administración requieren autenticación y rol de administrador
router.use(verificarToken, autorizar(Rol.ADMINISTRADOR));

router.get('/usuarios', (_req, res) => {
  res.json({ error: false, message: 'Panel de administración de usuarios' });
});

/**
 * GET /admin/pagos/pendientes
 *
 * Lista los pagos de transferencia pendientes de confirmación (HU-15).
 */
router.get('/pagos/pendientes', asyncHandler(adminController.listarPagosPendientes));

/**
 * PATCH /admin/pagos/:id/validar
 *
 * Valida (aprueba o rechaza) un pago por transferencia (HU-15 / Opción 1: Híbrido WhatsApp).
 */
router.patch(
  '/pagos/:id/validar',
  validate(validarPagoSchema),
  asyncHandler(adminController.validarPago)
);

/**
 * GET /admin/usuarios?moroso=true
 *
 * Lista los pasajeros marcados como morosos (HU-17, RF-19).
 */
router.get('/usuarios', asyncHandler(adminController.listarMorosos));

/**
 * PATCH /admin/usuarios/:id/reactivar-moroso
 *
 * Reactiva un pasajero moroso: es_moroso = false, inasistencias_efectivo = 0 (HU-17, RF-20).
 */
router.patch('/usuarios/:id/reactivar-moroso', asyncHandler(adminController.reactivarMoroso));

export { router as adminRoutes };
