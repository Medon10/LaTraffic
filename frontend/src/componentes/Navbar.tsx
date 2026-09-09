import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { getUser, isAuthenticated, logout } from '../shared/auth.ts';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const user = getUser();
  const loggedIn = isAuthenticated();

  // Título dinámico o por defecto 'Viajes'
  const getHeaderTitle = () => {
    if (location.pathname.startsWith('/mis-reservas')) return 'Mis Reservas';
    if (location.pathname.startsWith('/login')) return 'Ingresar';
    if (location.pathname.startsWith('/registro')) return 'Registro';
    if (location.pathname.startsWith('/checkout')) return 'Checkout';
    return 'Viajes';
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="brand-section" title="LaTraffic — Colón a Rosario">
          <div className="brand-logo-icon">C</div>
          <span className="brand-title">{getHeaderTitle()}</span>
        </Link>

        {/* Navegación para pantallas de escritorio */}
        <nav className="header-nav-desktop" aria-label="Navegación principal">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'desktop-nav-link active' : 'desktop-nav-link')}>
            Inicio
          </NavLink>
          <NavLink to="/seleccion-viaje" className={({ isActive }) => (isActive ? 'desktop-nav-link active' : 'desktop-nav-link')}>
            Viajes
          </NavLink>
          <NavLink to="/mis-reservas" className={({ isActive }) => (isActive ? 'desktop-nav-link active' : 'desktop-nav-link')}>
            Mis Reservas
          </NavLink>
          {!loggedIn && (
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'desktop-nav-link active' : 'desktop-nav-link')}>
              Ingresar
            </NavLink>
          )}
        </nav>

        {/* Botón de perfil / usuario a la derecha */}
        <div>
          {loggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/mis-reservas" className="header-user-btn" title={`Sesión iniciada como ${user?.nombre || 'Usuario'}`}>
                <div className="user-avatar-fallback">
                  {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                </div>
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
            <Link to="/login" className="header-user-btn" title="Iniciar sesión">
              <img
                alt="Perfil de usuario"
                className="user-avatar"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
