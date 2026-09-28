import { Router } from 'express';
import { ViajeController } from './viaje.controller.js';
import { asyncHandler } from '../shared/utils/index.js';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { Rol } from '../shared/types/index.js';

const router = Router();
const viajeController = new ViajeController();

/**
 * GET /viajes?sentido=&fecha=
 *
 * Consulta pública de viajes disponibles (HU-04, HU-05).
 * Ejecuta previamente la limpieza lazy de holds vencidos (§7).
 */
router.get('/', asyncHandler(viajeController.listar));

/**
 * GET /viajes/:id/cupo
 *
 * Consulta directa de cupo disponible para un viaje en tiempo real (RF-12, §7).
 */
router.get('/:id/cupo', asyncHandler(viajeController.consultarCupo));

/**
 * GET /viajes/:id
 *
 * Consulta de viaje por ID con cupos actualizados tras limpieza lazy (§7).
 */
router.get('/:id', asyncHandler(viajeController.obtenerPorId));

/**
 * PATCH /viajes/:id/finalizar
 *
 * Cierra el viaje (estado → FINALIZADO) y dispara el marcado automático de
 * morosos sobre los pasajes no_show en efectivo del viaje (HU-16, RN-05).
 * Solo accesible por el administrador.
 */
router.patch(
  '/:id/finalizar',
  verificarToken,
  autorizar(Rol.ADMINISTRADOR),
  asyncHandler(viajeController.finalizar)
);

export { router as viajeRoutes };
