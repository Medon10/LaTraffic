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

  const esAdmin = user?.rol === 'administrador';

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
          {/* Link al panel admin — solo visible para administradores */}
          {esAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => (isActive ? 'desktop-nav-link active' : 'desktop-nav-link')}
              style={{
                color: 'var(--secondary)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17, verticalAlign: 'middle' }}>
                admin_panel_settings
              </span>
              Panel Admin
            </NavLink>
          )}
        </nav>

        {/* Botones de autenticación / usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {loggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* Acceso rápido al panel admin en mobile (solo admins) */}
              {esAdmin && (
                <Link
                  to="/admin"
                  id="btn-ir-admin"
                  className="btn-admin-chip"
                  title="Ir al Panel de Administración"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    admin_panel_settings
                  </span>
                  <span className="desktop-only-text">Admin</span>
                </Link>
              )}
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
