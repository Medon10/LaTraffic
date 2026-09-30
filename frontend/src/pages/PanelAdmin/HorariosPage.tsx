import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminService,
  type Horario,
  type CrearHorarioDto,
  type DiaSemana,
  type SentidoHorario,
} from '../../services/admin.service.ts';
import { ApiError } from '../../shared/api.ts';
import './panelAdmin.css';
import './horariosPage.css';

// ── Constantes de UI ──────────────────────────────────────────────────────────

const SENTIDO_LABEL: Record<SentidoHorario, string> = {
  colon_rosario: 'Colón → Rosario',
  rosario_colon: 'Rosario → Colón',
};

const DIA_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

const DIAS: DiaSemana[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

const SENTIDOS: SentidoHorario[] = ['colon_rosario', 'rosario_colon'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatearHora(hora: string): string {
  // hora es HH:MM o HH:MM:SS — mostramos solo HH:MM
  return hora.slice(0, 5);
}

// ── Formulario de horario ─────────────────────────────────────────────────────

interface FormState {
  sentido: SentidoHorario;
  diaSemana: DiaSemana;
  hora: string;
  activo: boolean;
}

const FORM_INICIAL: FormState = {
  sentido: 'colon_rosario',
  diaSemana: 'lunes',
  hora: '',
  activo: true,
};

interface FormularioHorarioProps {
  editando: Horario | null;
  onGuardado: (horario: Horario) => void;
  onCancelar: () => void;
}

const FormularioHorario: React.FC<FormularioHorarioProps> = ({
  editando,
  onGuardado,
  onCancelar,
}) => {
  const [form, setForm] = useState<FormState>(() =>
    editando
      ? {
          sentido: editando.sentido,
          diaSemana: editando.diaSemana,
          hora: formatearHora(editando.hora),
          activo: editando.activo,
        }
      : FORM_INICIAL
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sincronizar con el horario editado cuando cambia desde afuera
  useEffect(() => {
    if (editando) {
      setForm({
        sentido: editando.sentido,
        diaSemana: editando.diaSemana,
        hora: formatearHora(editando.hora),
        activo: editando.activo,
      });
    } else {
      setForm(FORM_INICIAL);
    }
    setError('');
  }, [editando]);

  const handleChange = (field: keyof FormState, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar formato hora básico
    if (!/^\d{2}:\d{2}$/.test(form.hora)) {
      setError('El horario debe tener el formato HH:MM (ej. 08:30)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dto: CrearHorarioDto = {
        sentido: form.sentido,
        diaSemana: form.diaSemana,
        hora: form.hora,
        activo: form.activo,
      };

      let resultado: Horario;
      if (editando) {
        resultado = await adminService.editarHorario(editando.id, dto);
      } else {
        resultado = await adminService.crearHorario(dto);
      }
      onGuardado(resultado);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Ocurrió un error al guardar el horario.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      id="form-horario"
      className="horario-form"
      onSubmit={handleSubmit}
      aria-label={editando ? 'Editar horario' : 'Nuevo horario'}
      noValidate
    >
      <h2 className="horario-form__titulo">
        <span className="material-symbols-outlined">{editando ? 'edit' : 'add_circle'}</span>
        {editando ? `Editando horario #${editando.id}` : 'Nuevo horario'}
      </h2>

      {/* Sentido */}
      <div className="horario-form__grupo">
        <label htmlFor="select-sentido" className="horario-form__label">
          Sentido
        </label>
        <select
          id="select-sentido"
          className="horario-form__select"
          value={form.sentido}
          onChange={(e) => handleChange('sentido', e.target.value as SentidoHorario)}
          disabled={loading}
          required
        >
          {SENTIDOS.map((s) => (
            <option key={s} value={s}>
              {SENTIDO_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Día de la semana */}
      <div className="horario-form__grupo">
        <label htmlFor="select-dia" className="horario-form__label">
          Día de la semana
        </label>
        <select
          id="select-dia"
          className="horario-form__select"
          value={form.diaSemana}
          onChange={(e) => handleChange('diaSemana', e.target.value as DiaSemana)}
          disabled={loading}
          required
        >
          {DIAS.map((d) => (
            <option key={d} value={d}>
              {DIA_LABEL[d]}
            </option>
          ))}
        </select>
      </div>

      {/* Hora */}
      <div className="horario-form__grupo">
        <label htmlFor="input-hora" className="horario-form__label">
          Hora de salida
        </label>
        <input
          id="input-hora"
          type="time"
          className="horario-form__input"
          value={form.hora}
          onChange={(e) => handleChange('hora', e.target.value)}
          disabled={loading}
          required
          placeholder="HH:MM"
        />
      </div>

      {/* Activo */}
      <div className="horario-form__grupo horario-form__grupo--toggle">
        <span className="horario-form__label">Estado</span>
        <label className="horario-toggle" htmlFor="toggle-activo">
          <input
            id="toggle-activo"
            type="checkbox"
            className="horario-toggle__input"
            checked={form.activo}
            onChange={(e) => handleChange('activo', e.target.checked)}
            disabled={loading}
          />
          <span className="horario-toggle__slider" aria-hidden="true" />
          <span className="horario-toggle__label">
            {form.activo ? 'Activo' : 'Inactivo'}
          </span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {/* Nota sobre viajes existentes (solo al editar) */}
      {editando && (
        <div className="admin-alert admin-alert--info" role="note">
          <span className="material-symbols-outlined">info</span>
          Los viajes ya generados a partir de este horario <strong>no se modifican</strong> —
          conservan su hora original.
        </div>
      )}

      {/* Acciones */}
      <div className="horario-form__acciones">
        <button
          type="submit"
          id="btn-guardar-horario"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <span className="material-symbols-outlined">save</span>
          )}
          {editando ? 'Guardar cambios' : 'Crear horario'}
        </button>
        <button
          type="button"
          id="btn-cancelar-horario"
          className="btn btn-outline"
          onClick={onCancelar}
          disabled={loading}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

// ── Tarjeta de horario ────────────────────────────────────────────────────────

const TarjetaHorario: React.FC<{
  horario: Horario;
  onEditar: (h: Horario) => void;
}> = ({ horario, onEditar }) => {
  return (
    <li
      className={`horario-card ${!horario.activo ? 'horario-card--inactivo' : ''}`}
      aria-label={`Horario ${SENTIDO_LABEL[horario.sentido]} ${DIA_LABEL[horario.diaSemana]} ${formatearHora(horario.hora)}`}
    >
      <div className="horario-card__sentido">
        <span className={`horario-sentido-chip horario-sentido-chip--${horario.sentido}`}>
          {SENTIDO_LABEL[horario.sentido]}
        </span>
      </div>

      <div className="horario-card__info">
        <div className="horario-card__dia">
          <span className="material-symbols-outlined horario-card__icon">calendar_today</span>
          {DIA_LABEL[horario.diaSemana]}
        </div>
        <div className="horario-card__hora">
          <span className="material-symbols-outlined horario-card__icon">schedule</span>
          {formatearHora(horario.hora)}
        </div>
      </div>

      <div className="horario-card__footer">
        <span
          className={`horario-estado-chip ${horario.activo ? 'horario-estado-chip--activo' : 'horario-estado-chip--inactivo'}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            {horario.activo ? 'check_circle' : 'cancel'}
          </span>
          {horario.activo ? 'Activo' : 'Inactivo'}
        </span>

        <button
          id={`btn-editar-horario-${horario.id}`}
          className="btn btn-outline btn--sm"
          onClick={() => onEditar(horario)}
          title="Editar horario"
          aria-label={`Editar horario #${horario.id}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
          Editar
        </button>
      </div>
    </li>
  );
};

// ── Componente principal ───────────────────────────────────────────────────────

type EstadoCarga = 'idle' | 'loading' | 'success' | 'error';
type FiltroSentido = 'todos' | SentidoHorario;
type FiltroEstado = 'todos' | 'activos' | 'inactivos';

/**
 * Sección "Horarios" del panel de administrador (HU-20, RF-23).
 * Vive dentro de AdminLayout — renderizada bajo /admin/horarios.
 */
export const HorariosPage: React.FC = () => {
  const [estado, setEstado] = useState<EstadoCarga>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [filtroSentido, setFiltroSentido] = useState<FiltroSentido>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [refrescando, setRefrescando] = useState(false);
  const [editando, setEditando] = useState<Horario | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [exitoMsg, setExitoMsg] = useState('');
  const yaFetcheado = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setEstado('loading');
    else setRefrescando(true);
    setErrorMsg('');

    try {
      const data = await adminService.getHorarios();
      setHorarios(data);
      setEstado('success');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar la lista de horarios.';
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

  const handleEditar = (horario: Horario) => {
    setEditando(horario);
    setMostrarFormulario(true);
    setExitoMsg('');
    // Scroll al formulario
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleNuevo = () => {
    setEditando(null);
    setMostrarFormulario(true);
    setExitoMsg('');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleCancelar = () => {
    setEditando(null);
    setMostrarFormulario(false);
    setExitoMsg('');
  };

  const handleGuardado = (horario: Horario) => {
    setHorarios((prev) => {
      const idx = prev.findIndex((h) => h.id === horario.id);
      if (idx >= 0) {
        // actualización
        const copia = [...prev];
        copia[idx] = horario;
        return copia;
      }
      // nuevo
      return [...prev, horario];
    });

    setExitoMsg(
      editando
        ? `Horario #${horario.id} actualizado correctamente.`
        : 'Horario creado correctamente.'
    );
    setEditando(null);
    setMostrarFormulario(false);
  };

  // Filtrar localmente
  const horariosFiltrados = horarios.filter((h) => {
    if (filtroSentido !== 'todos' && h.sentido !== filtroSentido) return false;
    if (filtroEstado === 'activos' && !h.activo) return false;
    if (filtroEstado === 'inactivos' && h.activo) return false;
    return true;
  });

  const cantActivos = horarios.filter((h) => h.activo).length;
  const cantInactivos = horarios.filter((h) => !h.activo).length;

  return (
    <div className="panel-admin">
      {/* ── Header ── */}
      <div className="admin-header">
        <span className="badge badge--horarios">Horarios</span>
        <h1>Gestión de horarios</h1>
        <p className="subtitle">
          Alta, baja y modificación de los horarios de salida para cada sentido y día de la semana.
          Los cambios no afectan viajes ya generados.
        </p>

        {estado === 'success' && (
          <div className="admin-header__actions">
            <span className="admin-header__meta">
              <strong>{horarios.length}</strong> horario{horarios.length !== 1 ? 's' : ''}
              {' · '}
              <strong style={{ color: 'var(--success)' }}>{cantActivos}</strong> activo{cantActivos !== 1 ? 's' : ''}
              {cantInactivos > 0 && (
                <>
                  {' · '}
                  <strong style={{ color: 'var(--on-error-container)' }}>{cantInactivos}</strong>{' '}
                  inactivo{cantInactivos !== 1 ? 's' : ''}
                </>
              )}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                id="btn-refrescar-horarios"
                className={`btn-refresh ${refrescando ? 'btn-refresh--girando' : ''}`}
                onClick={() => cargar(true)}
                disabled={refrescando}
                title="Refrescar lista"
              >
                <span className="material-symbols-outlined">refresh</span>
                {refrescando ? 'Actualizando…' : 'Actualizar'}
              </button>
              <button
                id="btn-nuevo-horario"
                className="btn btn-primary"
                onClick={handleNuevo}
              >
                <span className="material-symbols-outlined">add</span>
                Nuevo horario
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mensaje de éxito ── */}
      {exitoMsg && (
        <div className="admin-alert admin-alert--success" role="status" aria-live="polite">
          <span className="material-symbols-outlined">check_circle</span>
          {exitoMsg}
          <button
            className="horario-alert-close"
            onClick={() => setExitoMsg('')}
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      )}

      {/* ── Estado: cargando ── */}
      {estado === 'loading' && (
        <div className="admin-loading" role="status" aria-live="polite">
          <span className="spinner spinner--dark" aria-hidden="true" />
          Cargando horarios…
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

      {/* ── Formulario (sticky panel) ── */}
      {mostrarFormulario && (
        <div ref={formRef} className="horario-form-panel">
          <FormularioHorario
            editando={editando}
            onGuardado={handleGuardado}
            onCancelar={handleCancelar}
          />
        </div>
      )}

      {/* ── Filtros y lista ── */}
      {estado === 'success' && (
        <>
          {/* Botón nuevo si no hay formulario */}
          {!mostrarFormulario && (
            <div className="horario-cta">
              <button
                id="btn-nuevo-horario-bottom"
                className="btn btn-primary"
                onClick={handleNuevo}
              >
                <span className="material-symbols-outlined">add</span>
                Nuevo horario
              </button>
            </div>
          )}

          {/* Filtros */}
          <div className="cuenta-filtros">
            <div className="cuenta-filtros__chips" role="group" aria-label="Filtrar por sentido">
              {(['todos', ...SENTIDOS] as FiltroSentido[]).map((s) => (
                <button
                  key={s}
                  id={`btn-filtro-sentido-${s}`}
                  className={`cuenta-chip ${filtroSentido === s ? 'cuenta-chip--activo' : ''}`}
                  onClick={() => setFiltroSentido(s)}
                >
                  {s === 'todos' ? 'Todos los sentidos' : SENTIDO_LABEL[s as SentidoHorario]}
                </button>
              ))}
            </div>
            <div className="cuenta-filtros__chips" role="group" aria-label="Filtrar por estado">
              {(
                [
                  { key: 'todos', label: 'Todos' },
                  { key: 'activos', label: 'Activos' },
                  { key: 'inactivos', label: 'Inactivos' },
                ] as { key: FiltroEstado; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  id={`btn-filtro-estado-horario-${key}`}
                  className={`cuenta-chip ${filtroEstado === key ? 'cuenta-chip--activo' : ''}`}
                  onClick={() => setFiltroEstado(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista vacía */}
          {horariosFiltrados.length === 0 && (
            <div className="admin-empty" role="status">
              <span className="material-symbols-outlined admin-empty__icon">schedule</span>
              <p>
                {filtroSentido !== 'todos' || filtroEstado !== 'todos'
                  ? 'Ningún horario coincide con los filtros aplicados.'
                  : '¡No hay horarios cargados! Creá el primero.'}
              </p>
              {(filtroSentido !== 'todos' || filtroEstado !== 'todos') && (
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => {
                    setFiltroSentido('todos');
                    setFiltroEstado('todos');
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Lista de horarios */}
          {horariosFiltrados.length > 0 && (
            <ul className="horario-lista" aria-label="Lista de horarios">
              {horariosFiltrados.map((h) => (
                <TarjetaHorario key={h.id} horario={h} onEditar={handleEditar} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default HorariosPage;
