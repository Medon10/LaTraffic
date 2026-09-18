import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SentidoViaje, Parada } from '../../types/index.ts';
import { viajesService, PARADAS_FALLBACK } from '../../services/viajes.service.ts';
import { useWeeklyDepartures } from '../../hooks/useWeeklyDepartures.ts';
import { StopField, PriceSummary } from '../../componentes/ui/index.ts';
import './seleccionViaje.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function etiquetaParada(p: Parada): string {
  return `${p.pueblo} — ${p.nombre}`;
}

function esIntermedia(p: Parada | undefined): boolean {
  if (!p) return false;
  return p.pueblo.toLowerCase() !== 'colón' && p.pueblo.toLowerCase() !== 'colon';
}

// ── Componente principal ──────────────────────────────────────────────────────

export const SeleccionViajePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Leer sentido inicial desde la URL si Home lo pasó (opcional)
  const sentidoInicial = (searchParams.get('sentido') as SentidoViaje) || 'colon-rosario';

  const [sentido, setSentido] = useState<SentidoViaje>(sentidoInicial);
  const [paradas, setParadas] = useState<Parada[]>(PARADAS_FALLBACK);
  const [loadingParadas, setLoadingParadas] = useState(true);

  // Campos de origen/destino
  const [paradaSeleccionadaId, setParadaSeleccionadaId] = useState<number>(PARADAS_FALLBACK[0].id);
  const [direccionRosario, setDireccionRosario] = useState('');
  const [errorDireccion, setErrorDireccion] = useState(false);

  // Fecha
  const salidasDisponibles = useWeeklyDepartures(sentido, 2);
  const [fechaISO, setFechaISO] = useState('');
  const salidaActiva =
    salidasDisponibles.find((s) => s.fechaISO === fechaISO) || salidasDisponibles[0];
  const precioBase = salidaActiva?.precioBase ?? 9500;

  // ── Cargar paradas del backend ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    viajesService.getParadas()
      .then((data) => {
        if (!cancelled && data.length > 0) {
          setParadas(data);
          setParadaSeleccionadaId(data[0].id);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingParadas(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resetear error de dirección y parada seleccionada al cambiar sentido
  const handleCambiarSentido = (nuevo: SentidoViaje) => {
    setSentido(nuevo);
    setErrorDireccion(false);
    setDireccionRosario('');
  };

  const paradaSeleccionada = paradas.find((p) => p.id === paradaSeleccionadaId);

  // ── Validar y navegar a Checkout ───────────────────────────────────────────
  const handleReservar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!direccionRosario.trim()) {
      setErrorDireccion(true);
      return;
    }

    const origen =
      sentido === 'colon-rosario'
        ? etiquetaParada(paradaSeleccionada!)
        : `Rosario: ${direccionRosario.trim()}`;

    const destino =
      sentido === 'colon-rosario'
        ? `Rosario: ${direccionRosario.trim()}`
        : etiquetaParada(paradaSeleccionada!);

    const params = new URLSearchParams({
      sentido,
      origen,
      destino,
      fecha: salidaActiva?.fechaFormato || '',
      hora: salidaActiva?.hora || '',
      paradaId: String(paradaSeleccionadaId),
      direccionRosario: direccionRosario.trim(),
      precio: String(precioBase),
    });

    navigate(`/checkout?${params.toString()}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const labelOrigen = sentido === 'colon-rosario' ? '1. Punto de subida (Punto Fijo)' : '1. ¿Dónde te buscamos en Rosario? (Puerta a Puerta)';
  const labelDestino = sentido === 'colon-rosario' ? '2. ¿Dónde te dejamos en Rosario? (Puerta a Puerta)' : '2. Punto de bajada (Punto Fijo)';
  const placeholderDir =
    sentido === 'colon-rosario'
      ? 'Calle, altura, piso o lugar (ej: Pellegrini 1450)'
      : 'Calle, altura, piso/depto (ej: San Lorenzo 1120)';
  const errorMsgDir =
    sentido === 'colon-rosario'
      ? 'Por favor, ingresá la dirección de entrega en Rosario.'
      : 'Por favor, ingresá la dirección donde te buscamos en Rosario.';

  const mostrarParadaOrigen = sentido === 'colon-rosario';
  const mostrarParadaDestino = sentido === 'rosario-colon';

  return (
    <div className="page-container">
      {/* Encabezado */}
      <div>
        <div className="badge" style={{ marginBottom: '0.4rem' }}>
          Reservar Asiento
        </div>
        <h1 style={{ fontSize: '1.5rem' }}>Elegí tu viaje</h1>
        <p className="subtitle" style={{ marginTop: '0.25rem' }}>
          Seleccioná el sentido, la fecha y tus puntos de subida y bajada.
        </p>
      </div>

      <section className="booking-card" aria-label="Formulario de selección de viaje">
        {/* ── Toggle de sentido ── */}
        <div className="direction-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={sentido === 'colon-rosario'}
            className={`direction-tab-btn ${sentido === 'colon-rosario' ? 'active' : ''}`}
            onClick={() => handleCambiarSentido('colon-rosario')}
          >
            <span className="tab-route">
              Colón{' '}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>{' '}
              Rosario
            </span>
            <span className="tab-desc">Puerta a puerta en Rosario</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={sentido === 'rosario-colon'}
            className={`direction-tab-btn ${sentido === 'rosario-colon' ? 'active' : ''}`}
            onClick={() => handleCambiarSentido('rosario-colon')}
          >
            <span className="tab-route">
              Rosario{' '}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>{' '}
              Colón
            </span>
            <span className="tab-desc">Te buscamos en tu domicilio</span>
          </button>
        </div>

        {/* ── Selector de fecha (chips) ── */}
        {salidasDisponibles.length > 0 && (
          <div className="next-departure-box" style={{ marginBottom: '1.25rem' }}>
            <div className="departure-box-header">
              <span className="departure-tag">Fecha del viaje</span>
              <span className="departure-seats-badge">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  airline_seat_recline_extra
                </span>
                {salidaActiva?.asientosLibres} asientos libres
              </span>
            </div>

            <div className="departure-main-info">
              <div>
                <div className="departure-datetime">{salidaActiva?.fechaFormato}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '2px' }}>
                  Salida puntual {salidaActiva?.hora}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="departure-price-label">Precio base</div>
                <div className="departure-price">${precioBase.toLocaleString('es-AR')}</div>
                <div className="departure-price-sub">por pasajero</div>
              </div>
            </div>

            {/* Aclaración HU-06 y RF-04: el precio mostrado es el base; descuentos se aplican en pasos posteriores */}
            <div className="departure-notice">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)', flexShrink: 0 }}>
                info
              </span>
              <span>
                <strong>Precio base:</strong> Los descuentos por cupón o por método de pago (transferencia o efectivo) se calculan y muestran en los pasos siguientes.
              </span>
            </div>

            {salidasDisponibles.length > 1 && (
              <div className="departure-date-selector">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--outline)', alignSelf: 'center' }}>
                  Fecha:
                </span>
                {salidasDisponibles.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`date-chip ${s.fechaISO === salidaActiva?.fechaISO ? 'selected' : ''}`}
                    onClick={() => setFechaISO(s.fechaISO)}
                  >
                    {idx === 0 ? 'Esta semana' : 'Próx. semana'} (
                    {s.fechaFormato.split(' ')[0]} {s.fechaFormato.split(' ')[1]})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Formulario de trayecto ── */}
        <form onSubmit={handleReservar}>
          <div className="trip-stops-group">
            {/* Campo Origen */}
            <StopField
              icon="trip_origin"
              label={labelOrigen}
              hasError={!mostrarParadaOrigen && errorDireccion}
              errorMessage={errorMsgDir}
              note={mostrarParadaOrigen && esIntermedia(paradaSeleccionada) ? 'Punto de encuentro fijo al costado de la ruta (no es puerta a puerta).' : undefined}
            >
              {mostrarParadaOrigen ? (
                <select
                  id="select-origen"
                  value={paradaSeleccionadaId}
                  onChange={(e) => setParadaSeleccionadaId(Number(e.target.value))}
                  className="stop-select"
                  disabled={loadingParadas}
                >
                  {paradas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {etiquetaParada(p)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="input-domicilio-origen"
                  type="text"
                  value={direccionRosario}
                  onChange={(e) => {
                    setDireccionRosario(e.target.value);
                    if (errorDireccion) setErrorDireccion(false);
                  }}
                  placeholder={placeholderDir}
                  className="stop-address-input"
                  autoComplete="street-address"
                />
              )}
            </StopField>

            {/* Campo Destino */}
            <StopField
              icon={mostrarParadaDestino ? 'location_on' : 'home_pin'}
              label={labelDestino}
              hasError={mostrarParadaOrigen && errorDireccion}
              errorMessage={errorMsgDir}
              note={mostrarParadaDestino && esIntermedia(paradaSeleccionada) ? 'Descenso sobre la ruta en el punto de encuentro convenido.' : undefined}
            >
              {mostrarParadaDestino ? (
                <select
                  id="select-destino"
                  value={paradaSeleccionadaId}
                  onChange={(e) => setParadaSeleccionadaId(Number(e.target.value))}
                  className="stop-select"
                  disabled={loadingParadas}
                >
                  {paradas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {etiquetaParada(p)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="input-domicilio-destino"
                  type="text"
                  value={direccionRosario}
                  onChange={(e) => {
                    setDireccionRosario(e.target.value);
                    if (errorDireccion) setErrorDireccion(false);
                  }}
                  placeholder={placeholderDir}
                  className="stop-address-input"
                  autoComplete="street-address"
                />
              )}
            </StopField>
          </div>

          {/* Resumen del precio base del viaje seleccionado (HU-06 / RF-04) */}
          <PriceSummary
            title="Precio base del viaje"
            subtitle="Descuentos por cupón o medio de pago se aplican en los siguientes pasos"
            amount={precioBase}
          />

          {/* CTA */}
          <button type="submit" className="btn-reserve-main">
            <span>Continuar con la reserva • Precio base ${precioBase.toLocaleString('es-AR')}</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </form>
      </section>
    </div>
  );
};

export default SeleccionViajePage;
