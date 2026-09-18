import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { SentidoViaje } from '../../types/index.ts';
import { useWeeklyDepartures } from '../../hooks/useWeeklyDepartures.ts';
import './home.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const salidasIda = useWeeklyDepartures('colon-rosario', 1);
  const salidasVuelta = useWeeklyDepartures('rosario-colon', 1);
  const salidaIda = salidasIda[0] ?? null;
  const salidaVuelta = salidasVuelta[0] ?? null;

  const handleReservar = (sentido: SentidoViaje) => {
    navigate(`/seleccion-viaje?sentido=${sentido}`);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="badge" style={{ marginBottom: '0.4rem' }}>
          Servicio Semanal Exclusivo
        </div>
        <h1 style={{ fontSize: '1.65rem', lineHeight: '1.25' }}>Combi Colón • Rosario</h1>
        <p className="subtitle" style={{ marginTop: '0.25rem' }}>
          Viajá directo y seguro. Salidas fijas semanales con servicio puerta a puerta en Rosario.
        </p>
      </div>

      {/* Tarjetas de próximas salidas */}
      <section aria-label="Próximas salidas disponibles" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
        {/* Ida: Colón → Rosario */}
        {salidaIda && (
          <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary)', marginBottom: '4px' }}>
                  Colón → Rosario
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {salidaIda.fechaFormato}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                  Salida puntual {salidaIda.hora}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--outline)' }}>
                  Precio base
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>$9.500</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>por pasajero</div>
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--success)',
                    backgroundColor: 'var(--success-bg)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>airline_seat_recline_extra</span>
                  {salidaIda.asientosLibres} asientos
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-reserve-main"
              onClick={() => handleReservar('colon-rosario')}
            >
              <span>Reservar Asiento — Colón a Rosario</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Vuelta: Rosario → Colón */}
        {salidaVuelta && (
          <div className="card" style={{ borderLeft: '4px solid var(--primary-container)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-primary-container)', marginBottom: '4px' }}>
                  Rosario → Colón
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {salidaVuelta.fechaFormato}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                  Salida puntual {salidaVuelta.hora}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--outline)' }}>
                  Precio base
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>$9.500</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>por pasajero</div>
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--success)',
                    backgroundColor: 'var(--success-bg)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>airline_seat_recline_extra</span>
                  {salidaVuelta.asientosLibres} asientos
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-reserve-main"
              style={{ backgroundColor: 'var(--primary)' }}
              onClick={() => handleReservar('rosario-colon')}
            >
              <span>Reservar Asiento — Rosario a Colón</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        )}
      </section>

      {/* Banner de Contacto Directo por WhatsApp */}
      <section className="whatsapp-banner" aria-label="Atención directa por WhatsApp">
        <div className="whatsapp-banner-info">
          <div className="whatsapp-icon-circle">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>chat</span>
          </div>
          <div>
            <div className="whatsapp-banner-title">¿Dudas con tu dirección o el equipaje?</div>
            <div className="whatsapp-banner-desc">
              Escribinos directo al WhatsApp y coordinamos cualquier necesidad especial con vos.
            </div>
          </div>
        </div>
        <a
          href="https://wa.me/5492473000000?text=Hola!%20Quería%20hacer%20una%20consulta%20sobre%20el%20viaje%20en%20la%20combi"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-whatsapp"
        >
          <span>WhatsApp</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
        </a>
      </section>

    </div>
  );
};

export default HomePage;
