import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Horario } from './horario.entity.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { Sentido } from '../shared/types/index.js';

// ── DTOs internos ─────────────────────────────────────────────────────────────

export interface CrearHorarioDto {
  sentido: Sentido;
  diaSemana: string;
  hora: string;
  activo?: boolean;
}

export interface EditarHorarioDto {
  sentido?: Sentido;
  diaSemana?: string;
  hora?: string;
  activo?: boolean;
}

export interface HorarioResponse {
  id: number;
  sentido: string;
  diaSemana: string;
  hora: string;
  activo: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class HorarioService {
  private getEm(): EntityManager {
    const em = RequestContext.getEntityManager() as EntityManager;
    if (!em) throw new Error('No se encontró EntityManager en el contexto actual');
    return em;
  }

  /**
   * Lista todos los horarios, ordenados por sentido y día de la semana (HU-20, RF-23).
   */
  async listarHorarios(): Promise<HorarioResponse[]> {
    const em = this.getEm();
    const horarios = await em.find(
      Horario,
      {},
      { orderBy: { sentido: 'ASC', diaSemana: 'ASC', hora: 'ASC' } }
    );
    return horarios.map(toResponse);
  }

  /**
   * Obtiene un horario por ID (HU-20).
   */
  async obtenerHorario(id: number): Promise<HorarioResponse> {
    const em = this.getEm();
    const horario = await em.findOne(Horario, { id });
    if (!horario) throw new HttpError(404, 'Horario no encontrado');
    return toResponse(horario);
  }

  /**
   * Crea un nuevo horario (HU-20, RF-23).
   *
   * No genera viajes — la generación automática de viajes a partir de horarios
   * corresponde a una tarea separada (HU-21 / script de generación).
   */
  async crearHorario(dto: CrearHorarioDto): Promise<HorarioResponse> {
    const em = this.getEm();

    // Evitar duplicados exactos (mismo sentido + día + hora)
    const existente = await em.findOne(Horario, {
      sentido: dto.sentido,
      diaSemana: dto.diaSemana,
      hora: dto.hora,
    });
    if (existente) {
      throw new HttpError(
        409,
        `Ya existe un horario ${dto.sentido} los ${dto.diaSemana} a las ${dto.hora}`
      );
    }

    const horario = em.create(Horario, {
      sentido: dto.sentido,
      diaSemana: dto.diaSemana,
      hora: dto.hora,
      activo: dto.activo ?? true,
    });
    em.persist(horario);
    await em.flush();

    return toResponse(horario);
  }

  /**
   * Edita un horario existente (HU-20, RF-23).
   *
   * Solo modifica la plantilla — los viajes ya generados conservan su propia hora
   * copiada al momento de la creación (ver DER §1.3).
   */
  async editarHorario(id: number, dto: EditarHorarioDto): Promise<HorarioResponse> {
    const em = this.getEm();

    const horario = await em.findOne(Horario, { id });
    if (!horario) throw new HttpError(404, 'Horario no encontrado');

    // Si cambia sentido/día/hora, verificar que no duplique otro horario
    const sentido = dto.sentido ?? horario.sentido;
    const diaSemana = dto.diaSemana ?? horario.diaSemana;
    const hora = dto.hora ?? horario.hora;

    const hayCambioDeIdentidad =
      sentido !== horario.sentido ||
      diaSemana !== horario.diaSemana ||
      hora !== horario.hora;

    if (hayCambioDeIdentidad) {
      const existente = await em.findOne(Horario, { sentido, diaSemana, hora });
      if (existente && existente.id !== id) {
        throw new HttpError(
          409,
          `Ya existe un horario ${sentido} los ${diaSemana} a las ${hora}`
        );
      }
    }

    if (dto.sentido !== undefined) horario.sentido = dto.sentido;
    if (dto.diaSemana !== undefined) horario.diaSemana = dto.diaSemana;
    if (dto.hora !== undefined) horario.hora = dto.hora;
    if (dto.activo !== undefined) horario.activo = dto.activo;

    await em.flush();
    return toResponse(horario);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toResponse(h: Horario): HorarioResponse {
  return {
    id: h.id,
    sentido: h.sentido,
    diaSemana: h.diaSemana,
    hora: h.hora,
    activo: h.activo,
  };
}
