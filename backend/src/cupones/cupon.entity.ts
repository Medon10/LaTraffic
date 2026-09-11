import { defineEntity, p } from '@mikro-orm/core';
import { TipoCupon } from '../shared/types/index.js';
import { CuponUso } from './cupon-uso.entity.js';

export const CuponSchema = defineEntity({
  name: 'Cupon',
  tableName: 'cupones',
  properties: {
    id: p.integer().primary(),
    codigo: p.string().length(50).unique(),
    tipo: p.enum(() => TipoCupon),
    valor: p.decimal().precision(10).scale(2),
    fechaInicio: p.datetime().nullable(),
    fechaFin: p.datetime().nullable(),
    usoUnicoPorPersona: p.boolean().default(true),
    activo: p.boolean().default(true),
    usos: () => p.oneToMany(CuponUso).mappedBy('cupon'),
  },
});

export class Cupon extends CuponSchema.class {}
CuponSchema.setClass(Cupon);
