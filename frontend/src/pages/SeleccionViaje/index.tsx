import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ── Tipos ────────────────────────────────────────────────────────────────────

type SentidoViaje = 'colon-rosario' | 'rosario-colon';

interface Parada {
  id: number;
  nombre: string;
  pueblo: string;
}

interface SalidaSemanal {
  id: string;
  fechaFormato: string;
  fechaISO: string;
  hora: string;
  butacasLibres: number;
}

// ── Fallback hardcodeado (usado si GET /paradas no está disponible) ──────────
const PARADAS_FALLBACK: Parada[] = [
  { id: 1, nombre: 'Terminal / Base', pueblo: 'Colón' },
  { id: 2, nombre: 'Parada sobre Ruta 8', pueblo: 'Hughes' },
  { id: 3, nombre: 'Parada sobre Ruta 8', pueblo: 'Wheelwright' },
];

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcularProximasSalidas(sentido: SentidoViaje): SalidaSemanal[] {
  const salidas: SalidaSemanal[] = [];
  const hoy = new Date();
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const targetDia = sentido === 'colon-rosario' ? 5 : 0; // Viernes / Domingo
  const horaFija = sentido === 'colon-rosario' ? '18:00 hs' : '21:30 hs';

  let cursor = new Date(hoy);
  let count = 0;
  while (salidas.length < 2 && count < 25) {
    if (cursor.getDay() === targetDia) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      const fechaISO = `${y}-${m}-${d}`;
      const fechaFormato = `${diasSemana[targetDia]} ${cursor.getDate()} de ${meses[cursor.getMonth()]}`;
      salidas.push({
        id: fechaISO,
        fechaFormato,
        fechaISO,
        hora: horaFija,
        butacasLibres: salidas.length === 0 ? 6 : 11,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
    count++;
  }
  return salidas;
}

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
  const salidasDisponibles = useMemo(() => calcularProximasSalidas(sentido), [sentido]);
  const [fechaISO, setFechaISO] = useState('');
  const salidaActiva =
    salidasDisponibles.find((s) => s.fechaISO === fechaISO) || salidasDisponibles[0];

  // ── Cargar paradas del backend ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingParadas(true);
    fetch(`${API_BASE}/paradas`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.paradas && data.paradas.length > 0) {
          setParadas(data.paradas);
          setParadaSeleccionadaId(data.paradas[0].id);
        }
      })
      .catch(() => {
        // Silencioso — usa el fallback hardcodeado
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
      precio: '9500',
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
          Reservar Butaca
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
                {salidaActiva?.butacasLibres} butacas libres
              </span>
            </div>

            <div className="departure-main-info">
              <div>
                <div className="departure-datetime">{salidaActiva?.fechaFormato}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '2px' }}>
                  Salida puntual {salidaActiva?.hora}
                </div>
              </div>
              <div>
                <div className="departure-price">$9.500</div>
                <div className="departure-price-sub">pasaje nominativo</div>
              </div>
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
            <div className="stop-field-box" style={{ borderColor: (!mostrarParadaOrigen && errorDireccion) ? 'var(--error)' : undefined }}>
              <div className="stop-field-header">
                <span className="material-symbols-outlined">trip_origin</span>
                <span>{labelOrigen}</span>
              </div>

              {mostrarParadaOrigen ? (
                <>
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
                  {esIntermedia(paradaSeleccionada) && (
                    <div className="stop-note">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                      Punto de encuentro fijo al costado de la ruta (no es puerta a puerta).
                    </div>
                  )}
                </>
              ) : (
                <>
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
                  {errorDireccion && (
                    <div style={{ color: 'var(--error)', fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>
                      {errorMsgDir}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Campo Destino */}
            <div className="stop-field-box" style={{ borderColor: (mostrarParadaOrigen && errorDireccion) ? 'var(--error)' : undefined }}>
              <div className="stop-field-header">
                <span className="material-symbols-outlined">
                  {mostrarParadaDestino ? 'location_on' : 'home_pin'}
                </span>
                <span>{labelDestino}</span>
              </div>

              {mostrarParadaDestino ? (
                <>
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
                  {esIntermedia(paradaSeleccionada) && (
                    <div className="stop-note">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                      Descenso sobre la ruta en el punto de encuentro convenido.
                    </div>
                  )}
                </>
              ) : (
                <>
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
                  {errorDireccion && (
                    <div style={{ color: 'var(--error)', fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>
                      {errorMsgDir}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* CTA */}
          <button type="submit" className="btn-reserve-main">
            <span>Confirmar y ver precio • $9.500</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </form>
      </section>
    </div>
  );
};

export default SeleccionViajePage;
