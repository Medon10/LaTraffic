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
};
