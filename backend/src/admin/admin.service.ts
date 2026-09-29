import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Pago } from '../pagos/pago.entity.js';
import { Viaje } from '../viajes/viaje.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { EstadoPago, EstadoPasaje, MetodoPago, Rol } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import { liberarHoldsVencidos } from '../pasajes/hold.service.js';

export class AdminService {
  private getEm(): EntityManager {
    const em = RequestContext.getEntityManager() as EntityManager;
    if (!em) throw new Error('No se encontró EntityManager en el contexto actual');
    return em;
  }

  /**
   * Lista los pagos por transferencia pendientes de validación (HU-15).
   * Ejecuta primero la limpieza lazy de holds vencidos (§7).
   */
  async listarPagosPendientes(): Promise<Pago[]> {
    const em = this.getEm();

    // 1. Limpiar holds vencidos antes de listar
    await liberarHoldsVencidos(em);

    // 2. Buscar pagos pendientes de transferencia
    return em.find(
      Pago,
      {
        metodo: MetodoPago.TRANSFERENCIA,
        estado: EstadoPago.PENDIENTE,
      },
      {
        populate: ['pasaje', 'pasaje.usuario', 'pasaje.viaje', 'pasaje.paradaOrigen', 'pasaje.paradaDestino'],
        orderBy: { id: 'DESC' },
      }
    );
  }

  /**
   * Valida manualmente un pago de transferencia (HU-15 / Opción 1: Híbrido WhatsApp).
   *
   *  - Si acción = 'aprobar':
   *      pago.estado pasa a 'aprobado', fechaPago = now(), pasaje.estado pasa a 'confirmada'.
   *  - Si acción = 'rechazar':
   *      pago.estado pasa a 'rechazado', pasaje.estado pasa a 'cancelada', viaje.cuposOcupados decrementa.
   */
  async validarPago(
    pagoId: number,
    accion: 'aprobar' | 'rechazar',
    _motivo?: string
  ): Promise<{
    pagoId: number;
    estadoPago: string;
    estadoPasaje: string;
    mensaje: string;
  }> {
    const em = this.getEm();

    const pago = await em.findOne(
      Pago,
      { id: pagoId },
      { populate: ['pasaje', 'pasaje.viaje'] }
    );

    if (!pago) {
      throw new HttpError(404, 'Pago no encontrado');
    }

    if (pago.estado !== EstadoPago.PENDIENTE) {
      throw new HttpError(
        400,
        `El pago ya se encuentra en estado '${pago.estado}' y no puede ser validado nuevamente`
      );
    }

    const ahora = new Date();
    if (
      pago.fechaExpiracionHold &&
      pago.fechaExpiracionHold < ahora
    ) {
      // Hold vencido
      pago.estado = EstadoPago.VENCIDO;
      pago.pasaje.estado = EstadoPasaje.VENCIDA;
      const viaje = pago.pasaje.viaje as Viaje;
      if (viaje && viaje.cuposOcupados > 0) {
        viaje.cuposOcupados -= 1;
      }
      await em.flush();
      throw new HttpError(
        400,
        'El plazo de 4 horas del hold ha expirado. La reserva ya fue dada de baja.'
      );
    }

    if (accion === 'aprobar') {
      pago.estado = EstadoPago.APROBADO;
      pago.fechaPago = new Date();
      pago.pasaje.estado = EstadoPasaje.CONFIRMADA;
      await em.flush();

      return {
        pagoId: pago.id,
        estadoPago: pago.estado,
        estadoPasaje: pago.pasaje.estado,
        mensaje: 'Pago aprobado con éxito. El pasaje ha quedado confirmado.',
      };
    } else {
      pago.estado = EstadoPago.RECHAZADO;
      pago.pasaje.estado = EstadoPasaje.CANCELADA;
      const viaje = pago.pasaje.viaje as Viaje;
      if (viaje && viaje.cuposOcupados > 0) {
        viaje.cuposOcupados -= 1;
      }
      await em.flush();

      return {
        pagoId: pago.id,
        estadoPago: pago.estado,
        estadoPasaje: pago.pasaje.estado,
        mensaje: 'Pago rechazado. El pasaje fue cancelado y el cupo liberado.',
      };
    }
  }

  /**
   * Lista todos los usuarios con es_moroso = true (HU-17, RF-19).
   * Solo pasajeros — los administradores y choferes no pueden ser morosos.
   */
  async listarMorosos(): Promise<Usuario[]> {
    const em = this.getEm();
    return em.find(
      Usuario,
      { esMoroso: true, rol: Rol.PASAJERO },
      { orderBy: { apellido: 'ASC', nombre: 'ASC' } }
    );
  }

  /**
   * Reactiva manualmente a un pasajero moroso (HU-17, RF-20, RN-05).
   * Pone es_moroso = false e inasistencias_efectivo = 0.
   */
  async reactivarMoroso(usuarioId: number): Promise<{
    usuarioId: number;
    nombre: string;
    apellido: string;
    mensaje: string;
  }> {
    const em = this.getEm();

    const usuario = await em.findOne(Usuario, { id: usuarioId });
    if (!usuario) {
      throw new HttpError(404, 'Usuario no encontrado');
    }
    if (usuario.rol !== Rol.PASAJERO) {
      throw new HttpError(400, 'Solo se pueden reactivar cuentas de pasajeros');
    }
    if (!usuario.esMoroso) {
      throw new HttpError(400, 'El usuario no está marcado como moroso');
    }

    usuario.esMoroso = false;
    usuario.inasistenciasEfectivo = 0;
    await em.flush();

    return {
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      mensaje: `${usuario.nombre} ${usuario.apellido} fue reactivado. Ya puede volver a reservar en efectivo.`,
    };
  }

  // ── HU-18 — Gestión de cuentas de usuario ─────────────────────────────────

  /**
   * Lista todos los usuarios del sistema excepto administradores,
   * ordenados por apellido y nombre (HU-18).
   */
  async listarUsuarios(): Promise<Usuario[]> {
    const em = this.getEm();
    return em.find(
      Usuario,
      { rol: { $ne: Rol.ADMINISTRADOR } },
      { orderBy: { apellido: 'ASC', nombre: 'ASC' } }
    );
  }

  /**
   * Habilita o deshabilita una cuenta de usuario (HU-18, RF-21).
   * - No se puede deshabilitar una cuenta de administrador.
   * - Devuelve el estado final del campo `activo`.
   */
  async cambiarEstadoCuenta(
    usuarioId: number,
    activo: boolean
  ): Promise<{
    usuarioId: number;
    nombre: string;
    apellido: string;
    activo: boolean;
    mensaje: string;
  }> {
    const em = this.getEm();

    const usuario = await em.findOne(Usuario, { id: usuarioId });
    if (!usuario) {
      throw new HttpError(404, 'Usuario no encontrado');
    }
    if (usuario.rol === Rol.ADMINISTRADOR) {
      throw new HttpError(403, 'No se puede cambiar el estado de una cuenta de administrador');
    }

    usuario.activo = activo;
    await em.flush();

    const accion = activo ? 'habilitada' : 'deshabilitada';
    return {
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      activo: usuario.activo,
      mensaje: `La cuenta de ${usuario.nombre} ${usuario.apellido} fue ${accion} exitosamente.`,
    };
  }

  // ── HU-19 — Estadísticas de recaudación ───────────────────────────────────

  /**
   * Devuelve estadísticas de recaudación y uso del sistema (HU-19, RF-22).
   *
   * Todas las consultas corren en paralelo para minimizar latencia.
   * Solo se consideran pagos con estado = 'aprobado' para los totales de dinero.
   */
  async obtenerEstadisticas(): Promise<EstadisticasAdmin> {
    const em = this.getEm();
    const conn = em.getConnection();

    const [
      recaudacionPorMetodo,
      pasajesPorEstado,
      ingresosMensuales,
      totalesUsuarios,
      ocupacionViajes,
    ] = await Promise.all([
      // 1. Recaudación total y por método (solo pagos aprobados)
      conn.execute(`
        SELECT
          metodo,
          COUNT(*)::int            AS cantidad,
          COALESCE(SUM(monto), 0)  AS total
        FROM pagos
        WHERE estado = 'aprobado'
        GROUP BY metodo
      `),

      // 2. Pasajes por estado
      conn.execute(`
        SELECT estado, COUNT(*)::int AS cantidad
        FROM pasajes
        GROUP BY estado
      `),

      // 3. Ingresos mensuales — últimos 12 meses (pagos aprobados)
      conn.execute(`
        SELECT
          TO_CHAR(fecha_pago, 'YYYY-MM') AS mes,
          COUNT(*)::int                  AS cantidad,
          COALESCE(SUM(monto), 0)        AS total
        FROM pagos
        WHERE estado = 'aprobado'
          AND fecha_pago >= NOW() - INTERVAL '12 months'
        GROUP BY mes
        ORDER BY mes ASC
      `),

      // 4. Totales de usuarios
      conn.execute(`
        SELECT
          COUNT(*) FILTER (WHERE rol = 'pasajero')::int   AS total_pasajeros,
          COUNT(*) FILTER (WHERE rol = 'chofer')::int     AS total_choferes,
          COUNT(*) FILTER (WHERE activo = false)::int     AS total_inactivos,
          COUNT(*) FILTER (WHERE es_moroso = true)::int   AS total_morosos
        FROM usuarios
        WHERE rol != 'administrador'
      `),

      // 5. Ocupación promedio de los viajes finalizados
      conn.execute(`
        SELECT
          COUNT(*)::int                                         AS total_viajes,
          COALESCE(AVG(cupos_ocupados::float / NULLIF(capacidad_total, 0) * 100), 0) AS ocupacion_promedio_pct
        FROM viajes
        WHERE estado = 'finalizado'
      `),
    ]);

    // ── Procesar recaudación por método ──
    const metodos: Record<string, { cantidad: number; total: number }> = {};
    let recaudacionTotal = 0;
    let cantidadPagosAprobados = 0;

    for (const row of recaudacionPorMetodo) {
      const total = parseFloat(row.total);
      metodos[row.metodo] = { cantidad: row.cantidad, total };
      recaudacionTotal += total;
      cantidadPagosAprobados += row.cantidad;
    }

    // ── Procesar pasajes por estado ──
    const pasajes: Record<string, number> = {};
    let totalPasajes = 0;
    for (const row of pasajesPorEstado) {
      pasajes[row.estado] = row.cantidad;
      totalPasajes += row.cantidad;
    }

    // ── Procesar ingresos mensuales ──
    const mensuales: { mes: string; cantidad: number; total: number }[] =
      ingresosMensuales.map((r: any) => ({
        mes: r.mes,
        cantidad: r.cantidad,
        total: parseFloat(r.total),
      }));

    // ── Totales de usuarios ──
    const u = totalesUsuarios[0] ?? {};
    const usuarios = {
      totalPasajeros: u.total_pasajeros ?? 0,
      totalChoferes: u.total_choferes ?? 0,
      totalInactivos: u.total_inactivos ?? 0,
      totalMorosos: u.total_morosos ?? 0,
    };

    // ── Ocupación ──
    const oc = ocupacionViajes[0] ?? {};
    const ocupacion = {
      totalViajes: oc.total_viajes ?? 0,
      ocupacionPromedioPct: parseFloat(
        (parseFloat(oc.ocupacion_promedio_pct) || 0).toFixed(1)
      ),
    };

    return {
      recaudacion: {
        total: recaudacionTotal,
        porMetodo: metodos,
        cantidadPagosAprobados,
      },
      pasajes: {
        total: totalPasajes,
        porEstado: pasajes,
      },
      ingresosMensuales: mensuales,
      usuarios,
      ocupacion,
    };
  }
}

// ── Tipos de respuesta de estadísticas ────────────────────────────────────────

export interface EstadisticasAdmin {
  recaudacion: {
    total: number;
    porMetodo: Record<string, { cantidad: number; total: number }>;
    cantidadPagosAprobados: number;
  };
  pasajes: {
    total: number;
    porEstado: Record<string, number>;
  };
  ingresosMensuales: { mes: string; cantidad: number; total: number }[];
  usuarios: {
    totalPasajeros: number;
    totalChoferes: number;
    totalInactivos: number;
    totalMorosos: number;
  };
  ocupacion: {
    totalViajes: number;
    ocupacionPromedioPct: number;
  };
}
