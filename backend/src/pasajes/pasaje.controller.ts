import { Response } from 'express';
import { PasajeService } from './pasaje.service.js';
import { AuthRequest } from '../shared/types/index.js';
import type { CrearPasajeDto, SubirComprobanteDto } from './pasaje.schema.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';

export class PasajeController {
  constructor(private readonly pasajeService: PasajeService = new PasajeService()) {}

  /**
   * POST /pasajes
   *
   * Crea la reserva del pasaje y, según el método de pago elegido:
   *  - mercadopago: devuelve init_point para redirigir al checkout de MP.
   *  - transferencia: devuelve hold de 4 horas, datos bancarios y link directo a WhatsApp (Opción 1).
   *  - efectivo: devuelve el pasaje en estado pendiente_pago.
   *
   * Todo ocurre en una única transacción con bloqueo de fila sobre viajes
   * para garantizar integridad de cupos (RF-12, §6 diseno-arquitectura.md).
   *
   * Responde 409 si el viaje ya no tiene cupo al momento de ejecutarse.
   */
  crear = async (req: AuthRequest, res: Response): Promise<void> => {
    const body = req.body as CrearPasajeDto;
    const usuarioId = req.usuario!.usuarioId;

    const resultado = await this.pasajeService.reservarPasaje(
      {
        viajeId: body.viaje_id,
        metodoPago: body.metodo_pago,
        monto: body.monto,
        paradaOrigenId: body.parada_origen_id,
        domicilioOrigen: body.domicilio_origen,
        paradaDestinoId: body.parada_destino_id,
        domicilioDestino: body.domicilio_destino,
        codigoCupon: body.codigo_cupon,
      },
      usuarioId
    );

    res.status(201).json({
      pasaje_id: resultado.pasajeId,
      estado: resultado.estado,
      monto_final: resultado.montoFinal,
      ...(resultado.fechaExpiracionHold && {
        fecha_expiracion_hold: resultado.fechaExpiracionHold.toISOString(),
      }),
      ...(resultado.datosTransferencia && {
        datos_transferencia: resultado.datosTransferencia,
      }),
      ...(resultado.whatsappUrl && {
        whatsapp_url: resultado.whatsappUrl,
        whatsapp_mensaje: resultado.whatsappMensaje,
      }),
      ...(resultado.descuentoAplicado !== undefined && {
        descuento_aplicado: resultado.descuentoAplicado,
      }),
      ...(resultado.initPoint && {
        init_point: resultado.initPoint,
        preference_id: resultado.preferenceId,
      }),
    });
  };

  /**
   * POST /pasajes/:id/comprobante (HU-09)
   *
   * Sube la URL del comprobante de transferencia para un pasaje en estado pendiente_pago.
   */
  subirComprobante = async (req: AuthRequest, res: Response): Promise<void> => {
    const pasajeId = Number(req.params.id);
    if (!Number.isInteger(pasajeId) || pasajeId <= 0) {
      throw new HttpError(400, 'ID de pasaje inválido');
    }

    const { comprobante_url } = req.body as SubirComprobanteDto;
    const usuarioId = req.usuario!.usuarioId;

    const resultado = await this.pasajeService.subirComprobante(
      pasajeId,
      usuarioId,
      comprobante_url
    );

    res.status(200).json({
      message: resultado.mensaje,
      pasaje_id: resultado.pasajeId,
      comprobante_url: resultado.comprobanteUrl,
      estado: resultado.estado,
    });
  };

  /**
   * GET /pasajes/mis-reservas
   *
   * Lista todas las reservas del pasajero autenticado, reflejando holds vencidos.
   */
  misReservas = async (req: AuthRequest, res: Response): Promise<void> => {
    const usuarioId = req.usuario!.usuarioId;
    const reservas = await this.pasajeService.misReservas(usuarioId);
    res.status(200).json(reservas);
  };
}

