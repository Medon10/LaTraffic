import { z } from 'zod';

export const validarPagoSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
  motivo: z.string().max(255).optional(),
});

export type ValidarPagoDto = z.infer<typeof validarPagoSchema>;
