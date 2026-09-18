import { EntityManager, RequestContext, LockMode } from '@mikro-orm/core';
import { CuponService } from '../cupones/cupon.service.js';
import { MercadoPagoService } from '../pagos/mercadopago.service.js';
import { Viaje } from '../viajes/viaje.entity.js';
import { Pasaje } from '../pasajes/pasaje.entity.js';
import { Pago } from '../pagos/pago.entity.js';
import { MetodoPago, EstadoPago, EstadoPasaje } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { liberarHoldsVencidos } from './hold.service.js';

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

export interface DatosTransferencia {
  alias: string;
  cbu: string;
  titular: string;
  banco: string;
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
  /** Hold de 4 horas para transferencias (HU-09) */
  fechaExpiracionHold?: Date;
  /** Datos bancarios para transferir (Opción 1: Híbrido) */
  datosTransferencia?: DatosTransferencia;
  /** Link directo para abrir WhatsApp con el mensaje prearmado */
  whatsappUrl?: string;
  /** Mensaje prearmado para enviar por WhatsApp */
  whatsappMensaje?: string;
}

/**
 * Servicio de pasajes — HU-08 (Mercado Pago), HU-09 (transferencia híbrido WhatsApp), HU-10 (efectivo).
 *
 * reservarPasaje:
 *   Ejecuta todo en una única transacción de base de datos con bloqueo de fila
 *   sobre viajes (SELECT ... FOR UPDATE) para garantizar integridad de cupos (RF-12,
 *   sección 6 de diseno-arquitectura.md).
 *
 *   Flujo dentro de la transacción:
 *     1. LOCK la fila del viaje (FOR UPDATE).
 *     2. Limpieza lazy de holds vencidos de este viaje (§7).
 *     3. Verificar cupo disponible → si no hay, lanzar 409 y abortar.
 *     4. Validar cupón si viene (fuera del lock — solo lectura).
 *     5. Crear Pasaje en estado 'pendiente_pago'.
 *     6. Crear Pago con el método elegido (fijando 4h de hold si es transferencia).
 *     7. Incrementar viaje.cupos_ocupados.
 *     8. Registrar uso del cupón (si aplica).
 *     9. COMMIT (flush + fin de transacción).
 *
 *   Después del COMMIT:
 *     - Si es 'mercadopago': crea preferencia MP y devuelve init_point.
 *     - Si es 'transferencia' (Opción 1: Híbrido): arma datos bancarios y enlace a WhatsApp.
 */
export class PasajeService {
  constructor(
    private readonly cuponService: CuponService = new CuponService(),
    private readonly mpService: MercadoPagoService = new MercadoPagoService()
  ) {}

  private getEm(): EntityManager {
    const em = RequestContext.getEntityManager() as EntityManager;
    if (!em) {
      throw new Error('No se encontró un EntityManager disponible en el contexto.');
    }
    return em;
  }

  async reservarPasaje(
    dto: ReservarPasajeDto,
    usuarioId: number
  ): Promise<ReservarPasajeResult> {
    const em = this.getEm();

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

    // ── Transacción con bloqueo de fila (patrón exacto de diseno-arquitectura.md §6 y §7) ──
    let pasajeId: number;
    const fechaExpiracionHold =
      dto.metodoPago === 'transferencia'
        ? new Date(Date.now() + 4 * 60 * 60 * 1000)
        : null;

    await em.transactional(async (txEm) => {
      // 1. SELECT ... FOR UPDATE sobre la fila del viaje
      const viaje = await txEm.findOne(Viaje, { id: dto.viajeId }, { lockMode: LockMode.PESSIMISTIC_WRITE });

      if (!viaje) {
        throw new HttpError(404, 'El viaje seleccionado no existe');
      }

      // 2. Limpieza lazy de holds vencidos de este viaje antes de verificar cupo (§7)
      await liberarHoldsVencidos(txEm, dto.viajeId, viaje);

      // 3. Verificar cupo disponible (RF-12)
      const cuposLibres = viaje.capacidadTotal - viaje.cuposOcupados;
      if (cuposLibres <= 0) {
        throw new HttpError(
          409,
          'Lo sentimos, el viaje ya no tiene lugares disponibles. No se realizó ningún cobro.'
        );
      }

      // 4. Crear el Pasaje en estado pendiente_pago
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
      await txEm.flush();
      pasajeId = pasaje.id;

      // 5. Crear el Pago
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
        fechaExpiracionHold,
      } as any);
      txEm.persist(pago);

      // 6. Incrementar cupos_ocupados
      viaje.cuposOcupados += 1;

      // 7. Registrar uso del cupón dentro de la misma transacción (HU-22)
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

    // ── Post-transacción: manejar según método ──
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
          fechaExpiracionHold: fechaExpiracionHold ?? undefined,
        };
      } catch (mpError: any) {
        console.error('[PasajeService] Error al crear preferencia MP:', mpError?.message);
        return {
          pasajeId: pasajeId!,
          estado: EstadoPasaje.PENDIENTE_PAGO,
          descuentoAplicado: cuponValidado?.descuento,
          montoFinal,
          fechaExpiracionHold: fechaExpiracionHold ?? undefined,
        };
      }
    }

    if (dto.metodoPago === 'transferencia') {
      const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || '5493482000000';
      const datosTransferencia: DatosTransferencia = {
        alias: process.env.TRANSFERENCIA_ALIAS || 'LATRAFFIC.COLON',
        cbu: process.env.TRANSFERENCIA_CBU || '0000003100010000000001',
        titular: process.env.TRANSFERENCIA_TITULAR || 'LaTraffic',
        banco: process.env.TRANSFERENCIA_BANCO || 'Banco de la Nación Argentina',
      };
      const whatsappMensaje = `Hola! Acabo de reservar el pasaje #${pasajeId!} para el viaje #${dto.viajeId} por un monto de $${montoFinal}. Adjunto el comprobante de la transferencia para que puedas confirmar mi reserva. Muchas gracias!`;
      const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(whatsappMensaje)}`;

      return {
        pasajeId: pasajeId!,
        estado: EstadoPasaje.PENDIENTE_PAGO,
        descuentoAplicado: cuponValidado?.descuento,
        montoFinal,
        fechaExpiracionHold: fechaExpiracionHold!,
        datosTransferencia,
        whatsappUrl,
        whatsappMensaje,
      };
    }

    return {
      pasajeId: pasajeId!,
      estado: EstadoPasaje.PENDIENTE_PAGO,
      descuentoAplicado: cuponValidado?.descuento,
      montoFinal,
    };
  }

  /**
   * Sube la URL del comprobante de transferencia bancaria (HU-09).
   */
  async subirComprobante(
    pasajeId: number,
    usuarioId: number,
    comprobanteUrl: string
  ): Promise<{
    pasajeId: number;
    estado: string;
    comprobanteUrl: string;
    mensaje: string;
  }> {
    const em = this.getEm();

    const pasaje = await em.findOne(
      Pasaje,
      { id: pasajeId },
      { populate: ['pago', 'viaje', 'usuario'] }
    );

    if (!pasaje) {
      throw new HttpError(404, 'El pasaje no existe');
    }

    if (pasaje.usuario.id !== usuarioId) {
      throw new HttpError(403, 'No tenés permiso para subir comprobantes de este pasaje');
    }

    if (!pasaje.pago || pasaje.pago.metodo !== MetodoPago.TRANSFERENCIA) {
      throw new HttpError(
        400,
        'Este pasaje no tiene transferencia bancaria como método de pago'
      );
    }

    if (pasaje.estado !== EstadoPasaje.PENDIENTE_PAGO) {
      if (pasaje.estado === EstadoPasaje.VENCIDA) {
        throw new HttpError(
          400,
          'La reserva se encuentra vencida porque expiró el plazo de 4 horas'
        );
      }
      if (pasaje.estado === EstadoPasaje.CONFIRMADA) {
        throw new HttpError(400, 'El pasaje ya se encuentra confirmado');
      }
      if (pasaje.estado === EstadoPasaje.CANCELADA) {
        throw new HttpError(400, 'El pasaje fue cancelado');
      }
      throw new HttpError(
        400,
        `No se puede subir comprobante a un pasaje en estado ${pasaje.estado}`
      );
    }

    const ahora = new Date();
    if (
      pasaje.pago.fechaExpiracionHold &&
      pasaje.pago.fechaExpiracionHold < ahora
    ) {
      pasaje.estado = EstadoPasaje.VENCIDA;
      pasaje.pago.estado = EstadoPago.VENCIDO;
      const viaje = pasaje.viaje as Viaje;
      if (viaje && viaje.cuposOcupados > 0) {
        viaje.cuposOcupados -= 1;
      }
      await em.flush();

      throw new HttpError(
        400,
        'El plazo de 4 horas para presentar el comprobante ha expirado. La reserva fue dada de baja por vencimiento.'
      );
    }

    pasaje.pago.comprobanteUrl = comprobanteUrl;
    await em.flush();

    return {
      pasajeId: pasaje.id,
      estado: pasaje.estado,
      comprobanteUrl: pasaje.pago.comprobanteUrl,
      mensaje: 'Comprobante recibido con éxito. El administrador revisará el pago.',
    };
  }

  /**
   * Obtiene todas las reservas del usuario autenticado, ejecutando primero la limpieza lazy.
   */
  async misReservas(usuarioId: number): Promise<Pasaje[]> {
    const em = this.getEm();
    await liberarHoldsVencidos(em);

    return em.find(
      Pasaje,
      { usuario: usuarioId },
      {
        populate: ['pago', 'viaje', 'paradaOrigen', 'paradaDestino'],
        orderBy: { fechaReserva: 'DESC' },
      }
    );
  }
}

