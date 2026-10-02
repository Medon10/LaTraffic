import { api } from '../shared/api.ts';
import type { Parada, Viaje } from '../types/index.ts';

export const PARADAS_FALLBACK: Parada[] = [
  { id: 1, nombre: 'Terminal / Base', pueblo: 'Colón' },
  { id: 2, nombre: 'Parada sobre Ruta 8', pueblo: 'Hughes' },
  { id: 3, nombre: 'Parada sobre Ruta 8', pueblo: 'Wheelwright' },
];

export const viajesService = {
  async getParadas(): Promise<Parada[]> {
    try {
      const response = await api.get<{ error?: boolean; paradas?: Parada[] } | Parada[]>('/paradas');
      if (Array.isArray(response)) {
        return response;
      }
      if (response && Array.isArray(response.paradas)) {
        return response.paradas;
      }
      return PARADAS_FALLBACK;
    } catch {
      return PARADAS_FALLBACK;
    }
  },

  /**
   * GET /viajes?sentido=&fecha= (HU-24)
   *
   * Resuelve el viaje_id real del backend para una fecha y sentido dados.
   * Los sentidos del frontend usan guión (colon-rosario); el backend usa guión bajo
   * (colon_rosario). Esta función hace la conversión internamente.
   *
   * Devuelve el array de viajes disponibles, o [] si falla la red.
   */
  async getViajes(sentido: 'colon-rosario' | 'rosario-colon', fecha: string): Promise<Viaje[]> {
    try {
      // Normalizar sentido: 'colon-rosario' -> 'colon_rosario'
      const sentidoBackend = sentido.replace('-', '_');
      const viajes = await api.get<Viaje[]>('/viajes', {
        params: { sentido: sentidoBackend, fecha },
      });
      return Array.isArray(viajes) ? viajes : [];
    } catch {
      return [];
    }
  },
};