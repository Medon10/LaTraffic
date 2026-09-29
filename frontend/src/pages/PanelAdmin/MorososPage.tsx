import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminService,
  type UsuarioMoroso,
} from '../../services/admin.service.ts';
import { ApiError } from '../../shared/api.ts';
import './panelAdmin.css';

// ── Tarjeta de usuario moroso ─────────────────────────────────────────────────

const TarjetaMoroso: React.FC<{
  usuario: UsuarioMoroso;
  onReactivado: (id: number) => void;
}> = ({ usuario, onReactivado }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reactivado, setReactivado] = useState(false);

  const handleReactivar = async () => {
    setLoading(true);
    setError('');
    try {
      await adminService.reactivarMoroso(usuario.id);
      setReactivado(true);
      onReactivado(usuario.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Error al reactivar. Intentá de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <li
      className={`admin-pago moroso-tarjeta ${reactivado ? 'moroso-tarjeta--reactivado' : ''}`}
      aria-label={`Usuario moroso: ${usuario.nombre} ${usuario.apellido}`}
    >
      {/* ── Encabezado ── */}
      <div className="admin-pago__header">
        <span className="admin-pago__id">
          Usuario #{usuario.id}
        </span>
        <span className="moroso-badge">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            block
          </span>
          Moroso
        </span>
      </div>

      <div className="admin-pago__divider" />

      {/* ── Datos del pasajero ── */}
      <div className="admin-pago__body">
        <div className="admin-pago__seccion">
          <span className="admin-pago__seccion-label">Pasajero</span>
          <span className="admin-pago__pasajero">
            {usuario.nombre} {usuario.apellido}
          </span>
          <span className="admin-pago__dni">DNI {usuario.dni ?? '—'}</span>
          <span className="admin-pago__dni">{usuario.email}</span>
        </div>

        <div className="admin-pago__seccion">
          <span className="admin-pago__seccion-label">Inasistencias en efectivo</span>
          <span className="moroso-inasistencias">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              event_busy
            </span>
            {usuario.inasistenciasEfectivo}{' '}
            {usuario.inasistenciasEfectivo === 1 ? 'inasistencia' : 'inasistencias'}
          </span>
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
        {reactivado ? (
          <span className="admin-pago__resultado admin-pago__resultado--aprobado">
            <span className="material-symbols-outlined">check_circle</span>
            Reactivado — puede volver a pagar en efectivo
          </span>
        ) : (
          <button
            id={`btn-reactivar-${usuario.id}`}
            className="btn btn-aprobar"
            onClick={handleReactivar}
            disabled={loading}
            title="Reactivar acceso al pago en efectivo"
          >
            {loading ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <span className="material-symbols-outlined">person_check</span>
            )}
            Reactivar
          </button>
        )}
      </div>
    </li>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

type EstadoCarga = 'idle' | 'loading' | 'success' | 'error';

/**
 * Sección "Pasajeros Morosos" del panel de administrador (HU-17).
 * Vive dentro de AdminLayout — renderizada bajo /admin/morosos.
 */
export const MorososPage: React.FC = () => {
  const [estado, setEstado] = useState<EstadoCarga>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [morosos, setMorosos] = useState<UsuarioMoroso[]>([]);
  const [reactivados, setReactivados] = useState<Set<number>>(new Set());
  const [refrescando, setRefrescando] = useState(false);
  const yaFetcheado = useRef(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setEstado('loading');
    else setRefrescando(true);
    setErrorMsg('');

    try {
      const data = await adminService.getMorosos();
      setMorosos(data);
      setEstado('success');
      // Limpiar reactivados que ya no estén en la lista
      setReactivados((prev) => {
        const idsActuales = new Set(data.map((u) => u.id));
        const siguiente = new Set<number>();
        for (const id of prev) {
          if (idsActuales.has(id)) siguiente.add(id);
        }
        return siguiente;
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar la lista de morosos.';
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

  const handleReactivado = useCallback((id: number) => {
    setReactivados((prev) => new Set(prev).add(id));
  }, []);

  const pendientes = morosos.filter((u) => !reactivados.has(u.id));
  const cantTotal = morosos.length;
  const cantReactivados = reactivados.size;

  return (
    <div className="panel-admin">
      {/* ── Header ── */}
      <div className="admin-header">
        <span className="badge badge--moroso">Pasajeros Morosos</span>
        <h1>Gestión de morosos</h1>
        <p className="subtitle">
          Pasajeros bloqueados para pago en efectivo por acumular 3 inasistencias.
          Podés reactivarlos individualmente para darles una segunda oportunidad.
        </p>

        {estado === 'success' && (
          <div className="admin-header__actions">
            <span className="admin-header__meta">
              {cantTotal === 0 ? (
                'Sin pasajeros morosos'
              ) : (
                <>
                  <strong>{pendientes.length}</strong> pendiente
                  {pendientes.length !== 1 ? 's' : ''}
                  {cantReactivados > 0 && (
                    <> · <strong>{cantReactivados}</strong> reactivado{cantReactivados !== 1 ? 's' : ''}</>
                  )}
                </>
              )}
            </span>
            <button
              id="btn-refrescar-morosos"
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
          Cargando lista de morosos…
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

      {/* ── Estado: sin morosos ── */}
      {estado === 'success' && cantTotal === 0 && (
        <div className="admin-empty" role="status">
          <span className="material-symbols-outlined admin-empty__icon">
            verified_user
          </span>
          <p>¡No hay pasajeros morosos!</p>
          <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            Todos los pasajeros tienen acceso al pago en efectivo.
          </p>
        </div>
      )}

      {/* ── Lista de morosos pendientes ── */}
      {estado === 'success' && cantTotal > 0 && (
        <>
          {pendientes.length > 0 && (
            <ul className="admin-lista" aria-label="Pasajeros morosos">
              {pendientes.map((usuario) => (
                <TarjetaMoroso
                  key={usuario.id}
                  usuario={usuario}
                  onReactivado={handleReactivado}
                />
              ))}
            </ul>
          )}

          {/* Separador */}
          {pendientes.length > 0 && cantReactivados > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--on-surface-variant)',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'var(--outline-variant)' }} />
              Reactivados en esta sesión
              <div style={{ flex: 1, height: 1, background: 'var(--outline-variant)' }} />
            </div>
          )}

          {/* Reactivados en esta sesión (sólo los que siguen en la lista del servidor) */}
          {cantReactivados > 0 && (
            <ul
              className="admin-lista"
              aria-label="Reactivados en esta sesión"
              style={{ opacity: 0.6, pointerEvents: 'none' }}
            >
              {morosos
                .filter((u) => reactivados.has(u.id))
                .map((usuario) => (
                  <TarjetaMoroso
                    key={usuario.id}
                    usuario={usuario}
                    onReactivado={() => {}}
                  />
                ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default MorososPage;
