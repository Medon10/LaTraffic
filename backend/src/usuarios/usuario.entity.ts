import { defineEntity, p } from '@mikro-orm/core';
import { Rol } from '../shared/types/index.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';

export const UsuarioSchema = defineEntity({
  name: 'Usuario',
  tableName: 'usuarios',
  properties: {
    id: p.integer().primary(),
    dni: p.string().length(20).nullable(),
    nombre: p.string().length(100),
    apellido: p.string().length(100),
    email: p.string().length(150).unique(),
    passwordHash: p.string().length(255).hidden(),
    rol: p.enum(() => Rol).default(Rol.PASAJERO),
    activo: p.boolean().default(true),
    esMoroso: p.boolean().default(false),
    inasistenciasEfectivo: p.integer().default(0),
    fechaRegistro: p.datetime().default('now()'),
    pasajes: () => p.oneToMany(Pasaje).mappedBy('usuario'),
  },
  indexes: [
    {
      name: 'uq_usuarios_dni_pasajero',
      expression: 'create unique index "uq_usuarios_dni_pasajero" on "usuarios" ("dni") where "rol" = \'pasajero\'',
    },
  ],
});

export class Usuario extends UsuarioSchema.class {}
UsuarioSchema.setClass(Usuario);
