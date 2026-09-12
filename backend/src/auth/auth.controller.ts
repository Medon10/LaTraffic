import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { AuthRequest } from '../shared/types/index.js';
import { RegistroDto, LoginDto } from './auth.schema.js';

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

export class AuthController {
  constructor(
    private readonly authService: AuthService = new AuthService()
  ) {}

  /**
   * Genera las opciones estándar para la cookie segura del JWT.
   * Conforme a los requerimientos: httpOnly, Secure y SameSite=Lax.
   */
  private getCookieOptions() {
    const isSecure = process.env.COOKIE_SECURE === 'false' ? false : true;
    return {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax' as const,
    };
  }

  /**
   * POST /auth/registro
   * Registra un nuevo pasajero, setea la cookie segura y NO devuelve el token en el body.
   */
  registro = async (req: Request, res: Response): Promise<void> => {
    const datos: RegistroDto = req.body;
    const resultado = await this.authService.registro(datos);

    res.cookie(COOKIE_NAME, resultado.token, {
      ...this.getCookieOptions(),
      maxAge: COOKIE_MAX_AGE,
    });

    res.status(201).json({
      error: false,
      message: 'Usuario registrado exitosamente',
      usuario: resultado.usuario,
    });
  };

  /**
   * POST /auth/login
   * Autentica credenciales (DNI + contraseña), setea el JWT en una cookie
   * httpOnly, Secure y SameSite=Lax, y NO devuelve el token en el body de la respuesta.
   */
  login = async (req: Request, res: Response): Promise<void> => {
    const datos: LoginDto = req.body;
    const resultado = await this.authService.login(datos);

    res.cookie(COOKIE_NAME, resultado.token, {
      ...this.getCookieOptions(),
      maxAge: COOKIE_MAX_AGE,
    });

    res.status(200).json({
      error: false,
      message: 'Inicio de sesión exitoso',
      usuario: resultado.usuario,
    });
  };

  /**
   * POST /auth/logout
   * Limpia la cookie segura de sesión.
   */
  logout = async (_req: Request, res: Response): Promise<void> => {
    res.clearCookie(COOKIE_NAME, this.getCookieOptions());

    res.status(200).json({
      error: false,
      message: 'Sesión cerrada exitosamente',
    });
  };

  /**
   * GET /auth/me
   * Retorna el perfil del usuario autenticado vía cookie.
   */
  me = async (req: AuthRequest, res: Response): Promise<void> => {
    const usuarioId = req.usuario!.usuario_id;
    const perfil = await this.authService.obtenerPerfil(usuarioId);

    res.status(200).json({
      error: false,
      usuario: perfil,
    });
  };
}
