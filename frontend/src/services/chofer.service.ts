import { api } from '../shared/api.ts';

// ── Tipos compartidos ─────────────────────────────────────────────────────────

export interface PasajeroChofer {
  pasajeId: number;
  nombre: string;
  apellido: string;
  origen: string;
  destino: string;
  estadoPasaje: string;
}

export interface PasajerosViajeResponse {
  error: boolean;
  data: {
    viajeId: number;
    fecha: string;
    sentido: string;
    totalConfirmados: number;
    pasajeros: PasajeroChofer[];
  };
}

// ── Tipos para ruta óptima (HU-13 / T-08) ────────────────────────────────────

export interface ParadaOrdenada {
  posicion: number;
  label: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface RutaViaje {
  ordenOptimizado: ParadaOrdenada[];
  waypointOrder: number[];
  /** Deeplink para abrir en la app de Google Maps del celular. */
  mapsDeepLink: string;
  /** Encoded polyline para renderizar en mapa. */
  polyline: string;
  distanciaMetros: number;
  duracionSegundos: number;
}

export interface RutaViajeResponse {
  error: boolean;
  data: {
    viajeId: number;
    fecha: string;
    sentido: string;
    pasajesConfirmados: number;
    paradas: ParadaOrdenada[];
    ruta: RutaViaje | null;
    mensaje?: string;
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const choferService = {
  /**
   * HU-12 — Obtiene la lista de pasajeros confirmados de un viaje.
   * Protegido: sólo accesible con rol "chofer".
   */
  async getPasajeros(viajeId: number): Promise<PasajerosViajeResponse['data']> {
    const res = await api.get<PasajerosViajeResponse>(`/chofer/viajes/${viajeId}/pasajeros`);
    return res.data;
  },

  /**
   * HU-13 / T-08 — Obtiene la ruta óptima de un viaje calculada con Google Maps.
   * Incluye el orden optimizado de paradas y un deeplink para abrir en Maps.
   * Protegido: sólo accesible con rol "chofer".
   */
  async getRuta(viajeId: number): Promise<RutaViajeResponse['data']> {
    const res = await api.get<RutaViajeResponse>(`/chofer/viajes/${viajeId}/ruta`);
    return res.data;
  },
};
