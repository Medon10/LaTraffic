import { api } from '../shared/api.ts';
import type { Reserva } from '../types/index.ts';

export const pasajesService = {
  /**
   * GET /pasajes/mis-reservas (HU-11)
   * Devuelve las reservas pasadas y futuras del usuario logueado,
   * ordenadas por fecha de reserva descendente.
   */
  async getMisReservas(): Promise<Reserva[]> {
    return api.get<Reserva[]>('/pasajes/mis-reservas');
  },
};
