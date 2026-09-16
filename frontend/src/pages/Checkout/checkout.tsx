import React from 'react';
import { Link } from 'react-router-dom';
import { isAuthenticated, getUser } from '../../shared/auth.ts';
import { useCheckout } from '../../hooks/useCheckout.ts';
import { StopField, PriceSummary } from '../../componentes/ui/index.ts';
import './checkout.css';

// ── Auth Gate ─────────────────────────────────────────────────────────────────

const AuthGate: React.FC<{ redirectUrl: string }> = ({ redirectUrl }) => {
  return (
    <div className="page-container">
      <div className="badge">Paso Final</div>
      <h1>Confirmación de Reserva</h1>
      <p className="subtitle">
        Para completar tu reserva necesitás tener una cuenta. Es rápido y gratuito.
      </p>

      {/* Panel de acción */}
      <div
        className="card"
        style={{
          borderLeft: '4px solid var(--secondary)',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginBottom: '0.5rem',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: 'var(--secondary)', fontSize: '28px' }}
          >
            lock
          </span>
          <div>
            <div
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'var(--primary)',
              }}
            >
              Ingresá para confirmar
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                color: 'var(--on-surface-variant)',
                marginTop: '2px',
              }}
            >
              Tu reserva quedará guardada con tu cuenta.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
          <Link
            to={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
            className="btn btn-primary"
            id="btn-auth-gate-login"
            style={{ justifyContent: 'center', height: '48px', fontSize: '0.975rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              login
            </span>
            Iniciar sesión
          </Link>

          <Link
            to={`/registro?redirect=${encodeURIComponent(redirectUrl)}`}
            className="btn btn-outline"
            id="btn-auth-gate-registro"
            style={{ justifyContent: 'center', height: '48px', fontSize: '0.975rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              person_add
            </span>
            Crear cuenta nueva
          </Link>
        </div>

        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--outline)',
            textAlign: 'center',
            marginTop: '0.25rem',
          }}
        >
          ¿Preferís reservar por WhatsApp?{' '}
          <a
            href="https://wa.me/5493460XXXXXX"
            style={{ color: 'var(--whatsapp-dark)', fontWeight: 600 }}
          >
            Contactanos
          </a>
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link
          to="/seleccion-viaje"
          style={{
            fontSize: '0.85rem',
            color: 'var(--on-surface-variant)',
            textDecoration: 'underline',
          }}
        >
          ← Volver a la selección de viaje
        </Link>
      </div>
    </div>
  );
};

// ── Checkout Page ─────────────────────────────────────────────────────────────

export const CheckoutPage: React.FC = () => {
  const checkout = useCheckout();

  if (!isAuthenticated()) {
    return <AuthGate redirectUrl={checkout.redirectUrl} />;
  }

  const user = getUser();
  const {
    esColonRosario,
    fecha,
    hora,
    precio,
    paradaFija,
    paradaOrigenLabel,
    labelDireccion,
    placeholderDir,
    direccionRosario,
    setDireccionRosario,
    errorDir,
    setErrorDir,
    loading,
    handleConfirmar,
  } = checkout;

  return (
    <div className="page-container">
      <div className="badge">Paso Final</div>
      <h1>Confirmación de Reserva</h1>
      <p className="subtitle">
        Revisá los datos de tu viaje y confirmá tu lugar.
      </p>

      {/* Saludo personalizado */}
      <div
        className="card"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: 'linear-gradient(135deg, var(--surface-container-low) 0%, #ffffff 100%)',
        }}
      >
        <div
          className="user-avatar-fallback"
          style={{ width: 40, height: 40, fontSize: '1rem', flexShrink: 0 }}
        >
          {user?.nombre?.charAt(0).toUpperCase() ?? '?'}
          {user?.apellido?.charAt(0).toUpperCase() ?? ''}
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>
            {user?.nombre} {user?.apellido}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
            {user?.email}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span
            className="material-symbols-outlined"
            style={{ color: 'var(--success)', fontSize: '22px' }}
          >
            verified_user
          </span>
        </div>
      </div>

      {/* Resumen del pasaje */}
      <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Viaje programado · 1 butaca
            </div>
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--primary)',
                marginTop: '2px',
              }}
            >
              {esColonRosario ? 'Colón → Rosario' : 'Rosario → Colón'}
            </div>
            <div
              style={{
                fontSize: '0.875rem',
                color: 'var(--on-surface-variant)',
                marginTop: '2px',
              }}
            >
              {fecha} · Salida {hora}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--outline)',
              }}
            >
              Precio base
            </div>
            <div
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--secondary)',
              }}
            >
              ${Number(precio).toLocaleString('es-AR')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--outline)' }}>por butaca</div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--surface-variant)',
            paddingTop: '0.65rem',
            marginTop: '0.25rem',
            fontSize: '0.82rem',
            color: 'var(--on-surface-variant)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: 'var(--whatsapp-color)', fontSize: '17px' }}
          >
            check_circle
          </span>
          <span>Servicio puerta a puerta garantizado en Rosario.</span>
        </div>
      </div>

      {/* Formulario HU-07: solo parada y domicilio */}
      <form onSubmit={handleConfirmar} noValidate>
        <div className="booking-card" style={{ marginBottom: '1rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--secondary)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              route
            </span>
            Datos del trayecto
          </div>

          <div className="trip-stops-group">
            {/* Campo 1: Parada fija (no re-preguntada) */}
            <StopField icon="trip_origin" label={paradaOrigenLabel}>
              {paradaFija ? (
                <div
                  style={{
                    fontSize: '0.975rem',
                    fontWeight: 600,
                    color: 'var(--on-surface)',
                    paddingTop: '2px',
                  }}
                >
                  {paradaFija}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--outline)',
                    fontStyle: 'italic',
                  }}
                >
                  No disponible — volvé a la selección de viaje.
                </div>
              )}
            </StopField>

            {/* Campo 2: Domicilio en Rosario */}
            <StopField
              icon="home_pin"
              label={labelDireccion}
              hasError={errorDir}
              errorMessage="Ingresá el domicilio en Rosario para continuar."
            >
              <input
                id="input-domicilio-rosario"
                type="text"
                className="stop-address-input"
                value={direccionRosario}
                onChange={(e) => {
                  setDireccionRosario(e.target.value);
                  if (errorDir) setErrorDir(false);
                }}
                placeholder={placeholderDir}
                autoComplete="street-address"
                required
              />
            </StopField>
          </div>

          {/* Nota de datos personales */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.775rem',
              color: 'var(--on-surface-variant)',
              padding: '0.5rem 0.65rem',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', color: 'var(--secondary)' }}
            >
              info
            </span>
            Tus datos personales (nombre, apellido y DNI) ya están registrados en tu cuenta.
          </div>
        </div>

        {/* Métodos de pago (HU-08/09/10 — próxima iteración) */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
            Método de Pago
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            Podés abonar mediante transferencia con descuento, efectivo al subir o Mercado Pago.
          </p>
          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--outline)',
              fontStyle: 'italic',
            }}
          >
            Selección de método de pago disponible próximamente (HU-08 / HU-09 / HU-10).
          </div>
        </div>

        {/* Resumen de precio y CTAs */}
        <PriceSummary
          title="Total a pagar"
          subtitle="Descuentos por cupón o medio de pago en el paso de pago"
          amount={precio}
          style={{ marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <button
            id="btn-confirmar-reserva"
            type="submit"
            className="btn-reserve-main"
            disabled={loading}
            style={{ opacity: loading ? 0.75 : 1 }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  hourglass_empty
                </span>
                Procesando…
              </>
            ) : (
              <>
                <span>Confirmar y Pagar · ${Number(precio).toLocaleString('es-AR')}</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>

          <Link
            to="/seleccion-viaje"
            className="btn btn-outline"
            style={{ justifyContent: 'center' }}
            id="btn-volver-seleccion"
          >
            ← Modificar selección de viaje
          </Link>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
