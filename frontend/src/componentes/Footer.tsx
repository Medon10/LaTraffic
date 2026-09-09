import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-col">
          <div className="footer-brand">
            <span className="brand-icon">🚐</span>
            <span className="brand-name">LaTraffic</span>
          </div>
          <p className="footer-description">
            Servicio de transporte interurbano entre Colón y Rosario.
          </p>
        </div>

        <div className="footer-col">
          <h4>Navegación</h4>
          <ul className="footer-links">
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/seleccion-viaje">Seleccionar Viaje</Link></li>
            <li><Link to="/mis-reservas">Mis Reservas</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Cuenta</h4>
          <ul className="footer-links">
            <li><Link to="/login">Iniciar Sesión</Link></li>
            <li><Link to="/registro">Crear Cuenta</Link></li>
            <li><Link to="/recuperar-password">Recuperar Contraseña</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} LaTraffic. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
