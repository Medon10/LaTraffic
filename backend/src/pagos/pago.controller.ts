import { Request, Response } from 'express';
import { PagoService } from './pago.service.js';
import { AuthRequest } from '../shared/types/index.js';

export class PagoController {
  constructor(private readonly pagoService: PagoService = new PagoService()) {}

  /**
   * POST /pagos/mercadopago/preferencia
   * Crea una preferencia de pago de Mercado Pago para el pasaje indicado.
   *
   * Body: { pasaje_id: number, monto: number }
   * Responde: { preference_id, init_point }
   */
  iniciarPagoMp = async (req: AuthRequest, res: Response): Promise<void> => {
    const { pasaje_id, monto } = req.body as { pasaje_id: number; monto: number };
    const usuarioId = req.usuario!.usuarioId;

    const result = await this.pagoService.iniciarPagoMp(pasaje_id, usuarioId, monto);

    res.status(201).json({
      preference_id: result.preferenceId,
      init_point: result.initPoint,
    });
  };

  /**
   * POST /pagos/mercadopago/webhook
   * Recibe notificaciones de pago de Mercado Pago (server-to-server, sin autenticación JWT).
   *
   * MP puede enviar el body en formato IPN legacy o Webhooks v2; el servicio
   * maneja ambos formatos automáticamente.
   *
   * Siempre responde 200 inmediatamente para evitar que MP reintente por timeout.
   */
  recibirWebhookMp = async (req: Request, res: Response): Promise<void> => {
    const xSignature = req.headers['x-signature'] as string | undefined;
    const xRequestId = req.headers['x-request-id'] as string | undefined;

    // Responder 200 primero (MP espera respuesta < 5s o reintenta)
    res.sendStatus(200);

    // Procesar de forma asíncrona — los errores se loguean pero no afectan la respuesta
    this.pagoService
      .procesarWebhookMp(req.body, xSignature, xRequestId)
      .catch((err) => {
        console.error('[Webhook MP] Error al procesar notificación:', err?.message || err);
      });
  };
}
