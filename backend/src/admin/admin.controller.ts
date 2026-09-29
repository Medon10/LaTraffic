import { Request, Response } from 'express';
import { AdminService } from './admin.service.js';
import { ValidarPagoDto, CambiarEstadoDto } from './admin.schema.js';
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

  // ── HU-18 — Gestión de cuentas ────────────────────────────────────────────

  /**
   * GET /admin/cuentas/usuarios
   *
   * Lista todos los usuarios (pasajeros y choferes) para gestión de cuentas (HU-18).
   */
  listarUsuarios = async (_req: Request, res: Response): Promise<void> => {
    const usuarios = await this.adminService.listarUsuarios();
    res.status(200).json(usuarios);
  };

  /**
   * PATCH /admin/usuarios/:id/estado
   *
   * Habilita o deshabilita una cuenta de usuario (HU-18, RF-21).
   * Body: { activo: boolean }
   */
  cambiarEstadoCuenta = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = Number(req.params.id);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new HttpError(400, 'ID de usuario inválido');
    }

    const { activo } = req.body as CambiarEstadoDto;
    const resultado = await this.adminService.cambiarEstadoCuenta(usuarioId, activo);
    res.status(200).json(resultado);
  };

  // ── HU-19 — Estadísticas ───────────────────────────────────────────────────

  /**
   * GET /admin/estadisticas
   *
   * Retorna métricas de recaudación y uso del sistema (HU-19, RF-22).
   * Incluye: totales por método de pago, pasajes por estado,
   * ingresos mensuales (12 meses), totales de usuarios y ocupación de viajes.
   */
  obtenerEstadisticas = async (_req: Request, res: Response): Promise<void> => {
    const estadisticas = await this.adminService.obtenerEstadisticas();
    res.status(200).json(estadisticas);
  };
}
