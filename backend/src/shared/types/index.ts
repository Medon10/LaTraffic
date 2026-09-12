import { Request } from 'express';

// ────────────────────────────────────────────
// Enums de dominio
// ────────────────────────────────────────────

export enum Rol {
  PASAJERO = 'pasajero',
  CHOFER = 'chofer',
  ADMINISTRADOR = 'administrador',
}

export enum Sentido {
  COLON_ROSARIO = 'colon_rosario',
  ROSARIO_COLON = 'rosario_colon',
}

export enum EstadoViaje {
  PROGRAMADO = 'programado',
  EN_CURSO = 'en_curso',
  FINALIZADO = 'finalizado',
  CANCELADO = 'cancelado',
}

export enum EstadoPasaje {
  PENDIENTE_PAGO = 'pendiente_pago',
  CONFIRMADA = 'confirmada',
  VENCIDA = 'vencida',
  CANCELADA = 'cancelada',
  COMPLETADA = 'completada',
  NO_SHOW = 'no_show',
}

export enum MetodoPago {
  MERCADOPAGO = 'mercadopago',
  TRANSFERENCIA = 'transferencia',
  EFECTIVO = 'efectivo',
}

export enum EstadoPago {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  VENCIDO = 'vencido',
}

export enum TipoCupon {
  MONTO_FIJO = 'monto_fijo',
  PORCENTAJE = 'porcentaje',
}

// ────────────────────────────────────────────
// Extensión de Request con datos de usuario autenticado
// ────────────────────────────────────────────

export interface AuthPayload {
  usuario_id: number;
  usuarioId: number;
  rol: Rol;
}

export interface AuthRequest extends Request {
  usuario?: AuthPayload;
}

export interface UsuarioResponse {
  id: number;
  dni: string | null;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  activo: boolean;
  esMoroso: boolean;
  inasistenciasEfectivo: number;
  fechaRegistro: Date;
}

