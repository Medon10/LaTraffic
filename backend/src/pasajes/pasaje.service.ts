import { EntityManager, RequestContext, LockMode } from '@mikro-orm/core';
import { CuponService } from '../cupones/cupon.service.js';
import { MercadoPagoService } from '../pagos/mercadopago.service.js';
import { Viaje } from '../viajes/viaje.entity.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';
import { Pago } from '../pagos/pago.entity.js';
import { MetodoPago, EstadoPago, EstadoPasaje } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';

export interface ReservarPasajeDto {
  viajeId: number;
  metodoPago: 'mercadopago' | 'transferencia' | 'efectivo';
  monto: number;
  paradaOrigenId?: number;
  domicilioOrigen?: string;
  paradaDestinoId?: number;
  domicilioDestino?: string;
  codigoCupon?: string;
}

export interface ReservarPasajeResult {
  pasajeId: number;
  estado: string;
  /** Solo presente cuando metodo_pago = 'mercadopago' */
  initPoint?: string;
  preferenceId?: string;
  /** Descuento aplicado si se usó un cupón */
  descuentoAplicado?: number;
  montoFinal: number;
}

/**
 * Servicio de pasajes — HU-08 (Mercado Pago), HU-09 (transferencia), HU-10 (efectivo).
 *
 * reservarPasaje:
 *   Ejecuta todo en una única transacción de base de datos con bloqueo de fila
 *   sobre viajes (SELECT ... FOR UPDATE) para garantizar integridad de cupos (RF-12,
 *   sección 6 de diseno-arquitectura.md).
 *
 *   Flujo dentro de la transacción:
 *     1. LOCK la fila del viaje (FOR UPDATE).
 *     2. Verificar cupo disponible → si no hay, lanzar 409 y abortar.
 *     3. Validar cupón si viene (fuera del lock — solo lectura).
 *     4. Crear Pasaje en estado 'pendiente_pago'.
 *     5. Crear Pago con el método elegido.
 *     6. Incrementar viaje.cupos_ocupados.
 *     7. Registrar uso del cupón (si aplica).
 *     8. COMMIT (flush + fin de transacción).
 *
 *   Después del COMMIT (para no alargar la transacción con I/O externo):
 *     - Si el método es 'mercadopago': llama a la API de MP y devuelve el init_point.
 */
export class PasajeService {
  constructor(
    private readonly cuponService: CuponService = new CuponService(),
    private readonly mpService: MercadoPagoService = new MercadoPagoService()
  ) {}

  async reservarPasaje(
    dto: ReservarPasajeDto,
    usuarioId: number
  ): Promise<ReservarPasajeResult> {
    const em: EntityManager = RequestContext.getEntityManager() as EntityManager;
    if (!em) {
      throw new Error('No se encontró un EntityManager disponible en el contexto.');
    }

    // ── Validar el cupón ANTES de la transacción (solo lectura, no necesita lock) ──
    let cuponValidado: { cuponId: number; descuento: number; precioFinal: number } | null = null;
    let montoFinal = dto.monto;

    if (dto.codigoCupon) {
      cuponValidado = await this.cuponService.validarCupon(
        dto.codigoCupon,
        usuarioId,
        dto.monto
      );
      montoFinal = cuponValidado.precioFinal;
    }

    // ── Transacción con bloqueo de fila (patrón exacto de diseno-arquitectura.md §6) ──
    let pasajeId: number;

    await em.transactional(async (txEm) => {
      // 1. SELECT ... FOR UPDATE sobre la fila del viaje
      //    LockMode.PESSIMISTIC_WRITE → genera "SELECT ... FOR UPDATE" en PostgreSQL
      const viaje = await txEm.findOne(Viaje, { id: dto.viajeId }, { lockMode: LockMode.PESSIMISTIC_WRITE });

      if (!viaje) {
        throw new HttpError(404, 'El viaje seleccionado no existe');
      }

      // 2. Verificar cupo disponible (RF-12)
      const cuposLibres = viaje.capacidadTotal - viaje.cuposOcupados;
      if (cuposLibres <= 0) {
        throw new HttpError(
          409,
          'Lo sentimos, el viaje ya no tiene lugares disponibles. No se realizó ningún cobro.'
        );
      }

      // 3. Crear el Pasaje en estado pendiente_pago
      const pasaje = txEm.create(Pasaje, {
        usuario: usuarioId as any,
        viaje: viaje,
        paradaOrigen: dto.paradaOrigenId ? (dto.paradaOrigenId as any) : undefined,
        domicilioOrigen: dto.domicilioOrigen ?? null,
        paradaDestino: dto.paradaDestinoId ? (dto.paradaDestinoId as any) : undefined,
        domicilioDestino: dto.domicilioDestino ?? null,
        estado: EstadoPasaje.PENDIENTE_PAGO,
      } as any);
      txEm.persist(pasaje);
      // Flush para obtener el ID del pasaje antes de crear el Pago
      await txEm.flush();
      pasajeId = pasaje.id;

      // 4. Crear el Pago
      const metodoPagoMap: Record<string, MetodoPago> = {
        mercadopago: MetodoPago.MERCADOPAGO,
        transferencia: MetodoPago.TRANSFERENCIA,
        efectivo: MetodoPago.EFECTIVO,
      };

      const pago = txEm.create(Pago, {
        pasaje: pasaje,
        metodo: metodoPagoMap[dto.metodoPago],
        monto: montoFinal,
        estado: EstadoPago.PENDIENTE,
        // La transferencia tiene hold de 4 horas (diseno-arquitectura.md §7)
        fechaExpiracionHold:
          dto.metodoPago === 'transferencia'
            ? new Date(Date.now() + 4 * 60 * 60 * 1000)
            : null,
      } as any);
      txEm.persist(pago);

      // 5. Incrementar cupos_ocupados
      viaje.cuposOcupados += 1;

      // 6. Registrar uso del cupón dentro de la misma transacción (HU-22)
      if (cuponValidado) {
        await this.cuponService.registrarUso(
          cuponValidado.cuponId,
          usuarioId,
          pasaje.id,
          txEm
        );
      }

      // COMMIT
      await txEm.flush();
    });

    // ── Post-transacción: llamar a Mercado Pago (I/O externo fuera del lock) ──
    if (dto.metodoPago === 'mercadopago') {
      try {
        const mpResult = await this.mpService.crearPreferencia(
          pasajeId!,
          montoFinal,
          'Pasaje La Traffic'
        );
        return {
          pasajeId: pasajeId!,
          estado: EstadoPasaje.PENDIENTE_PAGO,
          initPoint: mpResult.initPoint,
          preferenceId: mpResult.preferenceId,
          descuentoAplicado: cuponValidado?.descuento,
          montoFinal,
        };
      } catch (mpError: any) {
        // La transacción ya se confirmó: el pasaje y el cupo están reservados.
        // Si MP falla, el usuario puede reintentar desde "Mis Reservas" con el
        // endpoint POST /pagos/mercadopago/preferencia (idempotente).
        console.error('[PasajeService] Error al crear preferencia MP:', mpError?.message);
        return {
          pasajeId: pasajeId!,
          estado: EstadoPasaje.PENDIENTE_PAGO,
          descuentoAplicado: cuponValidado?.descuento,
          montoFinal,
        };
      }
    }

    return {
      pasajeId: pasajeId!,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      descuentoAplicado: cuponValidado?.descuento,
      montoFinal,
    };
  }
}
