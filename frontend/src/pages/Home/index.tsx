import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

type SentidoViaje = 'colon-rosario' | 'rosario-colon';

interface SalidaSemanal {
  id: string;
  fechaFormato: string;
  fechaISO: string;
  hora: string;
  butacasLibres: number;
}

function calcularProximaSalida(sentido: SentidoViaje): SalidaSemanal | null {
  const hoy = new Date();
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const targetDia = sentido === 'colon-rosario' ? 5 : 0;
  const horaFija = sentido === 'colon-rosario' ? '18:00 hs' : '21:30 hs';

  let cursor = new Date(hoy);
  for (let i = 0; i < 25; i++) {
    if (cursor.getDay() === targetDia) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      return {
        id: `${y}-${m}-${d}`,
        fechaISO: `${y}-${m}-${d}`,
        fechaFormato: `${diasSemana[targetDia]} ${cursor.getDate()} de ${meses[cursor.getMonth()]}`,
        hora: horaFija,
        butacasLibres: 6,
      };
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const salidaIda = useMemo(() => calcularProximaSalida('colon-rosario'), []);
  const salidaVuelta = useMemo(() => calcularProximaSalida('rosario-colon'), []);

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
                  {salidaIda.butacasLibres} butacas
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-reserve-main"
              onClick={() => handleReservar('colon-rosario')}
            >
              <span>Reservar Butaca — Colón a Rosario</span>
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
                  {salidaVuelta.butacasLibres} butacas
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-reserve-main"
              style={{ backgroundColor: 'var(--primary)' }}
              onClick={() => handleReservar('rosario-colon')}
            >
              <span>Reservar Butaca — Rosario a Colón</span>
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

      {/* Estrategia de Confianza */}
      <section className="local-trust-section" aria-label="Información del servicio">
        <h3 className="local-trust-title">
          <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>verified</span>
          Un servicio local pensado para nuestra gente
        </h3>

        <div className="local-trust-grid">
          <div className="local-trust-item">
            <div className="local-trust-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>location_city</span>
            </div>
            <div>
              <h4>Somos de Colón</h4>
              <p>Choferes conocidos de la comunidad y trato familiar. Viajá seguro con gente que conocés.</p>
            </div>
          </div>

          <div className="local-trust-item">
            <div className="local-trust-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>door_front</span>
            </div>
            <div>
              <h4>Puerta a Puerta Real en Rosario</h4>
              <p>Te dejamos o buscamos en la puerta de tu domicilio, departamento, facultad o sanatorio, sin caminar de noche.</p>
            </div>
          </div>

          <div className="local-trust-item">
            <div className="local-trust-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>schedule</span>
            </div>
            <div>
              <h4>Horarios Fijos y Salidas Puntuales</h4>
              <p>Sabemos exactamente cuándo salimos y cuándo llegamos, sin rodeos innecesarios.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
