import React from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="badge">Inicio</div>
      <h1>Combi Colón — Rosario</h1>
      <p className="subtitle">
        Sistema de reserva y venta de pasajes para traffic entre Colón y Rosario.
      </p>

      <div className="card-grid">
        <div className="card">
          <h3>Buscar Viajes</h3>
          <p>Consultá horarios disponibles y seleccioná tus paradas.</p>
          <Link to="/seleccion-viaje" className="btn btn-primary">
            Seleccionar Viaje &rarr;
          </Link>
        </div>

        <div className="card">
          <h3>Mis Reservas</h3>
          <p>Gestioná tus pasajes reservados y comprobantes de pago.</p>
          <Link to="/mis-reservas" className="btn btn-secondary">
            Ver mis reservas &rarr;
          </Link>
        </div>

        <div className="card">
          <h3>Acceso Pasajeros</h3>
          <p>Ingresá con tu cuenta para acceder a promociones y agilizar tu compra.</p>
          <Link to="/login" className="btn btn-outline">
            Iniciar Sesión &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
