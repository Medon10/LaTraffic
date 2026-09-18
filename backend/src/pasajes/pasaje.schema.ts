import { z } from 'zod';

/**
 * Body esperado para POST /pasajes (HU-08).
 *
 * El frontend envía todos los datos de la reserva más la elección de método de pago.
 * Si el método es 'mercadopago', la respuesta incluirá init_point para redirigir.
 *
 * Reglas de negocio sobre origen/destino (ver diseno-arquitectura.md §4):
 *   - Exactamente uno de parada_origen_id | domicilio_origen debe estar presente.
 *   - Exactamente uno de parada_destino_id | domicilio_destino debe estar presente.
 */
export const crearPasajeSchema = z
  .object({
    viaje_id: z.number().int().positive(),
    metodo_pago: z.enum(['mercadopago', 'transferencia', 'efectivo']),
    monto: z.number().positive({ message: 'El monto debe ser mayor a 0' }),
    // Origen: exactamente uno de los dos
    parada_origen_id: z.number().int().positive().optional(),
    domicilio_origen: z.string().min(5).max(255).optional(),
    // Destino: exactamente uno de los dos
    parada_destino_id: z.number().int().positive().optional(),
    domicilio_destino: z.string().min(5).max(255).optional(),
    // Cupón opcional
    codigo_cupon: z.string().max(50).optional(),
  })
  .superRefine((data, ctx) => {
    // Validar origen
    const tieneParadaOrigen = data.parada_origen_id !== undefined;
    const tieneDomicilioOrigen = data.domicilio_origen !== undefined && data.domicilio_origen !== '';
    if (tieneParadaOrigen === tieneDomicilioOrigen) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debés especificar exactamente uno: parada_origen_id o domicilio_origen',
        path: ['parada_origen_id'],
      });
    }
    // Validar destino
    const tieneParadaDestino = data.parada_destino_id !== undefined;
    const tieneDomicilioDestino = data.domicilio_destino !== undefined && data.domicilio_destino !== '';
    if (tieneParadaDestino === tieneDomicilioDestino) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debés especificar exactamente uno: parada_destino_id o domicilio_destino',
        path: ['parada_destino_id'],
      });
    }
  });

export type CrearPasajeDto = z.infer<typeof crearPasajeSchema>;
