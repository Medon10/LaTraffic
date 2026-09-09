import React from 'react';
import { Link } from 'react-router-dom';

export const RegistroPage: React.FC = () => {
  return (
    <div className="page-container auth-container">
      <div className="badge">Registro</div>
      <h1>Crear Cuenta</h1>
      <p className="subtitle">Registrate con tu DNI para comprar pasajes y acceder a promociones.</p>

      <div className="card skeleton-card">
        <div className="placeholder-box">
          <p className="muted-text">Formulario de registro con validación de DNI (próximamente)</p>
        </div>

        <div className="auth-links">
          <Link to="/login">¿Ya tenés cuenta? Iniciar Sesión</Link>
        </div>
      </div>
    </div>
  );
};

export default RegistroPage;
