import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [tripType, setTripType] = useState<'ida' | 'ida-vuelta'>('ida');
  const [origen, setOrigen] = useState<string>('Colón (Base)');
  const [destino, setDestino] = useState<string>('Rosario (Domicilio)');
  const [fecha, setFecha] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [pasajeros, setPasajeros] = useState<number>(1);

  // Intercambiar Origen y Destino
  const handleSwapDirections = () => {
    setOrigen(destino);
    setDestino(origen);
  };

  // Manejar el submit de la búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      tipo: tripType,
      origen,
      destino,
      fecha,
      pasajeros: pasajeros.toString(),
    });
    navigate(`/seleccion-viaje?${params.toString()}`);
  };

  // Formato amigable de la fecha para mostrar ("Hoy, 24 Oct")
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Elegir fecha';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const formatted = `${d.getDate()} ${monthNames[d.getMonth()]}`;
    return isToday ? `Hoy, ${formatted}` : formatted;
  };

  return (
    <div className="home-container" style={{ width: '100%' }}>
      {/* Tarjeta de Búsqueda */}
      <section className="search-card" aria-label="Búsqueda de pasajes">
        <div className="search-card-header">
          <h2 className="search-card-title">Buscar Viaje</h2>
          <div className="trip-type-toggle">
            <button
              type="button"
              className={`trip-type-btn ${tripType === 'ida' ? 'active' : ''}`}
              onClick={() => setTripType('ida')}
            >
              Ida
            </button>
            <button
              type="button"
              className={`trip-type-btn ${tripType === 'ida-vuelta' ? 'active' : ''}`}
              onClick={() => setTripType('ida-vuelta')}
            >
              Ida y Vuelta
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch}>
          {/* Contenedor de Origen y Destino con botón de intercambio */}
          <div className="direction-container">
            {/* Origen */}
            <div className="direction-row">
              <span className="material-symbols-outlined">my_location</span>
              <div className="direction-field">
                <label htmlFor="select-origen" className="field-label">
                  Origen
                </label>
                <select
                  id="select-origen"
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  className="direction-select"
                >
                  <option value="Colón (Base)">Colón (Base)</option>
                  <option value="Rosario (Domicilio)">Rosario (Domicilio)</option>
                  <option value="Hughes">Hughes</option>
                  <option value="Wheelwright">Wheelwright</option>
                </select>
              </div>
            </div>

            {/* Botón intercambiador centrado */}
            <button
              type="button"
              onClick={handleSwapDirections}
              className="swap-btn"
              title="Invertir origen y destino"
              aria-label="Invertir origen y destino"
            >
              <span className="material-symbols-outlined">swap_vert</span>
            </button>

            <div className="direction-divider" />

            {/* Destino */}
            <div className="direction-row">
              <span className="material-symbols-outlined">location_on</span>
              <div className="direction-field">
                <label htmlFor="select-destino" className="field-label">
                  Destino
                </label>
                <select
                  id="select-destino"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="direction-select"
                >
                  <option value="Rosario (Domicilio)">Rosario (Domicilio)</option>
                  <option value="Colón (Base)">Colón (Base)</option>
                  <option value="Hughes">Hughes</option>
                  <option value="Wheelwright">Wheelwright</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fecha y Pasajeros */}
          <div className="search-details-row">
            {/* Fecha */}
            <div className="detail-card detail-card-date">
              <span className="material-symbols-outlined">calendar_month</span>
              <div style={{ flex: 1 }}>
                <label htmlFor="input-fecha" className="field-label">
                  Fecha
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--on-surface)' }}>
                    {formatDisplayDate(fecha)}
                  </div>
                  <input
                    id="input-fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Pasajeros */}
            <div className="detail-card detail-card-passengers">
              <span className="material-symbols-outlined">person</span>
              <div>
                <label htmlFor="select-pasajeros" className="field-label">
                  Paj.
                </label>
                <select
                  id="select-pasajeros"
                  value={pasajeros}
                  onChange={(e) => setPasajeros(Number(e.target.value))}
                  className="detail-input"
                  style={{ cursor: 'pointer', appearance: 'none' }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
            </div>
          </div>

          {/* Botón Principal de Búsqueda */}
          <button type="submit" className="btn-search">
            <span className="material-symbols-outlined">search</span>
            Buscar Viajes
          </button>
        </form>
      </section>

      {/* Sección: ¿Por qué viajar con nosotros? */}
      <section className="benefits-section" aria-label="Beneficios del servicio">
        <h3 className="section-title">¿Por qué viajar con nosotros?</h3>
        <div className="benefits-grid">
          {/* Seguridad */}
          <div className="benefit-card">
            <div className="benefit-icon-circle primary">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <span className="benefit-label">Seguridad</span>
          </div>

          {/* Puntualidad */}
          <div className="benefit-card">
            <div className="benefit-icon-circle secondary">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <span className="benefit-label">Puntualidad</span>
          </div>

          {/* Comodidad */}
          <div className="benefit-card">
            <div className="benefit-icon-circle tertiary">
              <span className="material-symbols-outlined">airline_seat_recline_extra</span>
            </div>
            <span className="benefit-label">Comodidad</span>
          </div>
        </div>
      </section>

      {/* Banner Teaser con imagen de la combi y ruta */}
      <div className="teaser-banner">
        <div
          className="teaser-banner-bg"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80')`,
          }}
          role="img"
          aria-label="Combi ejecutiva en viaje por ruta argentina"
        />
        <div className="teaser-banner-overlay" />
        <div className="teaser-banner-content">
          <div className="teaser-banner-title">Conectando Colón y Rosario</div>
          <p className="teaser-banner-subtitle">Servicio puerta a puerta disponible.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
