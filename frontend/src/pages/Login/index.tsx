import React from 'react';
import { Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  return (
    <div className="page-container auth-container">
      <div className="badge">Autenticación</div>
      <h1>Iniciar Sesión</h1>
      <p className="subtitle">Ingresá a tu cuenta para gestionar tus viajes y pasajes.</p>

      <div className="card skeleton-card">
        <div className="placeholder-box">
          <p className="muted-text">Formulario de inicio de sesión (próximamente)</p>
        </div>

        <div className="auth-links">
          <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
          <span>•</span>
          <Link to="/registro">¿No tenés cuenta? Registrate</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
