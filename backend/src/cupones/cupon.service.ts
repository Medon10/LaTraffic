import { EntityManager } from '@mikro-orm/core';
import { TipoCupon } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { CuponRepository, CuponUsoRepository } from './cupon.repository.js';
import { CuponUso } from './cupon-uso.entity.js';
import { Cupon } from './cupon.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';
import { CrearCuponDto, ActualizarCuponDto } from './cupon.schema.js';

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

  // ── HU-23 — Gestión de cupones (admin) ────────────────────────────────────

  /**
   * Lista todos los cupones del sistema (activos e inactivos).
   * GET /admin/cupones
   */
  async listarCupones(): Promise<Cupon[]> {
    return this.cuponRepo.listarTodos();
  }

  /**
   * Crea un nuevo cupón. Lanza 409 si el código ya existe.
   * POST /admin/cupones
   */
  async crearCupon(dto: CrearCuponDto): Promise<Cupon> {
    // Verificar unicidad del código (case-insensitive)
    const existente = await this.cuponRepo.findByCodigo(dto.codigo);
    if (existente) {
      throw new HttpError(409, `Ya existe un cupón con el código "${dto.codigo.toUpperCase()}"`);
    }

    return this.cuponRepo.create({
      codigo: dto.codigo.toUpperCase(),
      tipo: dto.tipo as TipoCupon,
      valor: dto.valor,
      fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
      fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
      usoUnicoPorPersona: dto.usoUnicoPorPersona,
      activo: dto.activo,
    } as any);
  }

  /**
   * Actualiza los campos editables de un cupón (tipo, valor, vigencia, activo, uso único).
   * El código no se puede cambiar para no romper referencias en CuponUso.
   * PATCH /admin/cupones/:id
   */
  async actualizarCupon(id: number, dto: ActualizarCuponDto): Promise<Cupon> {
    const cupon = await this.cuponRepo.findById(id);
    if (!cupon) {
      throw new HttpError(404, 'Cupón no encontrado');
    }

    const cambios: Partial<Cupon> = {};
    if (dto.tipo !== undefined) cambios.tipo = dto.tipo as TipoCupon;
    if (dto.valor !== undefined) cambios.valor = dto.valor as any;
    if (dto.usoUnicoPorPersona !== undefined) cambios.usoUnicoPorPersona = dto.usoUnicoPorPersona;
    if (dto.activo !== undefined) cambios.activo = dto.activo;
    if ('fechaInicio' in dto) cambios.fechaInicio = dto.fechaInicio ? new Date(dto.fechaInicio) : null;
    if ('fechaFin' in dto) cambios.fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : null;

    return this.cuponRepo.update(cupon, cambios as any);
  }
}
