import { api } from '../shared/api.ts';
import type { Parada } from '../types/index.ts';

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
};
