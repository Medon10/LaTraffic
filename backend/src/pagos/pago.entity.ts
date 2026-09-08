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
    monto: p.double(),
    estado: p.enum(() => EstadoPago).default(EstadoPago.PENDIENTE),
    comprobanteUrl: p.string().nullable(),
    fechaPago: p.datetime().nullable(),
    fechaExpiracionHold: p.datetime().nullable(),
  },
});

export class Pago extends PagoSchema.class {}
PagoSchema.setClass(Pago);
