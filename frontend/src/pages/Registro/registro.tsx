import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './registro.css';

export const RegistroPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const fromCheckout = redirect.startsWith('/checkout');

  return (
    <div className="page-container auth-container">
      <div className="badge">Registro</div>
      <h1>Crear Cuenta</h1>
      <p className="subtitle">Registrate con tu DNI para comprar pasajes y acceder a promociones.</p>

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
            Creá tu cuenta para completar la reserva. Una vez registrado, volverás
            automáticamente al paso de confirmación.
          </span>
        </div>
      )}

      <div className="card skeleton-card">
        <div className="placeholder-box">
          <p className="muted-text">
            Formulario de registro con validación de DNI (próximamente)
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
            to={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
          >
            ¿Ya tenés cuenta? Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegistroPage;
