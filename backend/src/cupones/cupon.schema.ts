import { z } from 'zod';

/**
 * Schema de validación para el endpoint POST /cupones/validar (HU-22).
 * El `precioBase` se incluye para que el servicio pueda calcular el precio final
 * sin que el cliente tenga que hacer dos llamadas.
 */
export const validarCuponSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, 'El código de cupón no puede estar vacío')
    .max(50, 'El código de cupón no puede exceder los 50 caracteres'),

  precioBase: z
    .number({ error: 'El precio base debe ser un número' })
    .positive('El precio base debe ser mayor a cero'),
});

export type ValidarCuponDto = z.infer<typeof validarCuponSchema>;

// ── HU-23 — Gestión de cupones (admin) ───────────────────────────────────────

/**
 * Schema para POST /admin/cupones — crear un cupón nuevo.
 * Código obligatorio, tipo, valor y opciones de vigencia y uso único.
 */
export const crearCuponSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, 'El código no puede estar vacío')
    .max(50, 'El código no puede exceder los 50 caracteres')
    .regex(/^[A-Z0-9_-]+$/i, 'El código solo puede contener letras, números, guiones y guiones bajos'),

  tipo: z.enum(['monto_fijo', 'porcentaje'], {
    error: 'El tipo debe ser "monto_fijo" o "porcentaje"',
  }),

  valor: z
    .number({ error: 'El valor debe ser un número' })
    .positive('El valor debe ser mayor a cero'),

  fechaInicio: z.string().datetime({ offset: true }).nullable().optional(),

  fechaFin: z.string().datetime({ offset: true }).nullable().optional(),

  usoUnicoPorPersona: z.boolean().default(true),

  activo: z.boolean().default(true),
});

export type CrearCuponDto = z.infer<typeof crearCuponSchema>;

/**
 * Schema para PATCH /admin/cupones/:id — actualizar un cupón existente.
 * Todos los campos son opcionales; el código no se puede modificar para no
 * romper referencias existentes en CuponUso.
 */
export const actualizarCuponSchema = z.object({
  tipo: z.enum(['monto_fijo', 'porcentaje']).optional(),

  valor: z
    .number({ error: 'El valor debe ser un número' })
    .positive('El valor debe ser mayor a cero')
    .optional(),

  fechaInicio: z.string().datetime({ offset: true }).nullable().optional(),

  fechaFin: z.string().datetime({ offset: true }).nullable().optional(),

  usoUnicoPorPersona: z.boolean().optional(),

  activo: z.boolean().optional(),
});

export type ActualizarCuponDto = z.infer<typeof actualizarCuponSchema>;
