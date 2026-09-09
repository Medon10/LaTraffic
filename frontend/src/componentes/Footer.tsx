import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="brand-logo-icon" style={{ width: '28px', height: '28px', fontSize: '0.95rem' }}>C</div>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>LaTraffic</span>
          <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem' }}>&bull; Colón &mdash; Rosario</span>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
          <Link to="/" style={{ color: 'var(--on-surface-variant)' }}>Inicio</Link>
          <Link to="/seleccion-viaje" style={{ color: 'var(--on-surface-variant)' }}>Viajes</Link>
          <Link to="/mis-reservas" style={{ color: 'var(--on-surface-variant)' }}>Mis Reservas</Link>
          <Link to="/login" style={{ color: 'var(--on-surface-variant)' }}>Acceso</Link>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--outline)' }}>
            &copy; {new Date().getFullYear()} LaTraffic. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
