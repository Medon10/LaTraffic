import { Router } from 'express';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { Rol } from '../shared/types/index.js';

const router = Router();

// Todas las rutas de administración requieren autenticación y rol de administrador
router.use(verificarToken, autorizar(Rol.ADMINISTRADOR));

// Rutas del administrador — se implementan en HU-15..HU-21
// GET   /admin/usuarios
// PATCH /admin/usuarios/:id/estado
// PATCH /admin/usuarios/:id/reactivar-moroso
// GET   /admin/pagos/pendientes
// PATCH /admin/pagos/:id/validar
// GET   /admin/estadisticas
// GET   /admin/horarios
// POST  /admin/horarios
// PATCH /admin/horarios/:id
// PATCH /admin/config/descuento

router.get('/usuarios', (_req, res) => {
  res.json({ error: false, message: 'Panel de administración de usuarios' });
});

export { router as adminRoutes };
