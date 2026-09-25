import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pasajesService } from '../../services/pasajes.service.ts';
import type { Reserva, EstadoPasaje, Sentido } from '../../types/index.ts';
import './misReservas.css';

// ─── Helpers de presentación ──────────────────────────────────────────────────

const SENTIDO_LABEL: Record<Sentido, string> = {
  colon_rosario: 'Colón → Rosario',
  rosario_colon: 'Rosario → Colón',
};

const ESTADO_CONFIG: Record<
  EstadoPasaje,
  { label: string; css: string; icon: string }
> = {
  confirmada: { label: 'Confirmada', css: 'status-confirmada', icon: 'check_circle' },
  pendiente_pago: { label: 'Pendiente de pago', css: 'status-pendiente', icon: 'schedule' },
  vencida: { label: 'Vencida', css: 'status-vencida', icon: 'timer_off' },
  cancelada: { label: 'Cancelada', css: 'status-cancelada', icon: 'cancel' },
  completada: { label: 'Completada', css: 'status-completada', icon: 'done_all' },
  no_show: { label: 'No se presentó', css: 'status-noshow', icon: 'person_off' },
};

const METODO_LABEL: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
};

/** Formatea "2026-09-24" → "jue 24 sep 2026" */
function formatFechaViaje(fechaISO: string | null): string {
  if (!fechaISO) return '—';
  // La fecha llega como YYYY-MM-DD — al parsearla con Date se interpreta en UTC.
  // Usamos partes individuales para evitar desfase de huso horario.
  const [year, month, day] = fechaISO.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatHora(hora: string | null): string {
  if (!hora) return '';
  return hora.substring(0, 5); // HH:mm
}

function formatFechaReserva(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Cuenta tiempo restante hasta una fecha ISO */
function tiempoRestante(iso: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Determina si el viaje es futuro o pasado respecto a hoy */
function esFuturo(fechaISO: string | null): boolean {
  if (!fechaISO) return false;
  const [year, month, day] = fechaISO.split('-').map(Number);
  const dViaje = new Date(year, month - 1, day);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return dViaje >= hoy;
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

interface ReservaCardProps {
  reserva: Reserva;
}

const ReservaCard: React.FC<ReservaCardProps> = ({ reserva }) => {
  const config = ESTADO_CONFIG[reserva.estado] ?? {
    label: reserva.estado,
    css: 'status-pendiente',
    icon: 'help',
  };
  const holdRestante = tiempoRestante(reserva.fecha_expiracion_hold);
  const futuro = esFuturo(reserva.fecha_viaje);

  return (
    <article className={`reserva-card ${futuro ? 'reserva-card--futura' : 'reserva-card--pasada'}`}>
      {/* Cabecera: sentido + badge de estado */}
      <div className="reserva-card__header">
        <div className="reserva-card__sentido">
          <span className="material-symbols-outlined reserva-icon">directions_bus</span>
          <span className="reserva-card__ruta">
            {reserva.sentido ? SENTIDO_LABEL[reserva.sentido] : 'Ruta no disponible'}
          </span>
        </div>
        <span className={`reserva-item-status ${config.css}`}>
          <span className="material-symbols-outlined" style={{ fontSize: '0.85rem', verticalAlign: 'middle' }}>
            {config.icon}
          </span>{' '}
          {config.label}
        </span>
      </div>

      {/* Fecha y hora del viaje */}
      <div className="reserva-card__fecha-bloque">
        <div className="reserva-card__fecha">
          <span className="material-symbols-outlined reserva-meta-icon">calendar_month</span>
          <span>{formatFechaViaje(reserva.fecha_viaje)}</span>
          {reserva.hora_viaje && (
            <span className="reserva-hora">· {formatHora(reserva.hora_viaje)}</span>
          )}
        </div>
      </div>

      {/* Origen → Destino */}
      <div className="reserva-card__ruta-detalle">
        <div className="reserva-card__punto">
          <span className="material-symbols-outlined reserva-meta-icon point-origin">trip_origin</span>
          <span>{reserva.origen ?? '—'}</span>
        </div>
        <div className="reserva-card__punto">
          <span className="material-symbols-outlined reserva-meta-icon point-dest">location_on</span>
          <span>{reserva.destino ?? '—'}</span>
        </div>
      </div>

      {/* Pie: pago + fecha de reserva */}
      <div className="reserva-card__footer">
        <div className="reserva-card__pago-info">
          {reserva.monto && (
            <span className="reserva-monto">
              ${Number(reserva.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          )}
          {reserva.metodo_pago && (
            <span className="reserva-metodo">{METODO_LABEL[reserva.metodo_pago] ?? reserva.metodo_pago}</span>
          )}
        </div>
        <span className="reserva-fecha-reserva">
          Reservado el {formatFechaReserva(reserva.fecha_reserva)}
        </span>
      </div>

      {/* Hold de transferencia con tiempo restante */}
      {holdRestante && reserva.estado === 'pendiente_pago' && (
        <div className="reserva-card__hold-alert">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>hourglass_top</span>
          <span>Hold vence en <strong>{holdRestante}</strong></span>
        </div>
      )}
    </article>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

type Filtro = 'todas' | 'futuras' | 'pasadas';

export const MisReservasPage: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todas');

  useEffect(() => {
    setLoading(true);
    setError(null);
    pasajesService
      .getMisReservas()
      .then((data) => setReservas(data))
      .catch((err: Error) => setError(err.message ?? 'No se pudieron cargar tus reservas.'))
      .finally(() => setLoading(false));
  }, []);

  const reservasFiltradas = reservas.filter((r) => {
    if (filtro === 'futuras') return esFuturo(r.fecha_viaje);
    if (filtro === 'pasadas') return !esFuturo(r.fecha_viaje);
    return true;
  });

  return (
    <div className="page-container">
      <div className="badge">Mis Viajes</div>
      <h1>Mis Reservas</h1>
      <p className="subtitle">
        Consultá el historial de tus pasajes, estados de pago y reservas activas.
      </p>

      {/* Filtros */}
      {!loading && !error && reservas.length > 0 && (
        <div className="reservas-filtros" role="group" aria-label="Filtrar reservas">
          {(['todas', 'futuras', 'pasadas'] as Filtro[]).map((f) => (
            <button
              key={f}
              id={`filtro-${f}`}
              className={`filtro-btn ${filtro === f ? 'filtro-btn--active' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Estados de carga / error / vacío */}
      {loading && (
        <div className="reservas-estado-msg">
          <span className="material-symbols-outlined spinning" style={{ fontSize: '2rem', color: 'var(--secondary)' }}>
            progress_activity
          </span>
          <p>Cargando tus reservas…</p>
        </div>
      )}

      {!loading && error && (
        <div className="card reservas-error">
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--error)' }}>
            error
          </span>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && reservas.length === 0 && (
        <div className="card reservas-empty">
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--secondary-fixed-dim)' }}>
            confirmation_number
          </span>
          <p className="reservas-empty__titulo">Todavía no tenés reservas</p>
          <p className="muted-text">Cuando hagas tu primera reserva, aparecerá acá.</p>
          <Link to="/seleccion-viaje" className="btn btn-primary" id="btn-reservar-desde-vacio">
            Reservar un viaje →
          </Link>
        </div>
      )}

      {!loading && !error && reservas.length > 0 && reservasFiltradas.length === 0 && (
        <div className="reservas-estado-msg">
          <p className="muted-text">No hay reservas para el filtro seleccionado.</p>
        </div>
      )}

      {/* Lista de reservas */}
      {!loading && !error && reservasFiltradas.length > 0 && (
        <div className="reservas-lista">
          {reservasFiltradas.map((r) => (
            <ReservaCard key={r.id} reserva={r} />
          ))}
        </div>
      )}

      {/* CTA al pie */}
      {!loading && !error && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link to="/seleccion-viaje" className="btn btn-primary" id="btn-nueva-reserva">
            Reservar nuevo viaje →
          </Link>
        </div>
      )}
    </div>
  );
};

export default MisReservasPage;
