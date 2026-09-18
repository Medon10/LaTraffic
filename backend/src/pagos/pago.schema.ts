import { z } from 'zod';

/**
 * Body esperado para POST /pagos/mercadopago/preferencia.
 * El frontend envía el pasaje_id y el monto a pagar (en ARS).
 */
export const iniciarPagoMpSchema = z.object({
  pasaje_id: z.number().int().positive(),
  monto: z.number().positive(),
});

export type IniciarPagoMpDto = z.infer<typeof iniciarPagoMpSchema>;
