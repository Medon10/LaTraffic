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
