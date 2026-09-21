import { api } from '../shared/api.ts';

// ── Tipos de respuesta del backend ────────────────────────────────────────────

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
};
