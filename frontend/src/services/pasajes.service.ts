import { api } from '../shared/api.ts';
import type { Reserva } from '../types/index.ts';

// ── Tipos de solicitud y respuesta para POST /pasajes ─────────────────────────

export interface CrearPasajePayload {
  viaje_id: number;
  metodo_pago: 'mercadopago' | 'transferencia' | 'efectivo';
  monto: number;
  /** Exactamente uno de parada_origen_id | domicilio_origen */
  parada_origen_id?: number;
  domicilio_origen?: string;
  /** Coordenadas del domicilio de origen (T-14). Solo si el usuario usó el mapa. */
  lat_origen?: number;
  lon_origen?: number;
  /** Exactamente uno de parada_destino_id | domicilio_destino */
  parada_destino_id?: number;
  domicilio_destino?: string;
  /** Coordenadas del domicilio de destino (T-14). Solo si el usuario usó el mapa. */
  lat_destino?: number;
  lon_destino?: number;
  codigo_cupon?: string;
}

export interface CrearPasajeResult {
  pasaje_id: number;
  estado: string;
  monto_final: number;
  fecha_expiracion_hold?: string;
  datos_transferencia?: {
    alias: string;
    cbu: string;
    titular: string;
    banco: string;
  };
  whatsapp_url?: string;
  whatsapp_mensaje?: string;
  descuento_aplicado?: number;
  init_point?: string;
  preference_id?: string;
}

export const pasajesService = {
  /**
   * GET /pasajes/mis-reservas (HU-11)
   * Devuelve las reservas pasadas y futuras del usuario logueado,
   * ordenadas por fecha de reserva descendente.
   */
  async getMisReservas(): Promise<Reserva[]> {
    return api.get<Reserva[]>('/pasajes/mis-reservas');
  },

  /**
   * POST /pasajes (HU-08/09/10 + T-14)
   * Crea la reserva. Incluye las coordenadas de domicilio si el usuario
   * usó el MapaPicker; de lo contrario solo el texto libre.
   */
  async crearPasaje(payload: CrearPasajePayload): Promise<CrearPasajeResult> {
    return api.post<CrearPasajeResult>('/pasajes', payload);
  },
};
