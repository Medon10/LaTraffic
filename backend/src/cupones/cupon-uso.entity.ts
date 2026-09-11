import { defineEntity, p } from '@mikro-orm/core';
import { Cupon } from './cupon.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';

export const CuponUsoSchema = defineEntity({
  name: 'CuponUso',
  tableName: 'cupon_usos',
  properties: {
    id: p.integer().primary(),
    cupon: () => p.manyToOne(Cupon),
    usuario: () => p.manyToOne(Usuario),
    pasaje: () => p.oneToOne(Pasaje).owner(),
    fechaUso: p.datetime().default('now()'),
  },
  indexes: [
    {
      name: 'idx_cupon_usos_cupon_usuario',
      properties: ['cupon', 'usuario'],
    },
  ],
});

export class CuponUso extends CuponUsoSchema.class {}
CuponUsoSchema.setClass(CuponUso);
