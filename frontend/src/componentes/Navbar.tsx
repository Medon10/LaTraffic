import React from 'react';
import { NavLink, Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🚐</span>
          <span className="brand-name">LaTraffic</span>
          <span className="brand-tag">Colón &bull; Rosario</span>
        </Link>

        <nav className="navbar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Inicio
          </NavLink>
          <NavLink
            to="/seleccion-viaje"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Viajes
          </NavLink>
          <NavLink
            to="/mis-reservas"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Mis Reservas
          </NavLink>
        </nav>

        <div className="navbar-actions">
          <NavLink
            to="/login"
            className={({ isActive }) => (isActive ? 'btn btn-outline active' : 'btn btn-outline')}
          >
            Ingresar
          </NavLink>
          <NavLink to="/registro" className="btn btn-primary">
            Registrarse
          </NavLink>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
