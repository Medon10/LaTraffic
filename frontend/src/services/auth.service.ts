import { api } from '../shared/api.ts';
import { setUser, removeToken, removeUser } from '../shared/auth.ts';
import type { UsuarioSession } from '../shared/auth.ts';

interface AuthResponse {
  error: boolean;
  message: string;
  usuario: UsuarioSession;
}

export interface LoginPayload {
  dni: string;
  password: string;
}

export interface RegistroPayload {
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

export const authService = {
  /**
   * Inicia sesión con DNI y contraseña.
   * El backend setea la cookie httpOnly; aquí sólo guardamos el perfil en localStorage.
   */
  async login(payload: LoginPayload): Promise<UsuarioSession> {
    const res = await api.post<AuthResponse>('/auth/login', payload);
    setUser(res.usuario);
    return res.usuario;
  },

  /**
   * Registra un nuevo pasajero.
   * El backend setea la cookie httpOnly; aquí sólo guardamos el perfil en localStorage.
   */
  async registro(payload: RegistroPayload): Promise<UsuarioSession> {
    const res = await api.post<AuthResponse>('/auth/registro', payload);
    setUser(res.usuario);
    return res.usuario;
  },

  /**
   * Cierra sesión limpiando el estado local y la cookie del backend.
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      removeToken();
      removeUser();
    }
  },
};
