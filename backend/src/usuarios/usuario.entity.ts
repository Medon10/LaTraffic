import { defineEntity, p } from '@mikro-orm/core';
import { Rol } from '../shared/types/index.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';

export const UsuarioSchema = defineEntity({
  name: 'Usuario',
  tableName: 'usuarios',
  properties: {
    id: p.integer().primary(),
    dni: p.string().nullable().unique(),
    nombre: p.string(),
    apellido: p.string(),
    email: p.string().unique(),
    passwordHash: p.string().hidden(),
    rol: p.enum(() => Rol).default(Rol.PASAJERO),
    activo: p.boolean().default(true),
    esMoroso: p.boolean().default(false),
    inasistenciasEfectivo: p.integer().default(0),
    promoPrimerViajeUsada: p.boolean().default(false),
    fechaRegistro: p.datetime().default('now()'),
    pasajes: () => p.oneToMany(Pasaje).mappedBy('usuario'),
  },
});

export class Usuario extends UsuarioSchema.class {}
UsuarioSchema.setClass(Usuario);
