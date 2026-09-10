import { defineEntity, p } from '@mikro-orm/core';
import { EstadoViaje } from '../shared/types/index.js';
import { Horario } from '../horarios/horario.entity.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';

export const ViajeSchema = defineEntity({
  name: 'Viaje',
  tableName: 'viajes',
  properties: {
    id: p.integer().primary(),
    horario: () => p.manyToOne(Horario),
    fecha: p.date().index('idx_viajes_fecha'),
    hora: p.time(),
    capacidadTotal: p.integer().default(14),
    cuposOcupados: p.integer().default(0),
    estado: p.enum(() => EstadoViaje).default(EstadoViaje.PROGRAMADO),
    pasajes: () => p.oneToMany(Pasaje).mappedBy('viaje'),
  },
});

export class Viaje extends ViajeSchema.class {}
ViajeSchema.setClass(Viaje);
