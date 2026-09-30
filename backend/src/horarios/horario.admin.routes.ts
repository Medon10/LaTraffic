import { Router } from 'express';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';
import { Rol } from '../shared/types/index.js';
import { HorarioController } from './horario.controller.js';
import { crearHorarioSchema, editarHorarioSchema } from './horario.schema.js';

const router = Router();
const horarioController = new HorarioController();

// Todas las rutas de horarios requieren autenticación y rol de administrador
router.use(verificarToken, autorizar(Rol.ADMINISTRADOR));

/**
 * GET /admin/horarios
 *
 * Lista todos los horarios del sistema (HU-20, RF-23).
 */
router.get('/', asyncHandler(horarioController.listar));

/**
 * GET /admin/horarios/:id
 *
 * Devuelve un horario específico por ID (HU-20).
 */
router.get('/:id', asyncHandler(horarioController.obtener));

/**
 * POST /admin/horarios
 *
 * Crea un nuevo horario (HU-20, RF-23).
 * Body: { sentido, diaSemana, hora, activo? }
 */
router.post(
  '/',
  validate(crearHorarioSchema),
  asyncHandler(horarioController.crear)
);

/**
 * PATCH /admin/horarios/:id
 *
 * Edita un horario existente (HU-20, RF-23).
 * Solo actualiza la plantilla — los viajes ya generados no se modifican.
 * Body: { sentido?, diaSemana?, hora?, activo? }
 */
router.patch(
  '/:id',
  validate(editarHorarioSchema),
  asyncHandler(horarioController.editar)
);

export { router as horarioAdminRoutes };
