import { api } from '../shared/api.ts';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface UsuarioPago {
  id: number;
  nombre: string;
  apellido: string;
  dni: string | null;
  email?: string;
}

export interface ViajePago {
  id: number;
  fecha?: string;
  sentido?: string;
}

export interface PasajePago {
  id: number;
  estado: string;
  viaje: ViajePago;
  usuario: UsuarioPago;
}

export interface PagoPendiente {
  id: number;
  estado: string;
  metodo: string;
  monto: string | number;
  comprobanteUrl: string | null;
  fechaExpiracionHold: string | null;
  fechaPago: string | null;
  pasaje: PasajePago;
}

export interface PagosPendientesResponse {
  error: boolean;
  data: PagoPendiente[];
}

export interface ValidarPagoResponse {
  error: boolean;
  data: {
    pagoId: number;
    estadoPago: string;
    estadoPasaje: string;
    mensaje: string;
  };
}

export interface UsuarioMoroso {
  id: number;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string;
  inasistenciasEfectivo: number;
  esMoroso: boolean;
}

export interface ReactivarMorosoResponse {
  usuarioId: number;
  nombre: string;
  apellido: string;
  mensaje: string;
}

// ── HU-18 — Cuentas de Usuario ────────────────────────────────────────────────

export interface UsuarioCuenta {
  id: number;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string;
  rol: string;
  activo: boolean;
  esMoroso: boolean;
  fechaRegistro: string;
}

export interface CambiarEstadoResponse {
  usuarioId: number;
  nombre: string;
  apellido: string;
  activo: boolean;
  mensaje: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const adminService = {
  /**
   * HU-15 — Lista los pagos por transferencia en estado pendiente.
   * Requiere rol administrador.
   */
  async getPagosPendientes(): Promise<PagoPendiente[]> {
    // El backend devuelve el array directamente (sin wrapper {error, data}).
    const res = await api.get<PagoPendiente[] | PagosPendientesResponse>('/admin/pagos/pendientes');
    // Defensivo: soporta tanto array directo como el formato wrapped {data: []}.
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as PagosPendientesResponse).data)) return (res as PagosPendientesResponse).data;
    return [];
  },

  /**
   * HU-15 — Aprueba o rechaza un pago de transferencia.
   * accion: 'aprobar' | 'rechazar'
   * motivo: string opcional (solo relevante al rechazar)
   */
  async validarPago(
    pagoId: number,
    accion: 'aprobar' | 'rechazar',
    motivo?: string
  ): Promise<ValidarPagoResponse['data']> {
    const res = await api.patch<ValidarPagoResponse>(
      `/admin/pagos/${pagoId}/validar`,
      { accion, ...(motivo ? { motivo } : {}) }
    );
    return res.data;
  },

  /**
   * HU-17 — Lista los pasajeros con es_moroso = true.
   * Backend: GET /admin/usuarios?moroso=true (el backend actual devuelve todos los morosos sin filtro de query)
   */
  async getMorosos(): Promise<UsuarioMoroso[]> {
    const res = await api.get<UsuarioMoroso[] | { data: UsuarioMoroso[] }>('/admin/usuarios', {
      params: { moroso: 'true' },
    });
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as { data: UsuarioMoroso[] }).data)) return (res as { data: UsuarioMoroso[] }).data;
    return [];
  },

  /**
   * HU-17 — Reactiva un pasajero moroso: pone es_moroso = false, inasistencias_efectivo = 0.
   */
  async reactivarMoroso(usuarioId: number): Promise<ReactivarMorosoResponse> {
    return api.patch<ReactivarMorosoResponse>(`/admin/usuarios/${usuarioId}/reactivar-moroso`);
  },

  // ── HU-18 — Cuentas de Usuario ────────────────────────────────────────────

  /**
   * HU-18 — Lista todos los usuarios (pasajeros y choferes) del sistema.
   */
  async getUsuarios(): Promise<UsuarioCuenta[]> {
    const res = await api.get<UsuarioCuenta[] | { data: UsuarioCuenta[] }>('/admin/cuentas/usuarios');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as { data: UsuarioCuenta[] }).data)) return (res as { data: UsuarioCuenta[] }).data;
    return [];
  },

  /**
   * HU-18 — Habilita o deshabilita una cuenta de usuario.
   */
  async cambiarEstadoCuenta(usuarioId: number, activo: boolean): Promise<CambiarEstadoResponse> {
    return api.patch<CambiarEstadoResponse>(`/admin/usuarios/${usuarioId}/estado`, { activo });
  },
};
