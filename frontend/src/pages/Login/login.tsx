import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth.service.ts';
import { getUser, isAuthenticated } from '../../shared/auth.ts';
import { ApiError } from '../../shared/api.ts';
import './login.css';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Destino post-login: prioridad → state.from (puesto por AdminGuard) →
  // query param ?redirect= → / (home por defecto)
  const fromState = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  const redirect = fromState || searchParams.get('redirect') || null;
  const fromCheckout = redirect?.startsWith('/checkout') ?? false;

  // Función que decide el destino final tras login exitoso
  const destino = (rolUsuario?: string) => {
    if (redirect) return redirect;
    // Si es admin y no hay ruta específica, mandar directo al panel
    if (rolUsuario === 'administrador') return '/admin';
    return '/';
  };

  useEffect(() => {
    if (isAuthenticated()) {
      const rol = getUser()?.rol;
      navigate(destino(rol), { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dni.trim()) {
      setError('El DNI es obligatorio.');
      return;
    }
    if (!password) {
      setError('La contraseña es obligatoria.');
      return;
    }

    setLoading(true);
    try {
      const usuario = await authService.login({ dni: dni.trim(), password });
      navigate(destino(usuario.rol), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('DNI o contraseña incorrectos. Verificá tus datos.');
        } else if (err.status === 422 || err.status === 400) {
          setError(err.message || 'Datos inválidos. Revisá los campos.');
        } else {
          setError('Ocurrió un error al iniciar sesión. Intentá de nuevo.');
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
      <div className="badge">Autenticación</div>
      <h1>Iniciar Sesión</h1>
      <p className="subtitle">Ingresá a tu cuenta para gestionar tus viajes y pasajes.</p>

      {/* Aviso contextual si viene del checkout */}
      {fromCheckout && (
        <div className="auth-info-banner">
          <span className="material-symbols-outlined auth-info-icon">info</span>
          <span>
            Iniciá sesión para completar tu reserva. Una vez ingresado, volverás
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

        {/* Campo DNI */}
        <div className="auth-field">
          <label htmlFor="login-dni" className="auth-label">
            <span className="material-symbols-outlined auth-label-icon">badge</span>
            DNI
          </label>
          <input
            id="login-dni"
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

        {/* Campo Contraseña */}
        <div className="auth-field">
          <label htmlFor="login-password" className="auth-label">
            <span className="material-symbols-outlined auth-label-icon">lock</span>
            Contraseña
          </label>
          <div className="auth-input-wrapper">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Tu contraseña"
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
        </div>

        {/* Link recuperar */}
        <div className="auth-forgot">
          <Link
            to={`/recuperar-password${redirect && redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
            tabIndex={0}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Botón submit */}
        <button
          id="btn-login-submit"
          type="submit"
          className="btn-auth-submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              Ingresando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">login</span>
              Ingresar
            </>
          )}
        </button>

        {/* Links secundarios */}
        <div className="auth-links">
          <span>¿No tenés cuenta?</span>
          <Link
            to={`/registro${redirect && redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
          >
            Registrate
          </Link>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
