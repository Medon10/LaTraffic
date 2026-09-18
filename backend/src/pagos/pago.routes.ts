import { Router } from 'express';
import { PagoController } from './pago.controller.js';
import { iniciarPagoMpSchema } from './pago.schema.js';
import { validate } from '../shared/middleware/validate.middleware.js';
import { verificarToken, autorizar } from '../shared/middleware/auth.middleware.js';
import { asyncHandler } from '../shared/utils/index.js';
import { Rol } from '../shared/types/index.js';

const router = Router();
const pagoController = new PagoController();

/**
 * POST /pagos/mercadopago/preferencia
 *
 * Crea una preferencia de pago de Mercado Pago para un pasaje en estado pendiente_pago.
 * Protegido: solo el pasajero dueño del pasaje puede solicitar el pago.
 *
 * Body:  { pasaje_id: number, monto: number }
 * Resp:  { preference_id: string, init_point: string }
 */
router.post(
  '/mercadopago/preferencia',
  verificarToken,
  autorizar(Rol.PASAJERO),
  validate(iniciarPagoMpSchema),
  asyncHandler(pagoController.iniciarPagoMp)
);

/**
 * POST /pagos/mercadopago/webhook
 *
 * Endpoint público (server-to-server) que recibe las notificaciones de pago de MP.
 * NO lleva JWT — MP no envía cookies ni tokens de usuario.
 * La autenticidad se verifica mediante la firma HMAC-SHA256 (x-signature header).
 *
 * Responde siempre 200 de inmediato; el procesamiento real es asíncrono.
 */
router.post(
  '/mercadopago/webhook',
  asyncHandler(pagoController.recibirWebhookMp)
);

export { router as pagoRoutes };
