import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { getUser, isAuthenticated, logout } from '../shared/auth.ts';

export const Navbar: React.FC = () => {
  const user = getUser();
  const loggedIn = isAuthenticated();

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="brand-section" title="LaTraffic — Colón a Rosario">
          <div className="brand-logo-icon">C</div>
          <span className="brand-title">LaTraffic</span>
        </Link>

        {/* Navegación para pantallas de escritorio */}
        <nav className="header-nav-desktop" aria-label="Navegación principal">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'desktop-nav-link active' : 'desktop-nav-link')}>
            Inicio
          </NavLink>
          <NavLink to="/mis-reservas" className={({ isActive }) => (isActive ? 'desktop-nav-link active' : 'desktop-nav-link')}>
            Mis Reservas
          </NavLink>
        </nav>

        {/* Botones de autenticación / usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {loggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Link to="/mis-reservas" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                <div className="user-avatar-fallback">
                  {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="desktop-only-text" style={{ fontSize: '0.85rem' }}>{user?.nombre}</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="btn btn-outline"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                to="/login"
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem', fontWeight: 600 }}
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/registro"
                className="btn btn-primary desktop-only-flex"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem', fontWeight: 600 }}
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
