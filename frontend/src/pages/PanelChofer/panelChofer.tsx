import React, { useState } from 'react';
import './panelChofer.css';
import { choferService, PasajeroChofer } from '../../services/chofer.service.ts';
import { ApiError } from '../../shared/api.ts';

// ── Estado del formulario ────────────────────────────────────────────────────

type EstadoCarga = 'idle' | 'loading' | 'success' | 'error';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function formatSentido(sentido: string): string {
  if (sentido === 'colon_rosario') return 'Colón → Rosario';
  if (sentido === 'rosario_colon') return 'Rosario → Colón';
  return sentido;
}

function badgeEstado(estado: string): string {
  switch (estado) {
    case 'confirmada':   return 'estado-confirmada';
    case 'completada':   return 'estado-completada';
    case 'no_show':      return 'estado-no-show';
    default:             return 'estado-otro';
  }
}

function labelEstado(estado: string): string {
  switch (estado) {
    case 'confirmada':   return 'Confirmada';
    case 'completada':   return 'Completada';
    case 'no_show':      return 'No Show';
    case 'cancelada':    return 'Cancelada';
    default:             return estado;
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export const PanelChoferPage: React.FC = () => {
  const [viajeIdInput, setViajeIdInput] = useState('');
  const [estado, setEstado] = useState<EstadoCarga>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [resultado, setResultado] = useState<{
    viajeId: number;
    fecha: string;
    sentido: string;
    totalConfirmados: number;
    pasajeros: PasajeroChofer[];
  } | null>(null);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(viajeIdInput, 10);
    if (isNaN(id) || id <= 0) {
      setErrorMsg('Ingresá un ID de viaje válido.');
      setEstado('error');
      return;
    }

    setEstado('loading');
    setErrorMsg('');
    setResultado(null);

    try {
      const data = await choferService.getPasajeros(id);
      setResultado(data);
      setEstado('success');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Ocurrió un error al consultar los pasajeros.');
      }
      setEstado('error');
    }
  };

  return (
    <div className="page-container panel-chofer">
      {/* Header ────────────────────────────────────────────── */}
      <div className="chofer-header">
        <span className="badge">Panel Chofer</span>
        <h1>Pasajeros del viaje</h1>
        <p className="subtitle">
          Ingresá el ID del viaje para ver la lista de pasajeros confirmados con
          su punto de origen y destino.
        </p>
      </div>

      {/* Formulario ─────────────────────────────────────────── */}
      <form className="chofer-form card" onSubmit={handleBuscar} id="form-buscar-viaje">
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
            disabled={estado === 'loading'}
          />
          <button
            id="btn-buscar-pasajeros"
            className="btn btn-primary"
            type="submit"
            disabled={estado === 'loading' || viajeIdInput.trim() === ''}
          >
            {estado === 'loading' ? (
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

      {/* Error ──────────────────────────────────────────────── */}
      {estado === 'error' && (
        <div className="chofer-alert chofer-alert--error" role="alert">
          <span className="material-symbols-outlined">error</span>
          {errorMsg}
        </div>
      )}

      {/* Resultado ──────────────────────────────────────────── */}
      {estado === 'success' && resultado && (
        <div className="chofer-resultado">
          {/* Resumen del viaje */}
          <div className="chofer-resumen card">
            <div className="chofer-resumen__grid">
              <div className="chofer-resumen__item">
                <span className="material-symbols-outlined">calendar_today</span>
                <div>
                  <span className="chofer-resumen__label">Fecha</span>
                  <span className="chofer-resumen__value">{formatFecha(resultado.fecha)}</span>
                </div>
              </div>
              <div className="chofer-resumen__item">
                <span className="material-symbols-outlined">route</span>
                <div>
                  <span className="chofer-resumen__label">Sentido</span>
                  <span className="chofer-resumen__value">{formatSentido(resultado.sentido)}</span>
                </div>
              </div>
              <div className="chofer-resumen__item">
                <span className="material-symbols-outlined">group</span>
                <div>
                  <span className="chofer-resumen__label">Confirmados</span>
                  <span className="chofer-resumen__value chofer-resumen__value--highlight">
                    {resultado.totalConfirmados}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de pasajeros */}
          {resultado.pasajeros.length === 0 ? (
            <div className="chofer-empty">
              <span className="material-symbols-outlined chofer-empty__icon">person_off</span>
              <p>No hay pasajeros confirmados para este viaje.</p>
            </div>
          ) : (
            <ul className="chofer-lista" aria-label="Lista de pasajeros">
              {resultado.pasajeros.map((p, idx) => (
                <li key={p.pasajeId} className="chofer-pasajero card">
                  {/* Número de orden + nombre */}
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

                  {/* Origen → Destino */}
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
        </div>
      )}
    </div>
  );
};
