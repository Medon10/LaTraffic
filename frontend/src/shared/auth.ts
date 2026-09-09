export interface UsuarioSession {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'pasajero' | 'chofer' | 'administrador';
  dni?: string;
}

const TOKEN_KEY = 'latraffic_token';
const USER_KEY = 'latraffic_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): UsuarioSession | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UsuarioSession;
  } catch {
    return null;
  }
}

export function setUser(user: UsuarioSession): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function logout(): void {
  removeToken();
  removeUser();
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function hasRole(role: 'pasajero' | 'chofer' | 'administrador'): boolean {
  const user = getUser();
  return user?.rol === role;
}
