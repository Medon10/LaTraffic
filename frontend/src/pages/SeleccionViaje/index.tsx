import React from 'react';
import { Link } from 'react-router-dom';

export const SeleccionViajePage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="badge">Paso 1</div>
      <h1>Selección de Viaje</h1>
      <p className="subtitle">
        Elegí fecha, sentido (Colón &harr; Rosario), paradas y verificá cupos disponibles en tiempo real.
      </p>

      <div className="card skeleton-card">
        <div className="placeholder-box">
          <p className="muted-text">Selector de fecha, sentido y listado de horarios disponibles con cupos (próximamente)</p>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Link to="/" className="btn btn-outline">&larr; Inicio</Link>
          <Link to="/checkout" className="btn btn-primary">Continuar al Checkout &rarr;</Link>
        </div>
      </div>
    </div>
  );
};

export default SeleccionViajePage;
