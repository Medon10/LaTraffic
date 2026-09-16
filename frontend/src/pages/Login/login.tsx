import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './login.css';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const fromCheckout = redirect.startsWith('/checkout');

  return (
    <div className="page-container auth-container">
      <div className="badge">Autenticación</div>
      <h1>Iniciar Sesión</h1>
      <p className="subtitle">Ingresá a tu cuenta para gestionar tus viajes y pasajes.</p>

      {/* Aviso contextual si viene del checkout */}
      {fromCheckout && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'var(--secondary-fixed)',
            border: '1px solid var(--secondary-fixed-dim)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--on-secondary-container)',
            fontWeight: 500,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px', color: 'var(--secondary)', flexShrink: 0 }}
          >
            info
          </span>
          <span>
            Iniciá sesión para completar tu reserva. Una vez ingresado, volverás
            automáticamente al paso de confirmación.
          </span>
        </div>
      )}

      <div className="card skeleton-card">
        <div className="placeholder-box">
          <p className="muted-text">
            Formulario de inicio de sesión (próximamente)
            {redirect && (
              <>
                {' '}
                — redirigirá a{' '}
                <code style={{ fontSize: '0.8em' }}>{redirect}</code>
              </>
            )}
          </p>
        </div>

        <div className="auth-links">
          <Link
            to={`/recuperar-password${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <span>•</span>
          <Link
            to={`/registro${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
          >
            ¿No tenés cuenta? Registrate
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
