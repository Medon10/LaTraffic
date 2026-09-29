import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminService,
  type EstadisticasAdmin,
  type MetodoStats,
} from '../../services/admin.service.ts';
import { ApiError } from '../../shared/api.ts';
import './panelAdmin.css';
import './estadisticas.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const METODO_LABEL: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
};

const METODO_COLOR: Record<string, string> = {
  mercadopago: '#009ee3',
  transferencia: '#4f46e5',
  efectivo: '#16a34a',
};

const METODO_ICON: Record<string, string> = {
  mercadopago: 'credit_card',
  transferencia: 'account_balance',
  efectivo: 'payments',
};

const ESTADO_PASAJE_LABEL: Record<string, string> = {
  confirmada: 'Confirmadas',
  completada: 'Completadas',
  pendiente_pago: 'Pendientes de pago',
  cancelada: 'Canceladas',
  vencida: 'Vencidas',
  no_show: 'No show',
};

const ESTADO_PASAJE_COLOR: Record<string, string> = {
  confirmada: 'var(--success)',
  completada: '#4f46e5',
  pendiente_pago: '#d97706',
  cancelada: 'var(--on-error-container)',
  vencida: 'var(--on-surface-variant)',
  no_show: '#dc2626',
};

function formatPesos(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMes(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

const KpiCard: React.FC<{
  icono: string;
  titulo: string;
  valor: string;
  sub?: string;
  color?: string;
}> = ({ icono, titulo, valor, sub, color }) => (
  <div className="est-kpi">
    <div className="est-kpi__icon" style={color ? { background: `${color}18`, color } : undefined}>
      <span className="material-symbols-outlined">{icono}</span>
    </div>
    <div className="est-kpi__body">
      <span className="est-kpi__titulo">{titulo}</span>
      <span className="est-kpi__valor">{valor}</span>
      {sub && <span className="est-kpi__sub">{sub}</span>}
    </div>
  </div>
);

const MetodoBar: React.FC<{
  metodo: string;
  stats: MetodoStats;
  total: number;
}> = ({ metodo, stats, total }) => {
  const pct = total > 0 ? (stats.total / total) * 100 : 0;
  const color = METODO_COLOR[metodo] ?? 'var(--primary)';
  const label = METODO_LABEL[metodo] ?? metodo;
  const icon = METODO_ICON[metodo] ?? 'payment';

  return (
    <div className="est-metodo">
      <div className="est-metodo__header">
        <div className="est-metodo__label">
          <span
            className="material-symbols-outlined est-metodo__icon"
            style={{ color }}
          >
            {icon}
          </span>
          <span>{label}</span>
        </div>
        <div className="est-metodo__nums">
          <span className="est-metodo__monto">{formatPesos(stats.total)}</span>
          <span className="est-metodo__cantidad">
            {stats.cantidad} pago{stats.cantidad !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="est-metodo__track">
        <div
          className="est-metodo__fill"
          style={{ width: `${pct.toFixed(1)}%`, background: color }}
          title={`${pct.toFixed(1)}% del total`}
        />
      </div>
      <span className="est-metodo__pct">{pct.toFixed(1)}%</span>
    </div>
  );
};

// ── Componente principal ───────────────────────────────────────────────────────

type EstadoCarga = 'idle' | 'loading' | 'success' | 'error';

/**
 * Sección "Estadísticas" del panel de administrador (HU-19, RF-22).
 * Vive dentro de AdminLayout — renderizada bajo /admin/estadisticas.
 */
export const EstadisticasPage: React.FC = () => {
  const [estado, setEstado] = useState<EstadoCarga>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState<EstadisticasAdmin | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const yaFetcheado = useRef(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setEstado('loading');
    else setRefrescando(true);
    setErrorMsg('');

    try {
      const resultado = await adminService.getEstadisticas();
      setData(resultado);
      setEstado('success');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar las estadísticas.';
      setErrorMsg(msg);
      if (!silencioso) setEstado('error');
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    if (!yaFetcheado.current) {
      yaFetcheado.current = true;
      cargar();
    }
  }, [cargar]);

  // ── Computados ──
  const metodos = data ? Object.entries(data.recaudacion.porMetodo) : [];
  const maxMensual =
    data && data.ingresosMensuales.length > 0
      ? Math.max(...data.ingresosMensuales.map((m) => m.total))
      : 1;

  const estadosPasaje = data ? Object.entries(data.pasajes.porEstado) : [];

  return (
    <div className="panel-admin">
      {/* ── Header ── */}
      <div className="admin-header">
        <span className="badge badge--estadisticas">Estadísticas</span>
        <h1>Estadísticas del sistema</h1>
        <p className="subtitle">
          Recaudación total, desglose por método de pago e ingresos de los últimos 12 meses.
        </p>

        {estado === 'success' && (
          <div className="admin-header__actions">
            <span className="admin-header__meta" style={{ opacity: 0.6, fontSize: '0.8rem' }}>
              Datos en tiempo real · Solo pagos aprobados
            </span>
            <button
              id="btn-refrescar-estadisticas"
              className={`btn-refresh ${refrescando ? 'btn-refresh--girando' : ''}`}
              onClick={() => cargar(true)}
              disabled={refrescando}
              title="Refrescar estadísticas"
            >
              <span className="material-symbols-outlined">refresh</span>
              {refrescando ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        )}
      </div>

      {/* ── Estado: cargando ── */}
      {estado === 'loading' && (
        <div className="admin-loading" role="status" aria-live="polite">
          <span className="spinner spinner--dark" aria-hidden="true" />
          Calculando estadísticas…
        </div>
      )}

      {/* ── Estado: error ── */}
      {estado === 'error' && (
        <div className="admin-alert admin-alert--error" role="alert">
          <span className="material-symbols-outlined">error</span>
          {errorMsg}
          <button
            className="btn btn-outline"
            style={{ marginLeft: 'auto', fontSize: '0.85rem' }}
            onClick={() => cargar()}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Contenido ── */}
      {estado === 'success' && data && (
        <>
          {/* ── KPIs principales ── */}
          <section aria-label="Resumen general">
            <h2 className="est-section-title">Resumen</h2>
            <div className="est-kpi-grid">
              <KpiCard
                icono="payments"
                titulo="Recaudación total"
                valor={formatPesos(data.recaudacion.total)}
                sub={`${data.recaudacion.cantidadPagosAprobados} pagos aprobados`}
                color="#16a34a"
              />
              <KpiCard
                icono="confirmation_number"
                titulo="Total pasajes"
                valor={String(data.pasajes.total)}
                sub={`${data.pasajes.porEstado['confirmada'] ?? 0} confirmados`}
                color="#4f46e5"
              />
              <KpiCard
                icono="group"
                titulo="Pasajeros registrados"
                valor={String(data.usuarios.totalPasajeros)}
                sub={`${data.usuarios.totalMorosos} moroso${data.usuarios.totalMorosos !== 1 ? 's' : ''} · ${data.usuarios.totalInactivos} inactivo${data.usuarios.totalInactivos !== 1 ? 's' : ''}`}
                color="#0891b2"
              />
              <KpiCard
                icono="directions_bus"
                titulo="Viajes finalizados"
                valor={String(data.ocupacion.totalViajes)}
                sub={`Ocupación promedio: ${data.ocupacion.ocupacionPromedioPct}%`}
                color="#7c3aed"
              />
            </div>
          </section>

          {/* ── Recaudación por método ── */}
          <section aria-label="Recaudación por método de pago">
            <h2 className="est-section-title">Recaudación por método de pago</h2>
            {metodos.length === 0 ? (
              <div className="admin-empty" role="status">
                <span className="material-symbols-outlined admin-empty__icon">bar_chart</span>
                <p>Aún no hay pagos aprobados registrados.</p>
              </div>
            ) : (
              <div className="est-card">
                <div className="est-metodos-lista">
                  {metodos
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([metodo, stats]) => (
                      <MetodoBar
                        key={metodo}
                        metodo={metodo}
                        stats={stats}
                        total={data.recaudacion.total}
                      />
                    ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Ingresos mensuales ── */}
          <section aria-label="Ingresos mensuales">
            <h2 className="est-section-title">Ingresos mensuales — últimos 12 meses</h2>
            {data.ingresosMensuales.length === 0 ? (
              <div className="admin-empty" role="status">
                <span className="material-symbols-outlined admin-empty__icon">timeline</span>
                <p>No hay ingresos registrados en los últimos 12 meses.</p>
              </div>
            ) : (
              <div className="est-card">
                {/* Gráfico de barras */}
                <div className="est-chart" role="img" aria-label="Gráfico de ingresos mensuales">
                  {data.ingresosMensuales.map((mes) => {
                    const pct = (mes.total / maxMensual) * 100;
                    return (
                      <div key={mes.mes} className="est-chart__col">
                        <span className="est-chart__valor">{formatPesos(mes.total)}</span>
                        <div className="est-chart__bar-wrap">
                          <div
                            className="est-chart__bar"
                            style={{ height: `${Math.max(pct, 2)}%` }}
                            title={`${formatMes(mes.mes)}: ${formatPesos(mes.total)} (${mes.cantidad} pagos)`}
                          />
                        </div>
                        <span className="est-chart__label">{formatMes(mes.mes)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Tabla resumen */}
                <div className="est-tabla-scroll">
                  <table className="est-tabla" aria-label="Tabla de ingresos mensuales">
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th>Pagos</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.ingresosMensuales].reverse().map((mes) => (
                        <tr key={mes.mes}>
                          <td>{formatMes(mes.mes)}</td>
                          <td>{mes.cantidad}</td>
                          <td className="est-tabla__monto">{formatPesos(mes.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ── Pasajes por estado ── */}
          {estadosPasaje.length > 0 && (
            <section aria-label="Pasajes por estado">
              <h2 className="est-section-title">Pasajes por estado</h2>
              <div className="est-card">
                <div className="est-estados-grid">
                  {estadosPasaje
                    .sort(([, a], [, b]) => b - a)
                    .map(([estado, cantidad]) => (
                      <div key={estado} className="est-estado-chip">
                        <span
                          className="est-estado-chip__dot"
                          style={{ background: ESTADO_PASAJE_COLOR[estado] ?? 'var(--on-surface-variant)' }}
                        />
                        <span className="est-estado-chip__label">
                          {ESTADO_PASAJE_LABEL[estado] ?? estado}
                        </span>
                        <span className="est-estado-chip__cantidad">{cantidad}</span>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default EstadisticasPage;
