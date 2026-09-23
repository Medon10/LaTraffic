import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { EntityManager } from '@mikro-orm/core';
import { UsuarioRepository } from '../usuarios/usuario.repository.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { PasswordResetToken } from './password-reset-token.entity.js';
import { Rol, UsuarioResponse } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { RegistroDto, LoginDto, RecuperarPasswordDto, ResetPasswordDto } from './auth.schema.js';
import { EmailService } from './email.service.js';

const TOKEN_SECRET = process.env.TOKEN_SECRET!;
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '24h';
const BCRYPT_SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRES_MINUTES = parseInt(
  process.env.PASSWORD_RESET_EXPIRES_MINUTES || '60',
  10
);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export interface AuthResult {
  usuario: UsuarioResponse;
  token: string;
}

export class AuthService {
  constructor(
    private readonly usuarioRepo: UsuarioRepository = new UsuarioRepository(),
    private readonly emailService: EmailService = new EmailService()
  ) {}

  /**
   * Registra un nuevo pasajero en el sistema (HU-01).
   *
   * CRÍTICO: La salvaguarda contra "mass assignment" garantiza que ningún
   * endpoint público pueda asignar roles privilegiados (chofer, administrador).
   * El registro siempre fuerza rol = 'pasajero' en el servidor.
   */
  async registro(datos: RegistroDto): Promise<AuthResult> {
    // 1. Validar que el DNI no esté duplicado (Criterio de aceptación HU-01)
    const usuarioExistenteDni = await this.usuarioRepo.findByDni(datos.dni);
    if (usuarioExistenteDni) {
      throw new HttpError(
        400,
        'El DNI ingresado ya está asociado a una cuenta existente'
      );
    }

    // 2. Validar que el email no esté duplicado
    const usuarioExistenteEmail = await this.usuarioRepo.findByEmail(datos.email);
    if (usuarioExistenteEmail) {
      throw new HttpError(
        400,
        'El email ingresado ya está asociado a una cuenta existente'
      );
    }

    // 3. Hashear la contraseña con bcrypt (Criterio de aceptación HU-01)
    const passwordHash = await bcrypt.hash(datos.password, BCRYPT_SALT_ROUNDS);

    // 4. Crear el usuario forzando SIEMPRE rol = 'pasajero' en el servidor
    const nuevoUsuario = await this.usuarioRepo.create({
      dni: datos.dni,
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      passwordHash,
      rol: Rol.PASAJERO, // Forzado estrictamente en el servidor
      activo: true,
      esMoroso: false,
      inasistenciasEfectivo: 0,
      fechaRegistro: new Date(),
    } as any);

    // 5. Emitir JWT con usuario_id y rol como claims
    const token = this.generarToken(nuevoUsuario);

    return {
      usuario: this.toUsuarioResponse(nuevoUsuario),
      token,
    };
  }

  /**
   * Inicia sesión con DNI (o email) y contraseña (HU-02).
   * Por seguridad, ante credenciales erróneas no se revela cuál falló.
   */
  async login(datos: LoginDto): Promise<AuthResult> {
    // 1. Buscar usuario por DNI o email
    const usuario = await this.usuarioRepo.findByDniOrEmail(datos.dni);

    // Si no existe, error genérico 401
    if (!usuario) {
      throw new HttpError(401, 'Credenciales incorrectas');
    }

    // Si la cuenta está inactiva
    if (!usuario.activo) {
      throw new HttpError(403, 'La cuenta se encuentra inactiva');
    }

    // 2. Verificar contraseña con bcrypt
    const passwordValido = await bcrypt.compare(
      datos.password,
      usuario.passwordHash
    );

    if (!passwordValido) {
      throw new HttpError(401, 'Credenciales incorrectas');
    }

    // 3. Emitir JWT con usuario_id y rol como claims
    const token = this.generarToken(usuario);

    return {
      usuario: this.toUsuarioResponse(usuario),
      token,
    };
  }

  /**
   * Retorna el perfil del usuario autenticado a partir de su ID.
   */
  async obtenerPerfil(usuarioId: number): Promise<UsuarioResponse> {
    const usuario = await this.usuarioRepo.findOne({ id: usuarioId });
    if (!usuario) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    return this.toUsuarioResponse(usuario);
  }

  /**
   * Genera un JWT con usuario_id y rol como claims.
   */
  generarToken(usuario: Usuario): string {
    return jwt.sign(
      {
        usuario_id: usuario.id,
        usuarioId: usuario.id,
        rol: usuario.rol,
      },
      TOKEN_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN as any }
    );
  }

  /**
   * Solicita la recuperación de contraseña (HU-03).
   *
   * Seguridad: siempre responde 200 aunque el email no exista,
   * para no revelar si una cuenta está registrada en el sistema.
   */
  async recuperarPassword(datos: RecuperarPasswordDto, em: EntityManager): Promise<void> {
    const usuario = await this.usuarioRepo.findByEmail(datos.email);

    // Si el usuario no existe, salimos silenciosamente (no revelamos si el email existe)
    if (!usuario) {
      return;
    }

    // 1. Generar token criptográfico aleatorio de 32 bytes (64 caracteres hex)
    const tokenCrudo = crypto.randomBytes(32).toString('hex');

    // 2. Hashear el token con SHA-256 antes de guardarlo en BD
    const tokenHash = crypto.createHash('sha256').update(tokenCrudo).digest('hex');

    // 3. Calcular fecha de expiración
    const fechaExpiracion = new Date(
      Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000
    );

    // 4. Invalida tokens anteriores del mismo usuario (evitar acumulación)
    await em.nativeUpdate(
      PasswordResetToken,
      { usuario: usuario.id, usado: false },
      { usado: true }
    );

    // 5. Persistir el nuevo token hasheado
    const resetToken = em.create(PasswordResetToken, {
      tokenHash,
      usuario,
      fechaExpiracion,
      usado: false,
    });
    em.persist(resetToken);
    await em.flush();

    // 6. Construir el link y enviar email (o imprimirlo en consola en modo dev)
    const resetLink = `${FRONTEND_URL}/reset-password?token=${tokenCrudo}`;
    await this.emailService.enviarRecuperacionPassword(usuario.email, resetLink);
  }

  /**
   * Resetea la contraseña usando el token de un solo uso (HU-03).
   */
  async resetPassword(datos: ResetPasswordDto, em: EntityManager): Promise<void> {
    // 1. Hashear el token recibido para comparar contra lo que hay en BD
    const tokenHash = crypto.createHash('sha256').update(datos.token).digest('hex');

    // 2. Buscar el token: debe existir, no estar usado y no haber expirado
    const ahora = new Date();
    const resetToken = await em.findOne(
      PasswordResetToken,
      { tokenHash, usado: false },
      { populate: ['usuario'] }
    );

    if (!resetToken || resetToken.fechaExpiracion <= ahora) {
      throw new HttpError(400, 'El token de recuperación es inválido o ya expiró');
    }

    // 3. Actualizar la contraseña del usuario
    const nuevoHash = await bcrypt.hash(datos.nuevaPassword, BCRYPT_SALT_ROUNDS);
    resetToken.usuario.passwordHash = nuevoHash;

    // 4. Marcar el token como usado (un solo uso)
    resetToken.usado = true;

    await em.flush();
  }

  /**
   * Sanitiza la entidad de usuario para respuestas HTTP, omitiendo passwordHash.
   */
  private toUsuarioResponse(usuario: Usuario): UsuarioResponse {
    return {
      id: usuario.id,
      dni: usuario.dni ?? null,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      esMoroso: usuario.esMoroso,
      inasistenciasEfectivo: usuario.inasistenciasEfectivo,
      fechaRegistro: usuario.fechaRegistro,
    };
  }
}
