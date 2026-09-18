import { Request, Response } from 'express';
import { PagoService } from './pago.service.js';
import { AuthRequest } from '../shared/types/index.js';

export class PagoController {
  constructor(private readonly pagoService: PagoService = new PagoService()) {}

  /**
   * POST /pagos/mercadopago/preferencia
   *
   * Endpoint de **recuperación** idempotente: regenera el init_point de MP para
   * un pasaje que ya existe en BD con estado pendiente_pago + método mercadopago.
   *
   * Casos de uso:
   *  - El usuario cerró la pestaña antes de ser redirigido al checkout de MP.
   *  - MP falló al crear la preferencia durante la reserva original.
   *
   * El monto se lee desde el Pago guardado en BD — no se acepta monto en el body.
   *
   * Body:  { pasaje_id: number }
   * Resp:  { preference_id: string, init_point: string }
   */
  iniciarPagoMp = async (req: AuthRequest, res: Response): Promise<void> => {
    const { pasaje_id } = req.body as { pasaje_id: number };
    const usuarioId = req.usuario!.usuarioId;

    const result = await this.pagoService.iniciarPagoMp(pasaje_id, usuarioId, 0 /* monto ignorado */);

    res.status(200).json({
      preference_id: result.preferenceId,
      init_point: result.initPoint,
    });
  };

  /**
   * POST /pagos/mercadopago/webhook
   *
   * Endpoint público (server-to-server) que recibe las notificaciones de pago de MP.
   * NO lleva JWT — MP no envía cookies ni tokens de usuario.
   * La autenticidad se verifica mediante la firma HMAC-SHA256 (x-signature header).
   *
   * Siempre responde 200 de inmediato para no exceder el timeout de MP (< 5s).
   * El procesamiento real es asíncrono; los errores se loguean sin afectar la respuesta.
   */
  recibirWebhookMp = async (req: Request, res: Response): Promise<void> => {
    const xSignature = req.headers['x-signature'] as string | undefined;
    const xRequestId = req.headers['x-request-id'] as string | undefined;

    // Responder 200 primero (MP espera respuesta < 5s o reintenta)
    res.sendStatus(200);

    this.pagoService
      .procesarWebhookMp(req.body, xSignature, xRequestId)
      .catch((err) => {
        console.error('[Webhook MP] Error al procesar notificación:', err?.message || err);
      });
  };
}
