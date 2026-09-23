import { defineEntity, p } from '@mikro-orm/core';
import { Usuario } from '../usuarios/usuario.entity.js';

export const PasswordResetTokenSchema = defineEntity({
  name: 'PasswordResetToken',
  tableName: 'password_reset_tokens',
  properties: {
    id: p.integer().primary(),
    /**
     * Hash SHA-256 del token crudo enviado al usuario por email.
     * El token crudo NUNCA se persiste — solo su hash.
     * Esto protege contra filtración de BD.
     */
    tokenHash: p.string().length(64).unique(),
    usuario: () => p.manyToOne(Usuario).joinColumn('usuario_id'),
    fechaExpiracion: p.datetime(),
    /**
     * true cuando el token ya fue utilizado para resetear la contraseña.
     * Un token usado no puede reutilizarse, aunque no haya expirado.
     */
    usado: p.boolean().default(false),
    fechaCreacion: p.datetime().onCreate(() => new Date()).defaultRaw('now()'),
  },
});

export class PasswordResetToken extends PasswordResetTokenSchema.class {}
PasswordResetTokenSchema.setClass(PasswordResetToken);
