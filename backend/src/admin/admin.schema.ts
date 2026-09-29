import { z } from 'zod';

export const validarPagoSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
  motivo: z.string().max(255).optional(),
});

export type ValidarPagoDto = z.infer<typeof validarPagoSchema>;

/**
 * HU-18 — Body de PATCH /admin/usuarios/:id/estado
 * { activo: true | false }
 */
export const cambiarEstadoSchema = z.object({
  activo: z.boolean(),
});

export type CambiarEstadoDto = z.infer<typeof cambiarEstadoSchema>;
