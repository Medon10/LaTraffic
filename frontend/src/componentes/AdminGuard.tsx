import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUser, isAuthenticated } from '../shared/auth.ts';

/**
 * Guard que protege todas las rutas bajo /admin/*.
 *
 * - Sin sesión → redirige a /login (con state para volver después).
 * - Con sesión pero rol !== 'administrador' → redirige a /403.
 * - Con sesión y rol correcto → renderiza los children.
 *
 * El guard lee de localStorage de forma síncrona (no hay estado de carga
 * asíncrono). La autorización real sigue siendo responsabilidad del backend
 * (verificarToken + autorizar(Rol.ADMINISTRADOR) en admin.routes.ts, T-04).
 */
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();

  // Función helper para obtener el estado actual de auth desde localStorage
  const leerEstadoAuth = () => {
    const user = getUser();
    return {
      autenticado: isAuthenticated(),
      rol: user?.rol ?? null,
    };
  };

  const [authState, setAuthState] = useState(leerEstadoAuth);

  // Sincronizar ante cambios de sesión (login / logout desde otra pestaña o
  // desde el mismo componente via auth-change).
  useEffect(() => {
    // Re-leer al montar (por si el estado en localStorage cambió entre el
    // primer render y el montaje del efecto).
    setAuthState(leerEstadoAuth());

    const sync = () => setAuthState(leerEstadoAuth());
    window.addEventListener('auth-change', sync);
    return () => window.removeEventListener('auth-change', sync);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authState.autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (authState.rol !== 'administrador') {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
