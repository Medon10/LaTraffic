import { defineEntity, p } from '@mikro-orm/core';

export const ParadaSchema = defineEntity({
  name: 'Parada',
  tableName: 'paradas',
  properties: {
    id: p.integer().primary(),
    nombre: p.string(),
    pueblo: p.string(),
    latitud: p.double().nullable(),
    longitud: p.double().nullable(),
  },
});

export class Parada extends ParadaSchema.class {}
ParadaSchema.setClass(Parada);
