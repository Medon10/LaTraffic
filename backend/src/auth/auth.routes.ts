import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { registroSchema, loginSchema } from './auth.schema.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { verificarToken } from '../shared/middleware/auth.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';

const router = Router();
const authController = new AuthController();

/**
 * POST /auth/registro
 * Registro de pasajeros (HU-01).
 * Público. Valida los campos y descarta `rol`, forzando siempre 'pasajero'.
 * Emite cookie httpOnly, Secure y SameSite=Lax sin token en el body.
 */
router.post(
  '/registro',
  validate(registroSchema),
  asyncHandler(authController.registro)
);

/**
 * POST /auth/login
 * Inicio de sesión con DNI y contraseña (HU-02).
 * Emite cookie httpOnly, Secure y SameSite=Lax sin token en el body.
 */
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(authController.login)
);

/**
 * POST /auth/logout
 * Cierre de sesión: limpia la cookie httpOnly del token.
 */
router.post(
  '/logout',
  asyncHandler(authController.logout)
);

/**
 * GET /auth/me
 * Obtener perfil del usuario autenticado a través de la cookie.
 * Protegido: requiere cookie con JWT válido.
 */
router.get(
  '/me',
  verificarToken,
  asyncHandler(authController.me)
);

export { router as authRoutes };
