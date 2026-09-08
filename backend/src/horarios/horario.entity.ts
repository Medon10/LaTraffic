import { defineEntity, p } from '@mikro-orm/core';
import { Sentido } from '../shared/types/index.js';
import { Viaje } from '../viajes/viaje.entity.js';

export const HorarioSchema = defineEntity({
  name: 'Horario',
  tableName: 'horarios',
  properties: {
    id: p.integer().primary(),
    sentido: p.enum(() => Sentido),
    diaSemana: p.string(),
    hora: p.time(),
    activo: p.boolean().default(true),
    viajes: () => p.oneToMany(Viaje).mappedBy('horario'),
  },
});

export class Horario extends HorarioSchema.class {}
HorarioSchema.setClass(Horario);
