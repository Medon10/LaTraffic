import { Response } from 'express';
import { PasajeService } from './pasaje.service.js';
import { AuthRequest } from '../shared/types/index.js';
import type { CrearPasajeDto } from './pasaje.schema.js';

export class PasajeController {
  constructor(private readonly pasajeService: PasajeService = new PasajeService()) {}

  /**
   * POST /pasajes
   *
   * Crea la reserva del pasaje y, según el método de pago elegido:
   *  - mercadopago: devuelve init_point para redirigir al checkout de MP.
   *  - transferencia: devuelve el pasaje con fecha de expiración del hold (4 horas).
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
      ...(resultado.descuentoAplicado !== undefined && {
        descuento_aplicado: resultado.descuentoAplicado,
      }),
      ...(resultado.initPoint && {
        init_point: resultado.initPoint,
        preference_id: resultado.preferenceId,
      }),
    });
  };
}
