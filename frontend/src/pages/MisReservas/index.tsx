import React from 'react';
import { Link } from 'react-router-dom';

export const MisReservasPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="badge">Mis Viajes</div>
      <h1>Mis Reservas</h1>
      <p className="subtitle">Consultá el historial de tus pasajes, estados de pago y pasajes activos.</p>

      <div className="card skeleton-card">
        <div className="placeholder-box">
          <p className="muted-text">Listado de pasajes reservados y comprobantes (próximamente)</p>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Link to="/seleccion-viaje" className="btn btn-primary">Reservar nuevo viaje &rarr;</Link>
        </div>
      </div>
    </div>
  );
};

export default MisReservasPage;
