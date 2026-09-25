export type EstadoPasaje =
  | 'pendiente_pago'
  | 'confirmada'
  | 'vencida'
  | 'cancelada'
  | 'completada'
  | 'no_show';

export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'vencido';

export type MetodoPago = 'mercadopago' | 'transferencia' | 'efectivo';

export type Sentido = 'colon_rosario' | 'rosario_colon';

export interface Reserva {
  id: number;
  /** Fecha del viaje en formato ISO date (YYYY-MM-DD) */
  fecha_viaje: string | null;
  /** Hora del viaje en formato HH:mm:ss */
  hora_viaje: string | null;
  /** Sentido del viaje */
  sentido: Sentido | null;
  /** Estado del pasaje */
  estado: EstadoPasaje;
  /** Fecha en que se realizó la reserva */
  fecha_reserva: string;
  /** Método de pago elegido */
  metodo_pago: MetodoPago | null;
  /** Monto cobrado (string decimal devuelto por Postgres) */
  monto: string | null;
  /** Estado del pago */
  estado_pago: EstadoPago | null;
  /** ISO date — solo para transferencias con hold activo */
  fecha_expiracion_hold: string | null;
  /** Etiqueta legible del punto de origen */
  origen: string | null;
  /** Etiqueta legible del punto de destino */
  destino: string | null;
  viaje_id: number | null;
}
