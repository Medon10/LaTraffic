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
    usuario: () => p.manyToOne(Usuario).index('idx_pasajes_usuario'),
    viaje: () => p.manyToOne(Viaje).index('idx_pasajes_viaje'),
    paradaOrigen: () => p.manyToOne(Parada).nullable(),
    domicilioOrigen: p.string().length(255).nullable(),
    paradaDestino: () => p.manyToOne(Parada).nullable(),
    domicilioDestino: p.string().length(255).nullable(),
    estado: p.enum(() => EstadoPasaje).default(EstadoPasaje.PENDIENTE_PAGO),
    documentoVerificado: p.boolean().nullable(),
    fechaReserva: p.datetime().default('now()'),
    pago: () => p.oneToOne(Pago).mappedBy('pasaje').nullable(),
  },
  checks: [
    {
      name: 'chk_pasajes_origen',
      expression: '("parada_origen_id" is not null) != ("domicilio_origen" is not null)',
    },
    {
      name: 'chk_pasajes_destino',
      expression: '("parada_destino_id" is not null) != ("domicilio_destino" is not null)',
    },
  ],
});

export class Pasaje extends PasajeSchema.class {}
PasajeSchema.setClass(Pasaje);
