import { EntityManager } from '@mikro-orm/core';
import { TipoCupon } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { CuponRepository, CuponUsoRepository } from './cupon.repository.js';
import { CuponUso } from './cupon-uso.entity.js';
import { Cupon } from './cupon.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';

export interface CuponValidado {
  cuponId: number;
  codigo: string;
  descuento: number;
  precioFinal: number;
}

/**
 * Servicio de cupones (HU-22).
 *
 * Responsabilidades:
 *  - validarCupon: verifica existencia, estado, vigencia y uso único por persona.
 *  - registrarUso: persiste el CuponUso junto al pasaje recién creado.
 */
export class CuponService {
  constructor(
    private readonly cuponRepo: CuponRepository = new CuponRepository(),
    private readonly cuponUsoRepo: CuponUsoRepository = new CuponUsoRepository()
  ) {}

  /**
   * Valida un código de cupón para un usuario y precio base dados.
   * Lanza HttpError (422) si el cupón es inválido por cualquier motivo.
   * Devuelve el descuento calculado y el precio final si es válido.
   *
   * Criterios de aceptación HU-22:
   *  1. El cupón debe existir.
   *  2. Debe estar activo (activo === true).
   *  3. Debe estar dentro de su vigencia (fechaInicio/fechaFin).
   *  4. Si uso_unico_por_persona, no debe existir un CuponUso para ese usuario.
   */
  async validarCupon(
    codigo: string,
    usuarioId: number,
    precioBase: number
  ): Promise<CuponValidado> {
    // 1. Buscar por código (case-insensitive en el repo)
    const cupon = await this.cuponRepo.findByCodigo(codigo);
    if (!cupon) {
      throw new HttpError(422, 'El código de cupón ingresado no existe');
    }

    // 2. Verificar que esté activo
    if (!cupon.activo) {
      throw new HttpError(422, 'Este cupón ya no está disponible');
    }

    // 3. Verificar vigencia
    const ahora = new Date();
    if (cupon.fechaInicio && ahora < cupon.fechaInicio) {
      throw new HttpError(422, 'Este cupón todavía no está vigente');
    }
    if (cupon.fechaFin && ahora > cupon.fechaFin) {
      throw new HttpError(422, 'Este cupón ya expiró');
    }

    // 4. Verificar uso único por persona (RN-02)
    if (cupon.usoUnicoPorPersona) {
      const usoExistente = await this.cuponUsoRepo.findUso(cupon.id, usuarioId);
      if (usoExistente) {
        throw new HttpError(422, 'Este cupón ya fue utilizado por tu cuenta');
      }
    }

    // 5. Calcular descuento
    const descuento = this.calcularDescuento(cupon.tipo, Number(cupon.valor), precioBase);
    const precioFinal = Math.max(0, precioBase - descuento);

    return {
      cuponId: cupon.id,
      codigo: cupon.codigo,
      descuento,
      precioFinal,
    };
  }

  /**
   * Persiste un CuponUso vinculado a un pasaje recién creado.
   * Se llama dentro de la transacción de creación del pasaje (PasajeService).
   *
   * @param em - EntityManager de la transacción activa.
   */
  async registrarUso(
    cuponId: number,
    usuarioId: number,
    pasajeId: number,
    em: EntityManager
  ): Promise<void> {
    const uso = em.create(CuponUso, {
      cupon: em.getReference(Cupon, cuponId),
      usuario: em.getReference(Usuario, usuarioId),
      pasaje: em.getReference(Pasaje, pasajeId),
      fechaUso: new Date(),
    });
    em.persist(uso);
    // El flush lo maneja la transacción del llamador (PasajeService)
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private calcularDescuento(
    tipo: TipoCupon,
    valor: number,
    precioBase: number
  ): number {
    if (tipo === TipoCupon.PORCENTAJE) {
      return Math.round((precioBase * valor) / 100);
    }
    // MONTO_FIJO: no puede exceder el precio base
    return Math.min(valor, precioBase);
  }
}
