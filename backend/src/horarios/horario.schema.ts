import { z } from 'zod';
import { Sentido } from '../shared/types/index.js';

// Valores válidos de diaSemana
const DIAS_VALIDOS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;

// Regex de hora HH:MM (24hs)
const HORA_REGEX = /^\d{2}:\d{2}$/;

// ── Schemas ───────────────────────────────────────────────────────────────────

/**
 * HU-20 — Body de POST /admin/horarios
 */
export const crearHorarioSchema = z.object({
  sentido: z.nativeEnum(Sentido),
  diaSemana: z.enum(DIAS_VALIDOS),
  hora: z
    .string()
    .regex(HORA_REGEX, 'La hora debe tener el formato HH:MM (ej. 08:30)'),
  activo: z.boolean().optional().default(true),
});

/**
 * HU-20 — Body de PATCH /admin/horarios/:id
 * Todos los campos son opcionales (PATCH semántico).
 */
export const editarHorarioSchema = z.object({
  sentido: z.nativeEnum(Sentido).optional(),
  diaSemana: z.enum(DIAS_VALIDOS).optional(),
  hora: z
    .string()
    .regex(HORA_REGEX, 'La hora debe tener el formato HH:MM (ej. 08:30)')
    .optional(),
  activo: z.boolean().optional(),
});

export type CrearHorarioDto = z.infer<typeof crearHorarioSchema>;
export type EditarHorarioDto = z.infer<typeof editarHorarioSchema>;
