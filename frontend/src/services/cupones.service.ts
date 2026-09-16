import { api } from '../shared/api.ts';

export interface CuponValidado {
  cuponId: number;
  codigo: string;
  descuento: number;
  precioFinal: number;
}

/**
 * Llama a POST /cupones/validar para validar un código de cupón
 * y obtener el descuento calculado.
 *
 * Lanza ApiError si el cupón es inválido (status 422).
 * El llamador (useCheckout) captura el error y lo muestra inline
 * sin bloquear el flujo de reserva (HU-22, criterio 3).
 */
export async function validarCupon(
  codigo: string,
  precioBase: number
): Promise<CuponValidado> {
  return api.post<CuponValidado>('/cupones/validar', { codigo, precioBase });
}
