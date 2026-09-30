import { Request, Response } from 'express';
import { HorarioService } from './horario.service.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import {
  crearHorarioSchema,
  editarHorarioSchema,
  type CrearHorarioDto,
  type EditarHorarioDto,
} from './horario.schema.js';

export class HorarioController {
  constructor(private readonly horarioService: HorarioService = new HorarioService()) {}

  /**
   * GET /admin/horarios
   *
   * Lista todos los horarios del sistema (HU-20, RF-23).
   */
  listar = async (_req: Request, res: Response): Promise<void> => {
    const horarios = await this.horarioService.listarHorarios();
    res.status(200).json(horarios);
  };

  /**
   * GET /admin/horarios/:id
   *
   * Devuelve un horario por su ID (HU-20).
   */
  obtener = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'ID de horario inválido');
    }
    const horario = await this.horarioService.obtenerHorario(id);
    res.status(200).json(horario);
  };

  /**
   * POST /admin/horarios
   *
   * Crea un nuevo horario (HU-20, RF-23).
   * No genera viajes — la generación automática es independiente.
   */
  crear = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CrearHorarioDto;
    const horario = await this.horarioService.crearHorario(dto);
    res.status(201).json(horario);
  };

  /**
   * PATCH /admin/horarios/:id
   *
   * Edita un horario existente (HU-20, RF-23).
   * Solo modifica la plantilla — los viajes ya generados conservan su propia hora.
   */
  editar = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'ID de horario inválido');
    }
    const dto = req.body as EditarHorarioDto;
    const horario = await this.horarioService.editarHorario(id, dto);
    res.status(200).json(horario);
  };
}
