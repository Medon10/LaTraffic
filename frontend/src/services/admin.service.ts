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

// ── HU-20 — Horarios ──────────────────────────────────────────────────────────

export type SentidoHorario = 'colon_rosario' | 'rosario_colon';
export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface Horario {
  id: number;
  sentido: SentidoHorario;
  diaSemana: DiaSemana;
  hora: string; // HH:MM
  activo: boolean;
}

export interface CrearHorarioDto {
  sentido: SentidoHorario;
  diaSemana: DiaSemana;
  hora: string;
  activo?: boolean;
}

// ── HU-23 — Cupones ───────────────────────────────────────────────────────────

export type TipoCupon = 'monto_fijo' | 'porcentaje';

export interface Cupon {
  id: number;
  codigo: string;
  tipo: TipoCupon;
  valor: string | number;
  fechaInicio: string | null;
  fechaFin: string | null;
  usoUnicoPorPersona: boolean;
  activo: boolean;
}

export interface CrearCuponDto {
  codigo: string;
  tipo: TipoCupon;
  valor: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  usoUnicoPorPersona: boolean;
  activo: boolean;
}

export interface ActualizarCuponDto {
  tipo?: TipoCupon;
  valor?: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  usoUnicoPorPersona?: boolean;
  activo?: boolean;
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

  // ── HU-19 — Estadísticas ──────────────────────────────────────────────────

  /**
   * HU-19 — Retorna métricas de recaudación y uso del sistema.
   */
  async getEstadisticas(): Promise<EstadisticasAdmin> {
    return api.get<EstadisticasAdmin>('/admin/estadisticas');
  },

  // ── HU-20 — Horarios ────────────────────────────────────────────────────────────────

  /**
   * HU-20 — Lista todos los horarios del sistema.
   */
  async getHorarios(): Promise<Horario[]> {
    const res = await api.get<Horario[] | { data: Horario[] }>('/admin/horarios');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as { data: Horario[] }).data)) return (res as { data: Horario[] }).data;
    return [];
  },

  /**
   * HU-20 — Crea un nuevo horario.
   */
  async crearHorario(dto: CrearHorarioDto): Promise<Horario> {
    return api.post<Horario>('/admin/horarios', dto);
  },

  /**
   * HU-20 — Edita un horario existente (no afecta viajes ya generados).
   */
  async editarHorario(id: number, dto: Partial<CrearHorarioDto>): Promise<Horario> {
    return api.patch<Horario>(`/admin/horarios/${id}`, dto);
  },

  // ── HU-23 — Cupones ───────────────────────────────────────────────────────

  /**
   * HU-23 — Lista todos los cupones del sistema (activos e inactivos).
   */
  async getCupones(): Promise<Cupon[]> {
    const res = await api.get<Cupon[] | { data: Cupon[] }>('/admin/cupones');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as { data: Cupon[] }).data)) return (res as { data: Cupon[] }).data;
    return [];
  },

  /**
   * HU-23 — Crea un nuevo cupón.
   */
  async crearCupon(dto: CrearCuponDto): Promise<Cupon> {
    return api.post<Cupon>('/admin/cupones', dto);
  },

  /**
   * HU-23 — Edita un cupón existente (tipo, valor, vigencia, activo, uso único).
   */
  async actualizarCupon(id: number, dto: ActualizarCuponDto): Promise<Cupon> {
    return api.patch<Cupon>(`/admin/cupones/${id}`, dto);
  },
};

// ── HU-19 — Tipos de estadísticas ────────────────────────────────────────────

export interface MetodoStats {
  cantidad: number;
  total: number;
}

export interface EstadisticasAdmin {
  recaudacion: {
    total: number;
    porMetodo: Record<string, MetodoStats>;
    cantidadPagosAprobados: number;
  };
  pasajes: {
    total: number;
    porEstado: Record<string, number>;
  };
  ingresosMensuales: { mes: string; cantidad: number; total: number }[];
  usuarios: {
    totalPasajeros: number;
    totalChoferes: number;
    totalInactivos: number;
    totalMorosos: number;
  };
  ocupacion: {
    totalViajes: number;
    ocupacionPromedioPct: number;
  };
}
