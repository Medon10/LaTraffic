import { Request, Response } from 'express';
import { CuponService } from './cupon.service.js';
import { CrearCuponDto, ActualizarCuponDto } from './cupon.schema.js';

/**
 * Controlador de administración de cupones (HU-23).
 *
 * Endpoints:
 *  - GET  /admin/cupones        → listar todos los cupones
 *  - POST /admin/cupones        → crear un cupón nuevo
 *  - PATCH /admin/cupones/:id   → editar / activar / desactivar un cupón
 */
export class CuponAdminController {
  constructor(
    private readonly cuponService: CuponService = new CuponService()
  ) {}

  /**
   * GET /admin/cupones
   * Lista todos los cupones del sistema (activos e inactivos).
   */
  listar = async (_req: Request, res: Response): Promise<void> => {
    const cupones = await this.cuponService.listarCupones();
    res.status(200).json(cupones);
  };

  /**
   * POST /admin/cupones
   * Crea un cupón nuevo.
   * Body: { codigo, tipo, valor, fechaInicio?, fechaFin?, usoUnicoPorPersona, activo }
   */
  crear = async (req: Request, res: Response): Promise<void> => {
    const dto: CrearCuponDto = req.body;
    const cupon = await this.cuponService.crearCupon(dto);
    res.status(201).json(cupon);
  };

  /**
   * PATCH /admin/cupones/:id
   * Edita un cupón existente (tipo, valor, vigencia, estado activo/inactivo, uso único).
   * El código no es editable para no romper referencias en CuponUso.
   */
  actualizar = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params['id'] as string, 10);
    const dto: ActualizarCuponDto = req.body;
    const cupon = await this.cuponService.actualizarCupon(id, dto);
    res.status(200).json(cupon);
  };
}
