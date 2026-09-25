import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getUser, type UsuarioSession } from '../../shared/auth.ts';
import { authService } from '../../services/auth.service.ts';
import './adminLayout.css';

// ── Definición de secciones de navegación ─────────────────────────────────────

interface SeccionNav {
  id: string;
  label: string;
  icono: string;
  ruta: string;
  /** true = implementada; false = placeholder, se muestra con tag "Próximamente" */
  disponible: boolean;
}

const SECCIONES: SeccionNav[] = [
  {
    id: 'transferencias',
    label: 'Transferencias',
    icono: 'receipt_long',
    ruta: '/admin/transferencias',
    disponible: true,
  },
  {
    id: 'morosos',
    label: 'Pasajeros Morosos',
    icono: 'person_off',
    ruta: '/admin/morosos',
    disponible: false,
  },
  {
    id: 'cuentas',
    label: 'Cuentas de Usuario',
    icono: 'manage_accounts',
    ruta: '/admin/cuentas',
    disponible: false,
  },
  {
    id: 'estadisticas',
    label: 'Estadísticas',
    icono: 'bar_chart',
    ruta: '/admin/estadisticas',
    disponible: false,
  },
  {
    id: 'horarios',
    label: 'Horarios',
    icono: 'schedule',
    ruta: '/admin/horarios',
    disponible: false,
  },
  {
    id: 'cupones',
    label: 'Cupones',
    icono: 'local_activity',
    ruta: '/admin/cupones',
    disponible: false,
  },
];

// ── Componente AdminLayout ─────────────────────────────────────────────────────

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UsuarioSession | null>(() => getUser());
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // Sincronizar usuario ante cambios de sesión
  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener('auth-change', sync);
    return () => window.removeEventListener('auth-change', sync);
  }, []);

  const handleLogout = async () => {
    await authService.logout(); // limpia cookie backend + localStorage + dispara auth-change
    navigate('/login', { replace: true });
  };

  const cerrarSidebar = () => setSidebarAbierto(false);

  return (
    <div className="admin-shell">
      {/* ── Overlay móvil ── */}
      {sidebarAbierto && (
        <div
          className="admin-sidebar-overlay"
          onClick={cerrarSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`admin-sidebar ${sidebarAbierto ? 'admin-sidebar--abierto' : ''}`}
        aria-label="Panel de administración"
      >
        {/* Cabecera del sidebar */}
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__brand">
            <div className="admin-sidebar__brand-icon">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <div>
              <span className="admin-sidebar__brand-title">LaTraffic</span>
              <span className="admin-sidebar__brand-sub">Panel Admin</span>
            </div>
          </div>
        </div>

        {/* Perfil del administrador */}
        <div className="admin-sidebar__perfil">
          <div className="admin-sidebar__avatar" aria-hidden="true">
            {user ? user.nombre.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="admin-sidebar__perfil-info">
            <span className="admin-sidebar__perfil-nombre">
              {user ? `${user.nombre} ${user.apellido}` : 'Administrador'}
            </span>
            <span className="admin-sidebar__perfil-rol">Administrador</span>
          </div>
        </div>

        <div className="admin-sidebar__divider" />

        {/* Navegación */}
        <nav className="admin-sidebar__nav" aria-label="Secciones del panel">
          <ul className="admin-sidebar__lista">
            {SECCIONES.map((seccion) => (
              <li key={seccion.id} className="admin-sidebar__item">
                {seccion.disponible ? (
                  <NavLink
                    to={seccion.ruta}
                    id={`nav-admin-${seccion.id}`}
                    className={({ isActive }) =>
                      `admin-sidebar__link ${isActive ? 'admin-sidebar__link--activo' : ''}`
                    }
                    onClick={cerrarSidebar}
                    title={seccion.label}
                  >
                    <span className="material-symbols-outlined admin-sidebar__icono">
                      {seccion.icono}
                    </span>
                    <span className="admin-sidebar__link-label">{seccion.label}</span>
                  </NavLink>
                ) : (
                  <span
                    className="admin-sidebar__link admin-sidebar__link--deshabilitado"
                    title={`${seccion.label} — Próximamente`}
                    aria-disabled="true"
                  >
                    <span className="material-symbols-outlined admin-sidebar__icono">
                      {seccion.icono}
                    </span>
                    <span className="admin-sidebar__link-label">{seccion.label}</span>
                    <span className="admin-sidebar__badge-pronto">Pronto</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin-sidebar__spacer" />

        {/* Pie del sidebar */}
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__divider" />
          <button
            id="btn-admin-logout"
            className="admin-sidebar__logout"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Área principal ── */}
      <div className="admin-main">
        {/* Topbar móvil */}
        <header className="admin-topbar" aria-label="Barra de administración">
          <button
            id="btn-admin-menu"
            className="admin-topbar__menu-btn"
            onClick={() => setSidebarAbierto(!sidebarAbierto)}
            aria-label="Abrir menú de administración"
            aria-expanded={sidebarAbierto}
          >
            <span className="material-symbols-outlined">
              {sidebarAbierto ? 'close' : 'menu'}
            </span>
          </button>

          <div className="admin-topbar__brand">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              admin_panel_settings
            </span>
            Panel Admin
          </div>

          <div className="admin-topbar__user">
            {user && (
              <span className="admin-topbar__avatar" aria-hidden="true">
                {user.nombre.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </header>

        {/* Contenido de la sección activa */}
        <main className="admin-content" id="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
