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
 * La comprobación se hace en cliente ADEMÁS de la validación en el servidor
 * (el backend ya usa verificarToken + autorizar(Rol.ADMINISTRADOR) en cada
 * endpoint). El guard de cliente es solo UX: evita el flash de pantalla vacía
 * y redirige rápido sin esperar el primer fetch.
 */
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();

  // Derivar el estado de auth en cada render para que reaccione al evento
  // 'auth-change' emitido desde auth.ts en setUser/removeUser.
  const [authState, setAuthState] = useState(() => ({
    autenticado: isAuthenticated(),
    rol: getUser()?.rol ?? null,
  }));

  useEffect(() => {
    const sync = () => {
      setAuthState({
        autenticado: isAuthenticated(),
        rol: getUser()?.rol ?? null,
      });
    };
    window.addEventListener('auth-change', sync);
    return () => window.removeEventListener('auth-change', sync);
  }, []);

  if (!authState.autenticado) {
    // Redirigir al login conservando la ruta de destino para volver después
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (authState.rol !== 'administrador') {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
