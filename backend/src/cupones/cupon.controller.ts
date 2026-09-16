import { Response } from 'express';
import { CuponService } from './cupon.service.js';
import { AuthRequest } from '../shared/types/index.js';
import { ValidarCuponDto } from './cupon.schema.js';

/**
 * Controlador del módulo de cupones (HU-22).
 */
export class CuponController {
  constructor(
    private readonly cuponService: CuponService = new CuponService()
  ) {}

  /**
   * POST /cupones/validar
   * Valida un código de cupón para el usuario autenticado y devuelve el descuento calculado.
   *
   * Respuestas:
   *  - 200: cupón válido → { cuponId, codigo, descuento, precioFinal }
   *  - 422: cupón inválido → { error: true, message: <motivo descriptivo> }
   *
   * El frontend muestra el error inline sin bloquear el flujo de reserva (HU-22, criterio 3).
   */
  validar = async (req: AuthRequest, res: Response): Promise<void> => {
    const { codigo, precioBase }: ValidarCuponDto = req.body;
    const usuarioId = req.usuario!.usuarioId;

    const resultado = await this.cuponService.validarCupon(codigo, usuarioId, precioBase);

    res.status(200).json({
      error: false,
      ...resultado,
    });
  };
}
