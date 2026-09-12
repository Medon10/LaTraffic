import { Router } from 'express';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { Rol } from '../shared/types/index.js';

const router = Router();

// Todas las rutas del chofer requieren autenticación y rol de chofer
router.use(verificarToken, autorizar(Rol.CHOFER));

// Rutas del chofer — se implementan en HU-12, HU-13, HU-14
// GET   /chofer/viajes/:id/pasajeros
// GET   /chofer/viajes/:id/ruta
// PATCH /chofer/pasajes/:id/documento

router.get('/panel', (_req, res) => {
  res.json({ error: false, message: 'Panel del chofer' });
});

export { router as choferRoutes };
