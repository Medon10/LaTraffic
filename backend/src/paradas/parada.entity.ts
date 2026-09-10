import { defineEntity, p } from '@mikro-orm/core';

export const ParadaSchema = defineEntity({
  name: 'Parada',
  tableName: 'paradas',
  properties: {
    id: p.integer().primary(),
    nombre: p.string().length(100),
    pueblo: p.string().length(100),
    latitud: p.decimal().precision(9).scale(6).nullable(),
    longitud: p.decimal().precision(9).scale(6).nullable(),
  },
});

export class Parada extends ParadaSchema.class {}
ParadaSchema.setClass(Parada);
