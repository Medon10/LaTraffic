import { z } from 'zod';

/**
 * Body para POST /pagos/mercadopago/preferencia — endpoint de recuperación.
 *
 * Solo recibe pasaje_id. El monto se obtiene del Pago ya guardado en BD
 * (no se acepta monto desde el cliente para evitar manipulación).
 */
export const iniciarPagoMpSchema = z.object({
  pasaje_id: z.number().int().positive(),
});

export type IniciarPagoMpDto = z.infer<typeof iniciarPagoMpSchema>;
