import { defineEntity, p } from '@mikro-orm/core';
import { MetodoPago, EstadoPago } from '../shared/types/index.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';

export const PagoSchema = defineEntity({
  name: 'Pago',
  tableName: 'pagos',
  properties: {
    id: p.integer().primary(),
    pasaje: () => p.oneToOne(Pasaje).owner(),
    metodo: p.enum(() => MetodoPago),
    monto: p.decimal().precision(10).scale(2),
    estado: p.enum(() => EstadoPago).default(EstadoPago.PENDIENTE),
    comprobanteUrl: p.string().length(255).nullable(),
    fechaPago: p.datetime().nullable(),
    fechaExpiracionHold: p.datetime().nullable(),
    /**
     * ID del pago en Mercado Pago (recibido en el webhook).
     * Nulo hasta que MP confirme el pago (aprobado o rechazado).
     */
    mpPaymentId: p.string().length(100).nullable(),
  },
});

export class Pago extends PagoSchema.class {}
PagoSchema.setClass(Pago);
