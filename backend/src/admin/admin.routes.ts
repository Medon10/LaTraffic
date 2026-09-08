import { Router } from 'express';

const router = Router();

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

export { router as adminRoutes };
