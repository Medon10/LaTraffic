import { Router } from 'express';

const router = Router();

// Rutas del chofer — se implementan en HU-12, HU-13, HU-14
// GET   /chofer/viajes/:id/pasajeros
// GET   /chofer/viajes/:id/ruta
// PATCH /chofer/pasajes/:id/documento

export { router as choferRoutes };
