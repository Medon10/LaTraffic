import React from 'react';
import { Link } from 'react-router-dom';

export const RecuperarPasswordPage: React.FC = () => {
  return (
    <div className="page-container auth-container">
      <div className="badge">Seguridad</div>
      <h1>Recuperar Contraseña</h1>
      <p className="subtitle">Te enviaremos las instrucciones para restablecer tu contraseña.</p>

      <div className="card skeleton-card">
        <div className="placeholder-box">
          <p className="muted-text">Formulario de recuperación por email (próximamente)</p>
        </div>

        <div className="auth-links">
          <Link to="/login">&larr; Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
};

export default RecuperarPasswordPage;
