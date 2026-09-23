import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { registroSchema, loginSchema, recuperarPasswordSchema, resetPasswordSchema } from './auth.schema.js';
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

/**
 * POST /auth/recuperar-password
 * Solicitud de recuperación de contraseña (HU-03).
 * Público. Genera token de un solo uso y lo envía por email.
 * Siempre responde 200 para no revelar si el email existe.
 */
router.post(
  '/recuperar-password',
  validate(recuperarPasswordSchema),
  asyncHandler(authController.recuperarPassword)
);

/**
 * POST /auth/reset-password
 * Resetear la contraseña con el token recibido (HU-03).
 * Público. Valida el token, actualiza el hash y lo invalida.
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

export { router as authRoutes };
