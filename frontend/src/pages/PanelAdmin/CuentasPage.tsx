import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminService,
  type UsuarioCuenta,
} from '../../services/admin.service.ts';
import { ApiError } from '../../shared/api.ts';
import './panelAdmin.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

const ROL_LABEL: Record<string, string> = {
  pasajero: 'Pasajero',
  chofer: 'Chofer',
  administrador: 'Administrador',
};

function formatearFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ── Tarjeta de usuario ─────────────────────────────────────────────────────────

const TarjetaUsuario: React.FC<{
  usuario: UsuarioCuenta;
  onEstadoCambiado: (id: number, activo: boolean) => void;
}> = ({ usuario, onEstadoCambiado }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleToggle = async () => {
    setLoading(true);
    setError('');
    try {
      const nuevoEstado = !usuario.activo;
      await adminService.cambiarEstadoCuenta(usuario.id, nuevoEstado);
      onEstadoCambiado(usuario.id, nuevoEstado);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Error al cambiar el estado. Intentá de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const esActivo = usuario.activo;

  return (
    <li
      className={`admin-pago cuenta-tarjeta ${!esActivo ? 'cuenta-tarjeta--inactiva' : ''}`}
      aria-label={`Usuario: ${usuario.nombre} ${usuario.apellido}`}
    >
      {/* ── Encabezado ── */}
      <div className="admin-pago__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="admin-pago__id">#{usuario.id}</span>
          <span className={`cuenta-rol-badge cuenta-rol-badge--${usuario.rol}`}>
            {ROL_LABEL[usuario.rol] ?? usuario.rol}
          </span>
          {usuario.esMoroso && (
            <span className="moroso-badge" title="Pasajero moroso">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>block</span>
              Moroso
            </span>
          )}
        </div>
        <span className={`cuenta-estado-chip ${esActivo ? 'cuenta-estado-chip--activo' : 'cuenta-estado-chip--inactivo'}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {esActivo ? 'check_circle' : 'cancel'}
          </span>
          {esActivo ? 'Activo' : 'Deshabilitado'}
        </span>
      </div>

      <div className="admin-pago__divider" />

      {/* ── Datos del usuario ── */}
      <div className="admin-pago__body">
        <div className="admin-pago__seccion">
          <span className="admin-pago__seccion-label">Nombre</span>
          <span className="admin-pago__pasajero">
            {usuario.nombre} {usuario.apellido}
          </span>
          <span className="admin-pago__dni">DNI {usuario.dni ?? '—'}</span>
          <span className="admin-pago__dni">{usuario.email}</span>
        </div>

        <div className="admin-pago__seccion">
          <span className="admin-pago__seccion-label">Registro</span>
          <span className="admin-pago__dni">{formatearFecha(usuario.fechaRegistro)}</span>
        </div>
      </div>

      {/* ── Error inline ── */}
      {error && (
        <div
          className="admin-alert admin-alert--error"
          role="alert"
          style={{ margin: '0 1.25rem 0.5rem' }}
        >
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {/* ── Footer de acción ── */}
      <div className="admin-pago__footer">
        <button
          id={`btn-toggle-cuenta-${usuario.id}`}
          className={esActivo ? 'btn btn-rechazar' : 'btn btn-aprobar'}
          onClick={handleToggle}
          disabled={loading}
          title={esActivo ? 'Deshabilitar cuenta' : 'Habilitar cuenta'}
        >
          {loading ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <span className="material-symbols-outlined">
              {esActivo ? 'person_off' : 'person_check'}
            </span>
          )}
          {esActivo ? 'Deshabilitar' : 'Habilitar'}
        </button>
      </div>
    </li>
  );
};

// ── Componente principal ───────────────────────────────────────────────────────

type EstadoCarga = 'idle' | 'loading' | 'success' | 'error';
type FiltroRol = 'todos' | 'pasajero' | 'chofer';
type FiltroEstado = 'todos' | 'activos' | 'inactivos';

/**
 * Sección "Cuentas de Usuario" del panel de administrador (HU-18).
 * Vive dentro de AdminLayout — renderizada bajo /admin/cuentas.
 */
export const CuentasPage: React.FC = () => {
  const [estado, setEstado] = useState<EstadoCarga>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [usuarios, setUsuarios] = useState<UsuarioCuenta[]>([]);
  const [filtroRol, setFiltroRol] = useState<FiltroRol>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [refrescando, setRefrescando] = useState(false);
  const yaFetcheado = useRef(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setEstado('loading');
    else setRefrescando(true);
    setErrorMsg('');

    try {
      const data = await adminService.getUsuarios();
      setUsuarios(data);
      setEstado('success');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar la lista de usuarios.';
      setErrorMsg(msg);
      if (!silencioso) setEstado('error');
    } finally {
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    if (!yaFetcheado.current) {
      yaFetcheado.current = true;
      cargar();
    }
  }, [cargar]);

  const handleEstadoCambiado = useCallback((id: number, activo: boolean) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activo } : u))
    );
  }, []);

  // Filtrar localmente
  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroRol !== 'todos' && u.rol !== filtroRol) return false;
    if (filtroEstado === 'activos' && !u.activo) return false;
    if (filtroEstado === 'inactivos' && u.activo) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const match =
        u.nombre.toLowerCase().includes(q) ||
        u.apellido.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.dni ?? '').includes(q);
      if (!match) return false;
    }
    return true;
  });

  const cantActivos = usuarios.filter((u) => u.activo).length;
  const cantInactivos = usuarios.filter((u) => !u.activo).length;

  return (
    <div className="panel-admin">
      {/* ── Header ── */}
      <div className="admin-header">
        <span className="badge badge--cuentas">Cuentas de Usuario</span>
        <h1>Gestión de cuentas</h1>
        <p className="subtitle">
          Habilitá o deshabilitá cuentas de pasajeros y choferes.
          Un usuario deshabilitado no puede iniciar sesión en el sistema.
        </p>

        {estado === 'success' && (
          <div className="admin-header__actions">
            <span className="admin-header__meta">
              <strong>{usuarios.length}</strong> usuario{usuarios.length !== 1 ? 's' : ''}
              {' · '}
              <strong style={{ color: 'var(--success)' }}>{cantActivos}</strong> activo{cantActivos !== 1 ? 's' : ''}
              {cantInactivos > 0 && (
                <>
                  {' · '}
                  <strong style={{ color: 'var(--on-error-container)' }}>{cantInactivos}</strong>{' '}
                  deshabilitado{cantInactivos !== 1 ? 's' : ''}
                </>
              )}
            </span>
            <button
              id="btn-refrescar-cuentas"
              className={`btn-refresh ${refrescando ? 'btn-refresh--girando' : ''}`}
              onClick={() => cargar(true)}
              disabled={refrescando}
              title="Refrescar lista"
            >
              <span className="material-symbols-outlined">refresh</span>
              {refrescando ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        )}
      </div>

      {/* ── Estado: cargando ── */}
      {estado === 'loading' && (
        <div className="admin-loading" role="status" aria-live="polite">
          <span className="spinner spinner--dark" aria-hidden="true" />
          Cargando usuarios…
        </div>
      )}

      {/* ── Estado: error ── */}
      {estado === 'error' && (
        <div className="admin-alert admin-alert--error" role="alert">
          <span className="material-symbols-outlined">error</span>
          {errorMsg}
          <button
            className="btn btn-outline"
            style={{ marginLeft: 'auto', fontSize: '0.85rem' }}
            onClick={() => cargar()}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Filtros ── */}
      {estado === 'success' && (
        <div className="cuenta-filtros">
          {/* Buscador */}
          <div className="cuenta-filtros__busqueda">
            <span className="material-symbols-outlined cuenta-filtros__busqueda-icon">search</span>
            <input
              id="input-buscar-usuario"
              type="text"
              className="cuenta-filtros__input"
              placeholder="Buscar por nombre, email o DNI…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar usuario"
            />
            {busqueda && (
              <button
                className="cuenta-filtros__clear"
                onClick={() => setBusqueda('')}
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            )}
          </div>

          {/* Filtro por rol */}
          <div className="cuenta-filtros__chips" role="group" aria-label="Filtrar por rol">
            {(['todos', 'pasajero', 'chofer'] as FiltroRol[]).map((r) => (
              <button
                key={r}
                id={`btn-filtro-rol-${r}`}
                className={`cuenta-chip ${filtroRol === r ? 'cuenta-chip--activo' : ''}`}
                onClick={() => setFiltroRol(r)}
              >
                {r === 'todos' ? 'Todos los roles' : ROL_LABEL[r]}
              </button>
            ))}
          </div>

          {/* Filtro por estado */}
          <div className="cuenta-filtros__chips" role="group" aria-label="Filtrar por estado">
            {([
              { key: 'todos', label: 'Todos los estados' },
              { key: 'activos', label: 'Activos' },
              { key: 'inactivos', label: 'Deshabilitados' },
            ] as { key: FiltroEstado; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                id={`btn-filtro-estado-${key}`}
                className={`cuenta-chip ${filtroEstado === key ? 'cuenta-chip--activo' : ''}`}
                onClick={() => setFiltroEstado(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Lista vacía post-filtros ── */}
      {estado === 'success' && usuariosFiltrados.length === 0 && (
        <div className="admin-empty" role="status">
          <span className="material-symbols-outlined admin-empty__icon">manage_search</span>
          <p>
            {busqueda || filtroRol !== 'todos' || filtroEstado !== 'todos'
              ? 'Ningún usuario coincide con los filtros aplicados.'
              : '¡No hay usuarios registrados!'}
          </p>
          {(busqueda || filtroRol !== 'todos' || filtroEstado !== 'todos') && (
            <button
              className="btn btn-outline"
              style={{ fontSize: '0.85rem' }}
              onClick={() => { setBusqueda(''); setFiltroRol('todos'); setFiltroEstado('todos'); }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ── Lista de usuarios ── */}
      {estado === 'success' && usuariosFiltrados.length > 0 && (
        <ul className="admin-lista" aria-label="Lista de usuarios">
          {usuariosFiltrados.map((usuario) => (
            <TarjetaUsuario
              key={usuario.id}
              usuario={usuario}
              onEstadoCambiado={handleEstadoCambiado}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default CuentasPage;
