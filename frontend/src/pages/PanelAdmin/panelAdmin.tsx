import React, { useCallback, useEffect, useRef, useState } from 'react';
import './panelAdmin.css';
import {
  adminService,
  type PagoPendiente,
} from '../../services/admin.service.ts';
import { ApiError } from '../../shared/api.ts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMonto(monto: string | number): string {
  const n = Number(monto);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(n);
}

function formatSentido(sentido?: string): string {
  if (sentido === 'colon_rosario') return 'Colón → Rosario';
  if (sentido === 'rosario_colon') return 'Rosario → Colón';
  return sentido ?? '—';
}

/**
 * Devuelve el tiempo restante formateado "Hh MMm" o null si ya venció.
 */
function tiempoRestante(fechaExpiracionIso: string | null): string | null {
  if (!fechaExpiracionIso) return null;
  const diff = new Date(fechaExpiracionIso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

function esCritico(fechaExpiracionIso: string | null): boolean {
  if (!fechaExpiracionIso) return false;
  const diff = new Date(fechaExpiracionIso).getTime() - Date.now();
  return diff > 0 && diff < 30 * 60_000; // menos de 30 minutos
}

function esImagenUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
}

// ── Countdown ticker ──────────────────────────────────────────────────────────

/**
 * Ticker de cuenta regresiva que re-renderiza cada segundo.
 */
const Countdown: React.FC<{ fechaExpiracion: string | null }> = ({
  fechaExpiracion,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const tiempo = tiempoRestante(fechaExpiracion);
  const critico = esCritico(fechaExpiracion);

  if (!tiempo) {
    return (
      <span className="admin-pago__hold admin-pago__hold--critico">
        <span className="material-symbols-outlined">timer_off</span>
        Vencido
      </span>
    );
  }

  return (
    <span
      className={`admin-pago__hold ${critico ? 'admin-pago__hold--critico' : ''}`}
    >
      <span className="material-symbols-outlined">timer</span>
      {tiempo}
    </span>
  );
};

// ── Tipos locales ─────────────────────────────────────────────────────────────

type AccionPago = 'aprobar' | 'rechazar';

interface EstadoAccion {
  loading: boolean;
  resultado: 'aprobado' | 'rechazado' | null;
  error: string;
}

// ── Tarjeta de pago individual ────────────────────────────────────────────────

const TarjetaPago: React.FC<{
  pago: PagoPendiente;
  onValidado: (pagoId: number, resultado: 'aprobado' | 'rechazado') => void;
}> = ({ pago, onValidado }) => {
  const [estado, setEstado] = useState<EstadoAccion>({
    loading: false,
    resultado: null,
    error: '',
  });
  const [motivo, setMotivo] = useState('');
  const [mostrarMotivo, setMostrarMotivo] = useState(false);

  const procesado = estado.resultado !== null;

  const ejecutar = useCallback(
    async (accion: AccionPago) => {
      setEstado({ loading: true, resultado: null, error: '' });
      try {
        await adminService.validarPago(pago.id, accion, motivo || undefined);
        const resultado = accion === 'aprobar' ? 'aprobado' : 'rechazado';
        setEstado({ loading: false, resultado, error: '' });
        onValidado(pago.id, resultado);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Error al procesar. Intentá de nuevo.';
        setEstado({ loading: false, resultado: null, error: msg });
      }
    },
    [pago.id, motivo, onValidado]
  );

  const handleAprobar = () => ejecutar('aprobar');
  const handleRechazar = () => {
    if (!mostrarMotivo) {
      setMostrarMotivo(true);
      return;
    }
    ejecutar('rechazar');
  };

  const { usuario, viaje } = pago.pasaje;
  const esImagen = pago.comprobanteUrl ? esImagenUrl(pago.comprobanteUrl) : false;

  return (
    <li className="admin-pago" aria-label={`Pago #${pago.id}`}>
      {/* ── Encabezado ── */}
      <div className="admin-pago__header">
        <span className="admin-pago__id">Pago #{pago.id} · Pasaje #{pago.pasaje.id}</span>
        <div className="admin-pago__badges">
          <Countdown fechaExpiracion={pago.fechaExpiracionHold} />
        </div>
      </div>

      <div className="admin-pago__divider" />

      {/* ── Cuerpo ── */}
      <div className="admin-pago__body">
        {/* Pasajero */}
        <div className="admin-pago__seccion">
          <span className="admin-pago__seccion-label">Pasajero</span>
          <span className="admin-pago__pasajero">
            {usuario.nombre} {usuario.apellido}
          </span>
          <span className="admin-pago__dni">DNI {usuario.dni ?? '—'}</span>
        </div>

        {/* Monto y viaje */}
        <div className="admin-pago__seccion">
          <span className="admin-pago__seccion-label">Monto</span>
          <span className="admin-pago__monto">{formatMonto(pago.monto)}</span>
          <span className="admin-pago__viaje">
            Viaje #{viaje.id}
            {viaje.sentido ? ` · ${formatSentido(viaje.sentido)}` : ''}
          </span>
        </div>
      </div>

      {/* ── Comprobante ── */}
      <div className="admin-pago__comprobante-area">
        {pago.comprobanteUrl ? (
          <>
            <a
              id={`btn-comprobante-${pago.id}`}
              className="admin-pago__comprobante-link"
              href={pago.comprobanteUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir comprobante en nueva pestaña"
            >
              <span className="material-symbols-outlined">receipt_long</span>
              Ver comprobante
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                open_in_new
              </span>
            </a>
            {/* Preview inline si es imagen */}
            {esImagen && (
              <a href={pago.comprobanteUrl} target="_blank" rel="noopener noreferrer">
                <img
                  className="admin-pago__preview-img"
                  src={pago.comprobanteUrl}
                  alt={`Comprobante del pago #${pago.id}`}
                  loading="lazy"
                />
              </a>
            )}
          </>
        ) : (
          <span className="admin-pago__sin-comprobante">
            <span className="material-symbols-outlined">attachment_off</span>
            Sin comprobante adjunto
          </span>
        )}
      </div>

      {/* ── Motivo de rechazo (expandible) ── */}
      {mostrarMotivo && !procesado && (
        <div className="admin-pago__motivo-area">
          <textarea
            id={`motivo-${pago.id}`}
            className="admin-pago__motivo-textarea"
            placeholder="Motivo del rechazo (opcional)…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={estado.loading}
            rows={2}
          />
        </div>
      )}

      {/* ── Error inline ── */}
      {estado.error && (
        <div
          className="admin-alert admin-alert--error"
          role="alert"
          style={{ margin: '0 1.25rem 0.5rem' }}
        >
          <span className="material-symbols-outlined">error</span>
          {estado.error}
        </div>
      )}

      {/* ── Footer de acciones ── */}
      <div className="admin-pago__footer">
        {procesado ? (
          <span
            className={`admin-pago__resultado admin-pago__resultado--${estado.resultado}`}
          >
            <span className="material-symbols-outlined">
              {estado.resultado === 'aprobado' ? 'check_circle' : 'cancel'}
            </span>
            {estado.resultado === 'aprobado'
              ? 'Aprobado — Pasaje confirmado'
              : 'Rechazado — Cupo liberado'}
          </span>
        ) : (
          <>
            {/* Botón rechazar */}
            <button
              id={`btn-rechazar-${pago.id}`}
              className="btn btn-rechazar"
              onClick={handleRechazar}
              disabled={estado.loading}
              title={mostrarMotivo ? 'Confirmar rechazo' : 'Rechazar pago'}
            >
              {estado.loading ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <span className="material-symbols-outlined">cancel</span>
              )}
              {mostrarMotivo ? 'Confirmar rechazo' : 'Rechazar'}
            </button>

            {/* Botón cancelar motivo */}
            {mostrarMotivo && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                onClick={() => {
                  setMostrarMotivo(false);
                  setMotivo('');
                }}
                disabled={estado.loading}
              >
                Cancelar
              </button>
            )}

            {/* Botón aprobar */}
            <button
              id={`btn-aprobar-${pago.id}`}
              className="btn btn-aprobar"
              onClick={handleAprobar}
              disabled={estado.loading}
            >
              {estado.loading ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <span className="material-symbols-outlined">check_circle</span>
              )}
              Aprobar
            </button>
          </>
        )}
      </div>
    </li>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

type EstadoCarga = 'idle' | 'loading' | 'success' | 'error';

/**
 * Sección "Transferencias pendientes" del panel de administrador (HU-15).
 * Vive dentro de AdminLayout — renderizada bajo /admin/transferencias.
 *
 * Nota: este componente se llamaba PanelAdminPage antes del shell (commit de
 * septiembre 2026). Se renombró a TransferenciasPage al migrar a AdminLayout
 * para mantener la convención de nombres de secciones.
 */
export const TransferenciasPage: React.FC = () => {
  const [estado, setEstado] = useState<EstadoCarga>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [pagos, setPagos] = useState<PagoPendiente[]>([]);
  const [procesados, setProcesados] = useState<
    Record<number, 'aprobado' | 'rechazado'>
  >({});
  const [refrescando, setRefrescando] = useState(false);
  const yaFetcheado = useRef(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setEstado('loading');
    else setRefrescando(true);
    setErrorMsg('');

    try {
      const data = await adminService.getPagosPendientes();
      setPagos(data);
      setEstado('success');
      // Limpiar procesados que ya no estén en la lista
      setProcesados((prev) => {
        const idsActuales = new Set(data.map((p) => p.id));
        const siguiente: Record<number, 'aprobado' | 'rechazado'> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (idsActuales.has(Number(k))) siguiente[Number(k)] = v;
        }
        return siguiente;
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar los pagos pendientes.';
      setErrorMsg(msg);
      if (!silencioso) setEstado('error');
    } finally {
      setRefrescando(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    if (!yaFetcheado.current) {
      yaFetcheado.current = true;
      cargar();
    }
  }, [cargar]);

  const handleValidado = useCallback(
    (pagoId: number, resultado: 'aprobado' | 'rechazado') => {
      setProcesados((prev) => ({ ...prev, [pagoId]: resultado }));
    },
    []
  );

  const pendientes = pagos.filter((p) => !procesados[p.id]);
  const cantTotal = pagos.length;
  const cantProcesados = Object.keys(procesados).length;

  return (
    <div className="panel-admin">
      {/* ── Header ── */}
      <div className="admin-header">
        <span className="badge">Panel Admin</span>
        <h1>Validar comprobantes</h1>
        <p className="subtitle">
          Revisá los comprobantes de transferencia y aprobá o rechazá cada
          pago. Al rechazar, el cupo se libera automáticamente.
        </p>

        {estado === 'success' && (
          <div className="admin-header__actions">
            <span className="admin-header__meta">
              {cantTotal === 0 ? (
                'Sin pagos pendientes'
              ) : (
                <>
                  <strong>{pendientes.length}</strong> pendiente
                  {pendientes.length !== 1 ? 's' : ''}
                  {cantProcesados > 0 && (
                    <> · <strong>{cantProcesados}</strong> procesado{cantProcesados !== 1 ? 's' : ''}</>
                  )}
                </>
              )}
            </span>
            <button
              id="btn-refrescar"
              className={`btn-refresh ${refrescando ? 'btn-refresh--girando' : ''}`}
              onClick={() => cargar(true)}
              disabled={refrescando}
              title="Refrescar lista"
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
          Cargando pagos pendientes…
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

      {/* ── Estado: sin pagos ── */}
      {estado === 'success' && cantTotal === 0 && (
        <div className="admin-empty" role="status">
          <span className="material-symbols-outlined admin-empty__icon">
            task_alt
          </span>
          <p>¡No hay comprobantes pendientes de validación!</p>
          <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            Todos los pagos por transferencia están al día.
          </p>
        </div>
      )}

      {/* ── Lista de pagos ── */}
      {estado === 'success' && cantTotal > 0 && (
        <>
          {/* Pagos pendientes */}
          {pendientes.length > 0 && (
            <ul className="admin-lista" aria-label="Pagos pendientes">
              {pendientes.map((pago) => (
                <TarjetaPago
                  key={pago.id}
                  pago={pago}
                  onValidado={handleValidado}
                />
              ))}
            </ul>
          )}

          {/* Separador si hay ambos */}
          {pendientes.length > 0 && cantProcesados > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--on-surface-variant)',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'var(--outline-variant)' }} />
              Procesados en esta sesión
              <div style={{ flex: 1, height: 1, background: 'var(--outline-variant)' }} />
            </div>
          )}

          {/* Pagos ya procesados (solo los que aún están en la lista del servidor) */}
          {cantProcesados > 0 && (
            <ul
              className="admin-lista"
              aria-label="Pagos procesados en esta sesión"
              style={{ opacity: 0.6, pointerEvents: 'none' }}
            >
              {pagos
                .filter((p) => procesados[p.id])
                .map((pago) => (
                  <TarjetaPago
                    key={pago.id}
                    pago={pago}
                    onValidado={() => {}}
                  />
                ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};
