import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service.ts';
import { isAuthenticated } from '../../shared/auth.ts';
import { ApiError } from '../../shared/api.ts';
import '../Login/login.css';
import './registro.css';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getPasswordStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) || /[^a-zA-Z0-9]/.test(pwd)) score++;
  return score as 0 | 1 | 2 | 3;
}

const strengthLabel = ['', 'Débil', 'Regular', 'Fuerte'] as const;
const strengthClass = ['', 'weak', 'medium', 'strong'] as const;

/* ── Componente ──────────────────────────────────────────────────────────── */

export const RegistroPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect') || '/';
  const fromCheckout = redirect.startsWith('/checkout');

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(redirect, { replace: true });
    }
  }, [redirect, navigate]);

  // Campos
  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Estado
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = getPasswordStrength(password);
  const passwordsMatch = !confirmPassword || password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones client-side
    if (!dni.trim()) return setError('El DNI es obligatorio.');
    if (!/^\d{6,20}$/.test(dni.trim())) return setError('El DNI debe contener solo números (6-20 dígitos).');
    if (!nombre.trim()) return setError('El nombre es obligatorio.');
    if (!apellido.trim()) return setError('El apellido es obligatorio.');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Ingresá un email válido.');
    }
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');

    setLoading(true);
    try {
      await authService.registro({
        dni: dni.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate(redirect, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Ya existe una cuenta con ese DNI o email. ¿Querés iniciar sesión?');
        } else if (err.status === 422 || err.status === 400) {
          // Mostrar el primer error de validación del servidor
          const firstFieldError = err.data?.errors
            ? Object.values(err.data.errors).flat()[0]
            : null;
          setError(firstFieldError || err.message || 'Datos inválidos. Revisá los campos.');
        } else {
          setError('Ocurrió un error al registrarse. Intentá de nuevo.');
        }
      } else {
        setError('No se pudo conectar con el servidor. Verificá tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container auth-container">
      <div className="badge">Registro</div>
      <h1>Crear Cuenta</h1>
      <p className="subtitle">Registrate con tu DNI para comprar pasajes y acceder a promociones.</p>

      {/* Aviso contextual si viene del checkout */}
      {fromCheckout && (
        <div className="auth-info-banner">
          <span className="material-symbols-outlined auth-info-icon">info</span>
          <span>
            Creá tu cuenta para completar la reserva. Una vez registrado, volverás
            automáticamente al paso de confirmación.
          </span>
        </div>
      )}

      <form className="auth-card card" onSubmit={handleSubmit} noValidate>

        {/* Error global */}
        {error && (
          <div className="auth-error-banner" role="alert">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>
              error
            </span>
            <span>{error}</span>
          </div>
        )}

        {/* DNI */}
        <div className="auth-field">
          <label htmlFor="reg-dni" className="auth-label">
            <span className="material-symbols-outlined auth-label-icon">badge</span>
            DNI
          </label>
          <input
            id="reg-dni"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            placeholder="Ej.: 40123456"
            className="auth-input"
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            maxLength={20}
            disabled={loading}
            required
          />
        </div>

        {/* Nombre y Apellido */}
        <div className="auth-fields-row">
          <div className="auth-field">
            <label htmlFor="reg-nombre" className="auth-label">
              <span className="material-symbols-outlined auth-label-icon">person</span>
              Nombre
            </label>
            <input
              id="reg-nombre"
              type="text"
              autoComplete="given-name"
              placeholder="Ej.: Juan"
              className="auth-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={100}
              disabled={loading}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="reg-apellido" className="auth-label">
              <span className="material-symbols-outlined auth-label-icon">person</span>
              Apellido
            </label>
            <input
              id="reg-apellido"
              type="text"
              autoComplete="family-name"
              placeholder="Ej.: Pérez"
              className="auth-input"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              maxLength={100}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="auth-field">
          <label htmlFor="reg-email" className="auth-label">
            <span className="material-symbols-outlined auth-label-icon">email</span>
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={150}
            disabled={loading}
            required
          />
        </div>

        {/* Contraseña */}
        <div className="auth-field">
          <label htmlFor="reg-password" className="auth-label">
            <span className="material-symbols-outlined auth-label-icon">lock</span>
            Contraseña
          </label>
          <div className="auth-input-wrapper">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              className="auth-input auth-input-has-toggle"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="auth-toggle-password"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              tabIndex={-1}
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {/* Barra de fortaleza */}
          {password && (
            <>
              <div className="auth-strength-bar" aria-hidden="true">
                {[1, 2, 3].map((lvl) => (
                  <div
                    key={lvl}
                    className={`auth-strength-segment${strength >= lvl ? ` active-${strengthClass[strength]}` : ''}`}
                  />
                ))}
              </div>
              <span className={`auth-strength-label ${strengthClass[strength]}`}>
                Contraseña {strengthLabel[strength]}
              </span>
            </>
          )}
        </div>

        {/* Confirmar Contraseña */}
        <div className="auth-field">
          <label htmlFor="reg-confirm" className="auth-label">
            <span className="material-symbols-outlined auth-label-icon">lock_reset</span>
            Confirmar Contraseña
          </label>
          <div className="auth-input-wrapper">
            <input
              id="reg-confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repetí tu contraseña"
              className={`auth-input auth-input-has-toggle${!passwordsMatch ? ' auth-input-error' : ''}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="auth-toggle-password"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              tabIndex={-1}
            >
              <span className="material-symbols-outlined">
                {showConfirm ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          {!passwordsMatch && (
            <span className="auth-field-hint" style={{ color: 'var(--error)' }}>
              Las contraseñas no coinciden
            </span>
          )}
        </div>

        {/* Botón submit */}
        <button
          id="btn-registro-submit"
          type="submit"
          className="btn-auth-submit"
          disabled={loading || !passwordsMatch}
        >
          {loading ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              Creando cuenta...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">person_add</span>
              Crear Cuenta
            </>
          )}
        </button>

        {/* Link a login */}
        <div className="auth-links">
          <span>¿Ya tenés cuenta?</span>
          <Link
            to={`/login${redirect && redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
          >
            Iniciar Sesión
          </Link>
        </div>
      </form>
    </div>
  );
};

export default RegistroPage;
