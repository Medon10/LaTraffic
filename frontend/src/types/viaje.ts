export type SentidoViaje = 'colon-rosario' | 'rosario-colon';

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
  butacasLibres: number;
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
