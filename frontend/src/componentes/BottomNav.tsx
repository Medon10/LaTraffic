import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  // Para que 'Viajes' permanezca activo tanto en la home '/' como en '/seleccion-viaje'
  const isViajesActive = location.pathname === '/' || location.pathname.startsWith('/seleccion-viaje');

  return (
    <nav className="bottom-nav" aria-label="Navegación inferior">
      <div className="bottom-nav-container">
        <NavLink
          to="/"
          className={`bottom-nav-item ${isViajesActive ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined">search</span>
          <span>Viajes</span>
        </NavLink>

        <NavLink
          to="/mis-reservas"
          className={({ isActive }) => (isActive ? 'bottom-nav-item active' : 'bottom-nav-item')}
        >
          <span className="material-symbols-outlined">history</span>
          <span>Mis Reservas</span>
        </NavLink>

        <NavLink
          to="/login"
          className={({ isActive }) => (isActive ? 'bottom-nav-item active' : 'bottom-nav-item')}
        >
          <span className="material-symbols-outlined">help_outline</span>
          <span>Ayuda</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
