import { Request, Response } from 'express';
import { AdminService } from './admin.service.js';
import { ValidarPagoDto } from './admin.schema.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';

export class AdminController {
  constructor(private readonly adminService: AdminService = new AdminService()) {}

  /**
   * GET /admin/pagos/pendientes
   *
   * Lista los pagos por transferencia que esperan validación del administrador.
   */
  listarPagosPendientes = async (_req: Request, res: Response): Promise<void> => {
    const pagos = await this.adminService.listarPagosPendientes();
    res.status(200).json(pagos);
  };

  /**
   * PATCH /admin/pagos/:id/validar
   *
   * Aprueba o rechaza el pago por transferencia bancaria (HU-15 / Opción 1: Híbrido WhatsApp).
   */
  validarPago = async (req: Request, res: Response): Promise<void> => {
    const pagoId = Number(req.params.id);
    if (!Number.isInteger(pagoId) || pagoId <= 0) {
      throw new HttpError(400, 'ID de pago inválido');
    }

    const { accion, motivo } = req.body as ValidarPagoDto;
    const resultado = await this.adminService.validarPago(pagoId, accion, motivo);
    res.status(200).json(resultado);
  };

  /**
   * GET /admin/usuarios?moroso=true
   *
   * Lista los pasajeros marcados como morosos (HU-17, RF-19).
   * El filtro ?moroso=true es el único soportado actualmente.
   */
  listarMorosos = async (_req: Request, res: Response): Promise<void> => {
    const morosos = await this.adminService.listarMorosos();
    res.status(200).json(morosos);
  };

  /**
   * PATCH /admin/usuarios/:id/reactivar-moroso
   *
   * Reactiva manualmente a un pasajero moroso: pone es_moroso = false
   * e inasistencias_efectivo = 0 (HU-17, RF-20).
   */
  reactivarMoroso = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = Number(req.params.id);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new HttpError(400, 'ID de usuario inválido');
    }

    const resultado = await this.adminService.reactivarMoroso(usuarioId);
    res.status(200).json(resultado);
  };
}
