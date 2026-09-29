import { Router } from 'express';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';
import { Rol } from '../shared/types/index.js';
import { AdminController } from './admin.controller.js';
import { validarPagoSchema, cambiarEstadoSchema } from './admin.schema.js';

const router = Router();
const adminController = new AdminController();

// Todas las rutas de administración requieren autenticación y rol de administrador
router.use(verificarToken, autorizar(Rol.ADMINISTRADOR));

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
 * El query param ?moroso=true es el único filtro soportado actualmente.
 */
router.get('/usuarios', asyncHandler(adminController.listarMorosos));

/**
 * PATCH /admin/usuarios/:id/reactivar-moroso
 *
 * Reactiva un pasajero moroso: es_moroso = false, inasistencias_efectivo = 0 (HU-17, RF-20).
 */
router.patch('/usuarios/:id/reactivar-moroso', asyncHandler(adminController.reactivarMoroso));

// ── HU-18 — Gestión de cuentas de usuario ─────────────────────────────────────

/**
 * GET /admin/cuentas/usuarios
 *
 * Lista todos los usuarios (pasajeros y choferes) para la sección "Cuentas de Usuario"
 * del panel de administración (HU-18).
 */
router.get('/cuentas/usuarios', asyncHandler(adminController.listarUsuarios));

/**
 * PATCH /admin/usuarios/:id/estado
 *
 * Habilita o deshabilita una cuenta de usuario.
 * Body: { activo: boolean }
 * No se puede aplicar sobre cuentas de administrador (HU-18, RF-21).
 */
router.patch(
  '/usuarios/:id/estado',
  validate(cambiarEstadoSchema),
  asyncHandler(adminController.cambiarEstadoCuenta)
);

// ── HU-19 — Estadísticas ───────────────────────────────────────────────────────

/**
 * GET /admin/estadisticas
 *
 * Retorna métricas de recaudación total y por método de pago, pasajes por estado,
 * ingresos mensuales (últimos 12 meses), totales de usuarios y ocupación de viajes.
 * (HU-19, RF-22)
 */
router.get('/estadisticas', asyncHandler(adminController.obtenerEstadisticas));

export { router as adminRoutes };
