import React from 'react';
import { Link } from 'react-router-dom';

export const CheckoutPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="badge">Paso 2</div>
      <h1>Checkout & Pago</h1>
      <p className="subtitle">
        Confirmá los datos del pasaje y elegí tu método de pago (Mercado Pago, Transferencia o Efectivo).
      </p>

      <div className="card skeleton-card">
        <div className="placeholder-box">
          <p className="muted-text">Resumen de reserva, retención de cupo (hold 15 min) e integración de pago (próximamente)</p>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Link to="/seleccion-viaje" className="btn btn-outline">&larr; Volver a selección</Link>
          <Link to="/mis-reservas" className="btn btn-primary">Ir a Mis Reservas &rarr;</Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
