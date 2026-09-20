import React, { useRef, useCallback, useState } from 'react';
import { useGoogleMaps, useMapaPicker } from '../hooks/useGoogleMaps.ts';
import type { MapaPickerResult } from '../hooks/useGoogleMaps.ts';
import './MapaPicker.css';

interface MapaPickerProps {
  /** Label del campo (ej: "Domicilio de destino en Rosario") */
  label: string;
  /** Placeholder del input de búsqueda */
  placeholder?: string;
  /** Valor actual de la dirección (texto) */
  value: string;
  /** Callback cuando el usuario elige una ubicación */
  onChange: (result: MapaPickerResult) => void;
  /** Si true, muestra el borde en rojo (error de validación) */
  hasError?: boolean;
  /** Mensaje de error a mostrar bajo el campo */
  errorMessage?: string;
  /** ID del input para labels y tests */
  inputId?: string;
}

/**
 * MapaPicker — T-09
 *
 * Selector de domicilio estilo PedidosYa / Uber:
 * - Input con autocompletado de Places (sugerencias mientras escribís).
 * - Mapa con un pin arrastrable para ajustar la ubicación exacta.
 * - Geocodificación inversa al arrastrar el pin → actualiza el texto del input.
 *
 * Devuelve dirección + coordenadas al padre via `onChange`.
 * Si la API Key no está configurada, cae gracefully al input de texto plano.
 */
export const MapaPicker: React.FC<MapaPickerProps> = ({
  label,
  placeholder = 'Buscá tu dirección...',
  value,
  onChange,
  hasError = false,
  errorMessage,
  inputId = 'input-mapa-picker',
}) => {
  const { isLoaded, error: mapsError } = useGoogleMaps();
  const [mapaVisible, setMapaVisible] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (result: MapaPickerResult) => {
      onChange(result);
      // Cerrar el mapa automáticamente si viene de autocomplete (no de drag)
    },
    [onChange]
  );

  useMapaPicker(mapContainerRef, inputRef, isLoaded && mapaVisible, handleChange);

  // Fallback: si la API no está disponible → input de texto plano
  if (mapsError) {
    return (
      <div className={`mapa-picker-fallback ${hasError ? 'has-error' : ''}`}>
        <label className="mapa-picker-label" htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          className="mapa-picker-input-plain"
          value={value}
          onChange={(e) =>
            onChange({ direccion: e.target.value, lat: 0, lng: 0 })
          }
          placeholder={placeholder}
          autoComplete="street-address"
        />
        {hasError && errorMessage && (
          <p className="mapa-picker-error">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`mapa-picker-root ${hasError ? 'has-error' : ''}`}>
      {/* ── Input con icono de búsqueda y botón de mapa ── */}
      <div className="mapa-picker-input-row">
        <span className="material-symbols-outlined mapa-picker-search-icon">
          search
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          className="mapa-picker-input"
          defaultValue={value}
          placeholder={isLoaded ? placeholder : 'Cargando mapa...'}
          disabled={!isLoaded}
          autoComplete="off"
          aria-label={label}
          onFocus={() => {
            if (!mapaVisible) setMapaVisible(true);
          }}
        />
        <button
          type="button"
          className={`mapa-picker-toggle-btn ${mapaVisible ? 'active' : ''}`}
          onClick={() => setMapaVisible((v) => !v)}
          aria-label={mapaVisible ? 'Ocultar mapa' : 'Elegir en el mapa'}
          title={mapaVisible ? 'Ocultar mapa' : 'Elegir en el mapa'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {mapaVisible ? 'map_off' : 'map'}
          </span>
        </button>
      </div>

      {/* ── Panel del mapa (se monta al primer click) ── */}
      {mapaVisible && (
        <div className="mapa-picker-panel" role="region" aria-label="Selector de ubicación en mapa">
          <div className="mapa-picker-hint">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              touch_app
            </span>
            Arrastrá el pin o hacé click en el mapa para ajustar la ubicación exacta
          </div>
          <div
            ref={mapContainerRef}
            className="mapa-picker-map"
            aria-label="Mapa para seleccionar ubicación"
          />
          <button
            type="button"
            className="mapa-picker-confirm-btn"
            onClick={() => setMapaVisible(false)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              check_circle
            </span>
            Confirmar ubicación
          </button>
        </div>
      )}

      {/* ── Chip de ubicación seleccionada ── */}
      {value && !mapaVisible && (
        <div className="mapa-picker-selected-chip">
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--secondary)' }}>
            location_on
          </span>
          <span className="mapa-picker-selected-text">{value}</span>
          <button
            type="button"
            className="mapa-picker-clear-btn"
            onClick={() => {
              onChange({ direccion: '', lat: 0, lng: 0 });
              if (inputRef.current) inputRef.current.value = '';
            }}
            aria-label="Borrar dirección seleccionada"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* ── Mensaje de error ── */}
      {hasError && errorMessage && (
        <p className="mapa-picker-error" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            error
          </span>
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export type { MapaPickerResult };
