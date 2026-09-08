import { defineEntity, p } from '@mikro-orm/core';
import { EstadoPasaje } from '../shared/types/index.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Viaje } from '../viajes/viaje.entity.js';
import { Parada } from '../paradas/parada.entity.js';
import { Pago } from '../pagos/pago.entity.js';

export const PasajeSchema = defineEntity({
  name: 'Pasaje',
  tableName: 'pasajes',
  properties: {
    id: p.integer().primary(),
    usuario: () => p.manyToOne(Usuario),
    viaje: () => p.manyToOne(Viaje),
    paradaOrigen: () => p.manyToOne(Parada).nullable(),
    domicilioOrigen: p.string().nullable(),
    paradaDestino: () => p.manyToOne(Parada).nullable(),
    domicilioDestino: p.string().nullable(),
    estado: p.enum(() => EstadoPasaje).default(EstadoPasaje.PENDIENTE_PAGO),
    documentoVerificado: p.boolean().nullable(),
    fechaReserva: p.datetime().default('now()'),
    pago: () => p.oneToOne(Pago).mappedBy('pasaje').nullable(),
  },
});

export class Pasaje extends PasajeSchema.class {}
PasajeSchema.setClass(Pasaje);
