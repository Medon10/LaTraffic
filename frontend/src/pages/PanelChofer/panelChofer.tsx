import React, { useState } from 'react';
import './panelChofer.css';
import {
  choferService,
  type PasajeroChofer,
  type ParadaOrdenada,
  type RutaViaje,
} from '../../services/chofer.service.ts';
import { ApiError } from '../../shared/api.ts';

// ── Tipos locales ─────────────────────────────────────────────────────────────

type EstadoCarga = 'idle' | 'loading' | 'success' | 'error';
type TabActiva = 'pasajeros' | 'ruta';

interface DatosPasajeros {
  viajeId: number;
  fecha: string;
  sentido: string;
  totalConfirmados: number;
  pasajeros: PasajeroChofer[];
}

interface DatosRuta {
  viajeId: number;
  fecha: string;
  sentido: string;
  pasajesConfirmados: number;
  paradas: ParadaOrdenada[];
  ruta: RutaViaje | null;
  mensaje?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function formatSentido(sentido: string): string {
  if (sentido === 'colon_rosario') return 'Colón → Rosario';
  if (sentido === 'rosario_colon') return 'Rosario → Colón';
  return sentido;
}

function formatDistancia(metros: number): string {
  if (metros >= 1000) return `${(metros / 1000).toFixed(1)} km`;
  return `${metros} m`;
}

function formatDuracion(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

function badgeEstado(estado: string): string {
  switch (estado) {
    case 'confirmada': return 'estado-confirmada';
    case 'completada': return 'estado-completada';
    case 'no_show':    return 'estado-no-show';
    default:           return 'estado-otro';
  }
}

function labelEstado(estado: string): string {
  switch (estado) {
    case 'confirmada': return 'Confirmada';
    case 'completada': return 'Completada';
    case 'no_show':    return 'No Show';
    case 'cancelada':  return 'Cancelada';
    default:           return estado;
  }
}

// ── Sub-componente: pestaña Pasajeros ─────────────────────────────────────────

const TabPasajeros: React.FC<{ datos: DatosPasajeros }> = ({ datos }) => (
  <>
    {/* Resumen */}
    <div className="chofer-resumen card">
      <div className="chofer-resumen__grid">
        <div className="chofer-resumen__item">
          <span className="material-symbols-outlined">calendar_today</span>
          <div>
            <span className="chofer-resumen__label">Fecha</span>
            <span className="chofer-resumen__value">{formatFecha(datos.fecha)}</span>
          </div>
        </div>
        <div className="chofer-resumen__item">
          <span className="material-symbols-outlined">route</span>
          <div>
            <span className="chofer-resumen__label">Sentido</span>
            <span className="chofer-resumen__value">{formatSentido(datos.sentido)}</span>
          </div>
        </div>
        <div className="chofer-resumen__item">
          <span className="material-symbols-outlined">group</span>
          <div>
            <span className="chofer-resumen__label">Confirmados</span>
            <span className="chofer-resumen__value chofer-resumen__value--highlight">
              {datos.totalConfirmados}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Lista */}
    {datos.pasajeros.length === 0 ? (
      <div className="chofer-empty">
        <span className="material-symbols-outlined chofer-empty__icon">person_off</span>
        <p>No hay pasajeros confirmados para este viaje.</p>
      </div>
    ) : (
      <ul className="chofer-lista" aria-label="Lista de pasajeros">
        {datos.pasajeros.map((p, idx) => (
          <li key={p.pasajeId} className="chofer-pasajero card">
            <div className="chofer-pasajero__header">
              <span className="chofer-pasajero__num">{idx + 1}</span>
              <div>
                <span className="chofer-pasajero__nombre">
                  {p.nombre} {p.apellido}
                </span>
                <span className={`chofer-pasajero__estado ${badgeEstado(p.estadoPasaje)}`}>
                  {labelEstado(p.estadoPasaje)}
                </span>
              </div>
            </div>
            <div className="chofer-pasajero__ruta">
              <div className="chofer-pasajero__punto chofer-pasajero__punto--origen">
                <span className="material-symbols-outlined">trip_origin</span>
                <div>
                  <span className="chofer-pasajero__punto-label">Sube</span>
                  <span className="chofer-pasajero__punto-valor">{p.origen}</span>
                </div>
              </div>
              <div className="chofer-pasajero__linea" aria-hidden="true" />
              <div className="chofer-pasajero__punto chofer-pasajero__punto--destino">
                <span className="material-symbols-outlined">location_on</span>
                <div>
                  <span className="chofer-pasajero__punto-label">Baja</span>
                  <span className="chofer-pasajero__punto-valor">{p.destino}</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </>
);

// ── Sub-componente: pestaña Ruta Óptima ───────────────────────────────────────

const TabRuta: React.FC<{ datos: DatosRuta }> = ({ datos }) => {
  const { ruta, paradas, mensaje } = datos;

  return (
    <>
      {/* Resumen de viaje */}
      <div className="chofer-resumen card">
        <div className="chofer-resumen__grid">
          <div className="chofer-resumen__item">
            <span className="material-symbols-outlined">calendar_today</span>
            <div>
              <span className="chofer-resumen__label">Fecha</span>
              <span className="chofer-resumen__value">{formatFecha(datos.fecha)}</span>
            </div>
          </div>
          <div className="chofer-resumen__item">
            <span className="material-symbols-outlined">route</span>
            <div>
              <span className="chofer-resumen__label">Sentido</span>
              <span className="chofer-resumen__value">{formatSentido(datos.sentido)}</span>
            </div>
          </div>
          {ruta && (
            <>
              <div className="chofer-resumen__item">
                <span className="material-symbols-outlined">straighten</span>
                <div>
                  <span className="chofer-resumen__label">Distancia</span>
                  <span className="chofer-resumen__value chofer-resumen__value--highlight">
                    {formatDistancia(ruta.distanciaMetros)}
                  </span>
                </div>
              </div>
              <div className="chofer-resumen__item">
                <span className="material-symbols-outlined">schedule</span>
                <div>
                  <span className="chofer-resumen__label">Duración</span>
                  <span className="chofer-resumen__value chofer-resumen__value--highlight">
                    {formatDuracion(ruta.duracionSegundos)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sin ruta calculada */}
      {!ruta ? (
        <div className="chofer-alert chofer-alert--info">
          <span className="material-symbols-outlined">info</span>
          {mensaje ?? 'No se pudo calcular la ruta para este viaje.'}
        </div>
      ) : (
        <>
          {/* Botón para abrir en Maps */}
          <a
            id="btn-abrir-maps"
            className="btn btn-maps"
            href={ruta.mapsDeepLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined">open_in_new</span>
            Abrir ruta en Google Maps
          </a>

          {/* Paradas optimizadas */}
          {paradas.length === 0 ? (
            <div className="chofer-empty">
              <span className="material-symbols-outlined chofer-empty__icon">directions_off</span>
              <p>No hay paradas intermedias calculadas.</p>
            </div>
          ) : (
            <div className="ruta-timeline">
              {/* Origen fijo */}
              <div className="ruta-timeline__extremo ruta-timeline__extremo--origen">
                <div className="ruta-timeline__dot ruta-timeline__dot--origen" />
                <div className="ruta-timeline__info">
                  <span className="ruta-timeline__etiqueta">Origen</span>
                  <span className="ruta-timeline__nombre">
                    {datos.sentido === 'colon_rosario' ? 'Colón, Entre Ríos' : 'Rosario, Santa Fe'}
                  </span>
                </div>
              </div>

              {/* Paradas intermedias */}
              {paradas.map((parada, idx) => (
                <div key={idx} className="ruta-timeline__parada">
                  <div className="ruta-timeline__conector" aria-hidden="true" />
                  <div className="ruta-timeline__dot ruta-timeline__dot--parada" />
                  <div className="ruta-timeline__info">
                    <span className="ruta-timeline__etiqueta">Parada {parada.posicion + 1}</span>
                    <span className="ruta-timeline__nombre">{parada.label}</span>
                    {parada.lat && parada.lng && (
                      <a
                        className="ruta-timeline__coords"
                        href={`https://www.google.com/maps/search/?api=1&query=${parada.lat},${parada.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver ${parada.label} en Maps`}
                      >
                        <span className="material-symbols-outlined">pin_drop</span>
                        {parada.lat.toFixed(5)}, {parada.lng.toFixed(5)}
                      </a>
                    )}
                    {parada.address && (
                      <span className="ruta-timeline__address">
                        <span className="material-symbols-outlined">home</span>
                        {parada.address}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Destino fijo */}
              <div className="ruta-timeline__conector" aria-hidden="true" />
              <div className="ruta-timeline__extremo ruta-timeline__extremo--destino">
                <div className="ruta-timeline__dot ruta-timeline__dot--destino" />
                <div className="ruta-timeline__info">
                  <span className="ruta-timeline__etiqueta">Destino</span>
                  <span className="ruta-timeline__nombre">
                    {datos.sentido === 'colon_rosario' ? 'Rosario, Santa Fe' : 'Colón, Entre Ríos'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

export const PanelChoferPage: React.FC = () => {
  const [viajeIdInput, setViajeIdInput] = useState('');
  const [tabActiva, setTabActiva] = useState<TabActiva>('pasajeros');

  // Estado para pasajeros
  const [estadoPasajeros, setEstadoPasajeros] = useState<EstadoCarga>('idle');
  const [errorPasajeros, setErrorPasajeros] = useState('');
  const [datosPasajeros, setDatosPasajeros] = useState<DatosPasajeros | null>(null);

  // Estado para ruta
  const [estadoRuta, setEstadoRuta] = useState<EstadoCarga>('idle');
  const [errorRuta, setErrorRuta] = useState('');
  const [datosRuta, setDatosRuta] = useState<DatosRuta | null>(null);

  // Estado de carga global (cualquiera de los dos está cargando)
  const cargando =
    estadoPasajeros === 'loading' || estadoRuta === 'loading';

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(viajeIdInput, 10);
    if (isNaN(id) || id <= 0) {
      setErrorPasajeros('Ingresá un ID de viaje válido.');
      setEstadoPasajeros('error');
      return;
    }

    // Lanzar las dos peticiones en paralelo
    setEstadoPasajeros('loading');
    setEstadoRuta('loading');
    setErrorPasajeros('');
    setErrorRuta('');
    setDatosPasajeros(null);
    setDatosRuta(null);

    const [resPasajeros, resRuta] = await Promise.allSettled([
      choferService.getPasajeros(id),
      choferService.getRuta(id),
    ]);

    if (resPasajeros.status === 'fulfilled') {
      setDatosPasajeros(resPasajeros.value);
      setEstadoPasajeros('success');
    } else {
      const err = resPasajeros.reason;
      setErrorPasajeros(err instanceof ApiError ? err.message : 'Error al obtener pasajeros.');
      setEstadoPasajeros('error');
    }

    if (resRuta.status === 'fulfilled') {
      setDatosRuta(resRuta.value);
      setEstadoRuta('success');
    } else {
      const err = resRuta.reason;
      setErrorRuta(err instanceof ApiError ? err.message : 'Error al calcular la ruta.');
      setEstadoRuta('error');
    }
  };

  const hayResultados =
    estadoPasajeros === 'success' || estadoRuta === 'success';

  return (
    <div className="page-container panel-chofer">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="chofer-header">
        <span className="badge">Panel Chofer</span>
        <h1>Mi viaje del día</h1>
        <p className="subtitle">
          Ingresá el ID del viaje para ver los pasajeros confirmados y la ruta
          óptima calculada por Google Maps.
        </p>
      </div>

      {/* ── Formulario de búsqueda ───────────────────────────────── */}
      <form
        className="chofer-form card"
        onSubmit={handleBuscar}
        id="form-buscar-viaje"
      >
        <label className="chofer-form__label" htmlFor="viaje-id-input">
          <span className="material-symbols-outlined">confirmation_number</span>
          ID del viaje
        </label>
        <div className="chofer-form__row">
          <input
            id="viaje-id-input"
            className="chofer-form__input"
            type="number"
            min={1}
            placeholder="Ej: 42"
            value={viajeIdInput}
            onChange={(e) => setViajeIdInput(e.target.value)}
            disabled={cargando}
          />
          <button
            id="btn-buscar-viaje"
            className="btn btn-primary"
            type="submit"
            disabled={cargando || viajeIdInput.trim() === ''}
          >
            {cargando ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Buscando…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">search</span>
                Buscar
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      {hayResultados && (
        <>
          <div className="chofer-tabs" role="tablist" aria-label="Secciones del viaje">
            <button
              id="tab-pasajeros"
              role="tab"
              aria-selected={tabActiva === 'pasajeros'}
              aria-controls="panel-pasajeros"
              className={`chofer-tab ${tabActiva === 'pasajeros' ? 'chofer-tab--active' : ''}`}
              onClick={() => setTabActiva('pasajeros')}
            >
              <span className="material-symbols-outlined">group</span>
              Pasajeros
              {datosPasajeros && (
                <span className="chofer-tab__badge">
                  {datosPasajeros.totalConfirmados}
                </span>
              )}
            </button>
            <button
              id="tab-ruta"
              role="tab"
              aria-selected={tabActiva === 'ruta'}
              aria-controls="panel-ruta"
              className={`chofer-tab ${tabActiva === 'ruta' ? 'chofer-tab--active' : ''}`}
              onClick={() => setTabActiva('ruta')}
            >
              <span className="material-symbols-outlined">map</span>
              Ruta óptima
            </button>
          </div>

          {/* ── Panel Pasajeros ──────────────────────────────────── */}
          <div
            id="panel-pasajeros"
            role="tabpanel"
            aria-labelledby="tab-pasajeros"
            className={`chofer-panel ${tabActiva === 'pasajeros' ? 'chofer-panel--visible' : ''}`}
          >
            {estadoPasajeros === 'error' && (
              <div className="chofer-alert chofer-alert--error" role="alert">
                <span className="material-symbols-outlined">error</span>
                {errorPasajeros}
              </div>
            )}
            {estadoPasajeros === 'success' && datosPasajeros && (
              <TabPasajeros datos={datosPasajeros} />
            )}
          </div>

          {/* ── Panel Ruta ───────────────────────────────────────── */}
          <div
            id="panel-ruta"
            role="tabpanel"
            aria-labelledby="tab-ruta"
            className={`chofer-panel ${tabActiva === 'ruta' ? 'chofer-panel--visible' : ''}`}
          >
            {estadoRuta === 'error' && (
              <div className="chofer-alert chofer-alert--error" role="alert">
                <span className="material-symbols-outlined">error</span>
                {errorRuta}
              </div>
            )}
            {estadoRuta === 'success' && datosRuta && (
              <TabRuta datos={datosRuta} />
            )}
          </div>
        </>
      )}
    </div>
  );
};
