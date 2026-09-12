import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { RequestContext } from '@mikro-orm/core';
import { MikroORM } from '@mikro-orm/postgresql';

import config from './mikro-orm.config.js';
import { errorHandler } from './shared/middleware/error-handler.middleware.js';

// Rutas
import { authRoutes } from './auth/auth.routes.js';
import { usuarioRoutes } from './usuarios/usuario.routes.js';
import { horarioRoutes } from './horarios/horario.routes.js';
import { viajeRoutes } from './viajes/viaje.routes.js';
import { paradaRoutes } from './paradas/parada.routes.js';
import { pasajeRoutes } from './pasajes/pasaje.routes.js';
import { pagoRoutes } from './pagos/pago.routes.js';
import { choferRoutes } from './chofer/chofer.routes.js';
import { adminRoutes } from './admin/admin.routes.js';

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function bootstrap() {
  let orm: MikroORM | null = null;
  try {
    const ormInstance = await MikroORM.init(config);
    orm = ormInstance;
    console.log('✓ Conectado a la base de datos');
  } catch (err: any) {
    console.warn('⚠ No se pudo conectar a PostgreSQL:', err?.message || err);
    console.warn('⚠ El servidor continuará corriendo en modo desarrollo sin conexión a BD activa.');
  }

  // ── Crear app Express ──
  const app = express();

  // ── Middlewares globales ──
  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Rate limiting para endpoints de auth (protección contra fuerza bruta)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // máximo 20 intentos por ventana
    message: { error: true, message: 'Demasiados intentos, probá de nuevo en unos minutos' },
  });
  app.use('/auth', authLimiter);

  // MikroORM: crear un contexto de request aislado por cada request HTTP si la BD está conectada
  if (orm) {
    const em = orm.em;
    app.use((_req, _res, next) => {
      RequestContext.create(em, next);
    });
  }

  // ── Montar rutas ──
  app.use('/auth', authRoutes);
  app.use('/usuarios', usuarioRoutes);
  app.use('/horarios', horarioRoutes);
  app.use('/viajes', viajeRoutes);
  app.use('/paradas', paradaRoutes);
  app.use('/pasajes', pasajeRoutes);
  app.use('/pagos', pagoRoutes);
  app.use('/chofer', choferRoutes);
  app.use('/admin', adminRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Error handler global (debe ir al final) ──
  app.use(errorHandler);

  // ── Iniciar servidor ──
  app.listen(PORT, () => {
    console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('✗ Error al iniciar el servidor:', err);
  process.exit(1);
});
