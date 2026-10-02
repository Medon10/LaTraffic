export type SentidoViaje = 'colon-rosario' | 'rosario-colon';

/** Viaje devuelto por GET /viajes (HU-24). */
export interface Viaje {
  id: number;
  fecha: string;       // 'YYYY-MM-DD'
  hora: string;        // 'HH:mm:ss'
  capacidadTotal: number;
  cuposOcupados: number;
  cupos_libres: number;
  /** Sentido del horario asociado al viaje (snake_case como viene del backend). */
  sentido?: string;
}

export interface Parada {
  id: number;
  nombre: string;
  pueblo: string;
}

export interface SalidaSemanal {
  id: string;
  fechaFormato: string;
  fechaISO: string;
  hora: string;
  asientosLibres: number;
  precioBase: number;
}

export interface CheckoutSearchParams {
  sentido: SentidoViaje;
  origen: string;
  destino: string;
  fecha: string;
  precio: number;
  direccionRosario?: string;
}

export interface ReservaPayload {
  sentido: SentidoViaje;
  paradaOrigen?: string;
  paradaDestino?: string;
  direccionRosario: string;
  fecha: string;
  precioTotal: number;
}
