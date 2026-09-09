import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

type SentidoViaje = 'colon-rosario' | 'rosario-colon';

interface SalidaSemanal {
  id: string;
  fechaFormato: string;
  fechaISO: string;
  hora: string;
  butacasLibres: number;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Sentido del viaje
  const [sentido, setSentido] = useState<SentidoViaje>('colon-rosario');

  // Parada fija (Colón, Hughes, Wheelwright)
  const [paradaFija, setParadaFija] = useState<string>('Colón (Terminal / Base)');

  // Dirección libre en Rosario (Puerta a puerta)
  const [direccionRosario, setDireccionRosario] = useState<string>('');
  const [errorDireccion, setErrorDireccion] = useState<boolean>(false);

  // Calcular las próximas 2 salidas reales según el cronograma fijo semanal
  // Colón -> Rosario: Viernes 18:00 hs
  // Rosario -> Colón: Domingo 21:30 hs
  const salidasDisponibles = useMemo<SalidaSemanal[]>(() => {
    const salidas: SalidaSemanal[] = [];
    const hoy = new Date();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const targetDia = sentido === 'colon-rosario' ? 5 : 0; // 5 = Viernes, 0 = Domingo
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
  }, [sentido]);

  // Salida seleccionada (por defecto la más próxima)
  const [fechaSeleccionadaISO, setFechaSeleccionadaISO] = useState<string>('');
  const salidaActiva =
    salidasDisponibles.find((s) => s.fechaISO === fechaSeleccionadaISO) || salidasDisponibles[0];

  // Manejar el cambio de sentido
  const handleCambiarSentido = (nuevoSentido: SentidoViaje) => {
    setSentido(nuevoSentido);
    setErrorDireccion(false);
  };

  // Enviar a Checkout directamente
  const handleReservar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!direccionRosario.trim()) {
      setErrorDireccion(true);
      return;
    }

    const origen = sentido === 'colon-rosario' ? paradaFija : `Rosario: ${direccionRosario.trim()}`;
    const destino = sentido === 'colon-rosario' ? `Rosario: ${direccionRosario.trim()}` : paradaFija;

    const params = new URLSearchParams({
      sentido,
      origen,
      destino,
      fecha: salidaActiva?.fechaFormato || 'Próxima salida',
      hora: salidaActiva?.hora || '18:00 hs',
      paradaFija,
      direccionRosario: direccionRosario.trim(),
      precio: '9500',
    });

    navigate(`/checkout?${params.toString()}`);
  };

  const esParadaEnRuta = paradaFija.includes('Hughes') || paradaFija.includes('Wheelwright');

  return (
    <div style={{ width: '100%' }}>
      {/* Título y Presentación Local */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="badge" style={{ marginBottom: '0.4rem' }}>
          Servicio Semanal Exclusivo
        </div>
        <h1 style={{ fontSize: '1.65rem', lineHeight: '1.25' }}>Combi Colón &bull; Rosario</h1>
        <p className="subtitle" style={{ marginTop: '0.25rem' }}>
          Viajá directo y seguro. Salidas fijas semanales con servicio puerta a puerta en Rosario.
        </p>
      </div>

      {/* Tarjeta Principal de Reserva Directa */}
      <section className="booking-card" aria-label="Reservar butaca">
        {/* Selector de Sentido de Viaje */}
        <div className="direction-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={sentido === 'colon-rosario'}
            className={`direction-tab-btn ${sentido === 'colon-rosario' ? 'active' : ''}`}
            onClick={() => handleCambiarSentido('colon-rosario')}
          >
            <span className="tab-route">
              Colón <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span> Rosario
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
              Rosario <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span> Colón
            </span>
            <span className="tab-desc">Te buscamos en tu domicilio</span>
          </button>
        </div>

        {/* Detalle de la Próxima Salida Real */}
        {salidaActiva && (
          <div className="next-departure-box">
            <div className="departure-box-header">
              <span className="departure-tag">Próxima salida programada</span>
              <span className="departure-seats-badge">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>airline_seat_recline_extra</span>
                {salidaActiva.butacasLibres} butacas libres
              </span>
            </div>

            <div className="departure-main-info">
              <div>
                <div className="departure-datetime">
                  {salidaActiva.fechaFormato}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '2px' }}>
                  Salida puntual {salidaActiva.hora}
                </div>
              </div>

              <div>
                <div className="departure-price">$9.500</div>
                <div className="departure-price-sub">pasaje nominativo</div>
              </div>
            </div>

            {/* Alternar fecha si viaja la próxima semana */}
            {salidasDisponibles.length > 1 && (
              <div className="departure-date-selector">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--outline)', alignSelf: 'center' }}>
                  Fecha:
                </span>
                {salidasDisponibles.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`date-chip ${s.fechaISO === (salidaActiva?.fechaISO) ? 'selected' : ''}`}
                    onClick={() => setFechaSeleccionadaISO(s.fechaISO)}
                  >
                    {idx === 0 ? 'Esta semana' : 'Próx. semana'} ({s.fechaFormato.split(' ')[0]} {s.fechaFormato.split(' ')[1]})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleReservar}>
          <div className="trip-stops-group">
            {sentido === 'colon-rosario' ? (
              <>
                {/* 1. Origen en Colón / pueblos intermedios (punto fijo de catálogo) */}
                <div className="stop-field-box">
                  <div className="stop-field-header">
                    <span className="material-symbols-outlined">trip_origin</span>
                    <span>1. Punto de subida (Punto Fijo)</span>
                  </div>
                  <select
                    value={paradaFija}
                    onChange={(e) => setParadaFija(e.target.value)}
                    className="stop-select"
                  >
                    <option value="Colón (Terminal / Base)">Colón &mdash; Terminal / Base</option>
                    <option value="Hughes (Parada en ruta)">Hughes &mdash; Parada sobre Ruta 8</option>
                    <option value="Wheelwright (Parada en ruta)">Wheelwright &mdash; Parada sobre Ruta 8</option>
                  </select>

                  {esParadaEnRuta && (
                    <div className="stop-note">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                      Punto de encuentro fijo al costado de la ruta (no es puerta a puerta).
                    </div>
                  )}
                </div>

                {/* 2. Destino en Rosario (domicilio libre) */}
                <div className="stop-field-box" style={{ borderColor: errorDireccion ? 'var(--error)' : undefined }}>
                  <div className="stop-field-header">
                    <span className="material-symbols-outlined">home_pin</span>
                    <span>2. ¿Dónde te dejamos en Rosario? (Puerta a Puerta)</span>
                  </div>
                  <input
                    type="text"
                    value={direccionRosario}
                    onChange={(e) => {
                      setDireccionRosario(e.target.value);
                      if (errorDireccion) setErrorDireccion(false);
                    }}
                    placeholder="Calle, altura, piso o lugar (ej: Pellegrini 1450 / Fac. Medicina)"
                    className="stop-address-input"
                  />
                  {errorDireccion && (
                    <div style={{ color: 'var(--error)', fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>
                      Por favor, ingresá la dirección de entrega en Rosario.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* 1. Origen en Rosario (domicilio libre) */}
                <div className="stop-field-box" style={{ borderColor: errorDireccion ? 'var(--error)' : undefined }}>
                  <div className="stop-field-header">
                    <span className="material-symbols-outlined">home_pin</span>
                    <span>1. ¿Dónde te buscamos en Rosario? (Puerta a Puerta)</span>
                  </div>
                  <input
                    type="text"
                    value={direccionRosario}
                    onChange={(e) => {
                      setDireccionRosario(e.target.value);
                      if (errorDireccion) setErrorDireccion(false);
                    }}
                    placeholder="Calle, altura, piso/depto (ej: San Lorenzo 1120)"
                    className="stop-address-input"
                  />
                  {errorDireccion && (
                    <div style={{ color: 'var(--error)', fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>
                      Por favor, ingresá la dirección donde te buscamos en Rosario.
                    </div>
                  )}
                </div>

                {/* 2. Destino en Colón / pueblos intermedios (punto fijo de catálogo) */}
                <div className="stop-field-box">
                  <div className="stop-field-header">
                    <span className="material-symbols-outlined">location_on</span>
                    <span>2. Punto de bajada (Punto Fijo)</span>
                  </div>
                  <select
                    value={paradaFija}
                    onChange={(e) => setParadaFija(e.target.value)}
                    className="stop-select"
                  >
                    <option value="Colón (Terminal / Base)">Colón &mdash; Terminal / Base</option>
                    <option value="Hughes (Parada en ruta)">Hughes &mdash; Parada sobre Ruta 8</option>
                    <option value="Wheelwright (Parada en ruta)">Wheelwright &mdash; Parada sobre Ruta 8</option>
                  </select>

                  {esParadaEnRuta && (
                    <div className="stop-note">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                      Descenso sobre la ruta en el punto de encuentro convenido.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Botón Principal de Reserva Directa */}
          <button type="submit" className="btn-reserve-main">
            <span>Reservar mi Butaca &bull; $9.500</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </form>
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

      {/* Estrategia de Confianza Real y Cercanía */}
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
