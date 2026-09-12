import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UsuarioRepository } from '../usuarios/usuario.repository.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Rol, UsuarioResponse } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { RegistroDto, LoginDto } from './auth.schema.js';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dev_secret';
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '24h';
const BCRYPT_SALT_ROUNDS = 10;

export interface AuthResult {
  usuario: UsuarioResponse;
  token: string;
}

export class AuthService {
  constructor(
    private readonly usuarioRepo: UsuarioRepository = new UsuarioRepository()
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
