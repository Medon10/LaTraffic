import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { getUser, isAuthenticated, type UsuarioSession } from '../shared/auth.ts';
import { authService } from '../services/auth.service.ts';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<UsuarioSession | null>(() => getUser());
  const [loggedIn, setLoggedIn] = useState<boolean>(() => isAuthenticated());

  // Actualizar ante cambios de ruta
  useEffect(() => {
    setUser(getUser());
    setLoggedIn(isAuthenticated());
  }, [location]);

  // Actualizar en tiempo real ante login / logout
  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getUser());
      setLoggedIn(isAuthenticated());
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

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
                <span>{user?.nombre}</span>
              </Link>
              <button
                onClick={handleLogout}
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
