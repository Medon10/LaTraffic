import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { AdminGuard } from './componentes/AdminGuard';
import { HomePage } from './pages/Home/home';
import { LoginPage } from './pages/Login/login';
import { RegistroPage } from './pages/Registro/registro';
import { RecuperarPasswordPage } from './pages/RecuperarPassword/recuperarPassword';
import { SeleccionViajePage } from './pages/SeleccionViaje/seleccionViaje';
import { CheckoutPage } from './pages/Checkout/checkout';
import { MisReservasPage } from './pages/MisReservas/misReservas';
import { PanelChoferPage } from './pages/PanelChofer/panelChofer';

// Panel de administrador — layout + secciones
import { AdminLayout } from './pages/PanelAdmin/AdminLayout';
import { TransferenciasPage } from './pages/PanelAdmin/panelAdmin';
import { AdminPlaceholder } from './pages/PanelAdmin/AdminPlaceholder';

// ── Páginas de error ──────────────────────────────────────────────────────────

const NotFoundPage: React.FC = () => (
  <div className="page-container text-center">
    <div className="badge">Error 404</div>
    <h1>Página no encontrada</h1>
    <p className="subtitle">La página que estás buscando no existe o fue movida.</p>
    <div style={{ marginTop: '2rem' }}>
      <Link to="/" className="btn btn-primary">Volver al Inicio</Link>
    </div>
  </div>
);

const ForbiddenPage: React.FC = () => (
  <div className="page-container text-center">
    <div className="badge">Error 403</div>
    <h1>Sin permiso</h1>
    <p className="subtitle">No tenés acceso a esta sección.</p>
    <div style={{ marginTop: '2rem' }}>
      <Link to="/" className="btn btn-primary">Ir al inicio</Link>
    </div>
  </div>
);

// ── Router ────────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Rutas públicas / pasajero / chofer ── */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
          <Route path="/seleccion-viaje" element={<SeleccionViajePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/mis-reservas" element={<MisReservasPage />} />

          {/* Panel del chofer (HU-12) */}
          <Route path="/chofer/pasajeros" element={<PanelChoferPage />} />

          {/* Página de acceso denegado */}
          <Route path="/403" element={<ForbiddenPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* ── Panel de administrador (HU-15 a HU-23) ──
            AdminGuard verifica sesión + rol='administrador' antes de renderizar.
            AdminLayout provee el sidebar, topbar móvil y el <Outlet>.
            Cada sección es una ruta hija independiente. ── */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          {/* Redirigir /admin → /admin/transferencias */}
          <Route index element={<Navigate to="transferencias" replace />} />

          {/* HU-15 — Validar comprobantes de transferencia (implementado) */}
          <Route path="transferencias" element={<TransferenciasPage />} />

          {/* HU-16 — Pasajeros morosos (placeholder) */}
          <Route
            path="morosos"
            element={
              <AdminPlaceholder
                titulo="Pasajeros Morosos"
                icono="person_off"
                hu="HU-16"
                descripcion="Listado de pasajeros con flag es_moroso=true. Permite reactivar cuentas y gestionar inasistencias de efectivo."
              />
            }
          />

          {/* HU-17 — Cuentas de usuario (placeholder) */}
          <Route
            path="cuentas"
            element={
              <AdminPlaceholder
                titulo="Cuentas de Usuario"
                icono="manage_accounts"
                hu="HU-17"
                descripcion="Gestión de usuarios: activar, desactivar y modificar datos de cuenta."
              />
            }
          />

          {/* HU-18 — Estadísticas (placeholder) */}
          <Route
            path="estadisticas"
            element={
              <AdminPlaceholder
                titulo="Estadísticas"
                icono="bar_chart"
                hu="HU-18"
                descripcion="Resumen de ventas, ocupación por viaje y métricas de uso del sistema."
              />
            }
          />

          {/* HU-19 — Horarios (placeholder) */}
          <Route
            path="horarios"
            element={
              <AdminPlaceholder
                titulo="Horarios"
                icono="schedule"
                hu="HU-19"
                descripcion="Alta, baja y modificación de horarios de salida para cada sentido y día de la semana."
              />
            }
          />

          {/* HU-20 a HU-23 — Cupones (placeholder) */}
          <Route
            path="cupones"
            element={
              <AdminPlaceholder
                titulo="Cupones de Descuento"
                icono="local_activity"
                hu="HU-20"
                descripcion="Creación y gestión de cupones de descuento (monto fijo o porcentaje) con fechas de vigencia."
              />
            }
          />
        </Route>

        {/* Ruta legacy — redirige la vieja URL /admin/pagos a la nueva sección */}
        <Route path="/admin/pagos" element={<Navigate to="/admin/transferencias" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
