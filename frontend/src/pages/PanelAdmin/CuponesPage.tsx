import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminService,
  type Cupon,
  type CrearCuponDto,
  type TipoCupon,
} from '../../services/admin.service.ts';
import { ApiError } from '../../shared/api.ts';
import './panelAdmin.css';
import './cuponesPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatearFecha(iso: string | null): string {
  if (!iso) return 'Permanente';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatearValor(tipo: TipoCupon, valor: string | number): string {
  const num = Number(valor);
  if (tipo === 'porcentaje') return `${num}% OFF`;
  return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

// ── Estado inicial del formulario ─────────────────────────────────────────────

interface FormState {
  codigo: string;
  tipo: TipoCupon;
  valor: string;
  fechaInicio: string;
  fechaFin: string;
  usoUnicoPorPersona: boolean;
  activo: boolean;
}

const FORM_INICIAL: FormState = {
  codigo: '',
  tipo: 'porcentaje',
  valor: '',
  fechaInicio: '',
  fechaFin: '',
  usoUnicoPorPersona: true,
  activo: true,
};

type FiltroEstado = 'todos' | 'activos' | 'inactivos';

// ── Componente principal ──────────────────────────────────────────────────────

export const CuponesPage: React.FC = () => {
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  // Formulario
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);

  // Filtros de tabla
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  // Toggle activo inline
  const [toggling, setToggling] = useState<number | null>(null);

  // ── Carga de cupones ───────────────────────────────────────────────────────

  const cargarCupones = useCallback(async (esRefresco = false) => {
    if (esRefresco) setRefrescando(true);
    else setCargando(true);
    setErrorGlobal(null);

    try {
      const data = await adminService.getCupones();
      setCupones(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al cargar los cupones';
      setErrorGlobal(msg);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarCupones();
  }, [cargarCupones]);

  // ── Handlers del formulario ────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'codigo') {
      // Normalizar código en mayúsculas automáticamente
      setForm((prev) => ({ ...prev, codigo: value.toUpperCase().replace(/\s+/g, '') }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setErrorForm(null);
    setExito(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);
    setExito(null);

    const codigoLimpio = form.codigo.trim().toUpperCase();
    if (!codigoLimpio) {
      setErrorForm('El código del cupón no puede estar vacío');
      return;
    }
    const valorNum = parseFloat(form.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorForm('El valor de descuento debe ser mayor a cero');
      return;
    }
    if (form.tipo === 'porcentaje' && valorNum > 100) {
      setErrorForm('El porcentaje de descuento no puede ser mayor al 100%');
      return;
    }
    if (form.fechaInicio && form.fechaFin && form.fechaInicio > form.fechaFin) {
      setErrorForm('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }

    const dto: CrearCuponDto = {
      codigo: codigoLimpio,
      tipo: form.tipo,
      valor: valorNum,
      fechaInicio: form.fechaInicio ? new Date(form.fechaInicio).toISOString() : null,
      fechaFin: form.fechaFin ? new Date(form.fechaFin).toISOString() : null,
      usoUnicoPorPersona: form.usoUnicoPorPersona,
      activo: form.activo,
    };

    setEnviando(true);
    try {
      const nuevo = await adminService.crearCupon(dto);
      setCupones((prev) => [nuevo, ...prev]);
      setForm(FORM_INICIAL);
      setExito(`¡Cupón "${nuevo.codigo}" creado exitosamente!`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al crear el cupón';
      setErrorForm(msg);
    } finally {
      setEnviando(false);
    }
  };

  // ── Toggle activo/inactivo ─────────────────────────────────────────────────

  const handleToggleActivo = async (cupon: Cupon) => {
    setToggling(cupon.id);
    try {
      const actualizado = await adminService.actualizarCupon(cupon.id, { activo: !cupon.activo });
      setCupones((prev) => prev.map((c) => (c.id === cupon.id ? actualizado : c)));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al actualizar el estado del cupón';
      setErrorGlobal(msg);
    } finally {
      setToggling(null);
    }
  };

  // ── Filtros y métricas ─────────────────────────────────────────────────────

  const cantActivos = useMemo(() => cupones.filter((c) => c.activo).length, [cupones]);
  const cantInactivos = useMemo(() => cupones.filter((c) => !c.activo).length, [cupones]);

  const cuponesFiltrados = useMemo(() => {
    return cupones.filter((c) => {
      const coincideBusqueda =
        c.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.tipo.toLowerCase().includes(busqueda.toLowerCase());

      if (!coincideBusqueda) return false;
      if (filtroEstado === 'activos') return c.activo;
      if (filtroEstado === 'inactivos') return !c.activo;
      return true;
    });
  }, [cupones, busqueda, filtroEstado]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="panel-admin">
      {/* ── Header ── */}
      <div className="admin-header">
        <span className="badge badge--cupones">Cupones y Promociones</span>
        <h1>Gestión de cupones de descuento</h1>
        <p className="subtitle">
          Creá códigos promocionales, configurá vigencias y administrá el estado de cada beneficio.
        </p>

        <div className="admin-header__actions">
          <span className="admin-header__meta">
            <strong>{cupones.length}</strong> {cupones.length === 1 ? 'cupón' : 'cupones'}
            {' · '}
            <strong style={{ color: 'var(--success)' }}>{cantActivos}</strong> {cantActivos === 1 ? 'activo' : 'activos'}
            {cantInactivos > 0 && (
              <>
                {' · '}
                <strong style={{ color: 'var(--on-surface-variant)' }}>{cantInactivos}</strong>{' '}
                {cantInactivos === 1 ? 'inactivo' : 'inactivos'}
              </>
            )}
          </span>

          <button
            id="btn-refrescar-cupones"
            className={`btn-refresh ${refrescando ? 'btn-refresh--girando' : ''}`}
            onClick={() => cargarCupones(true)}
            disabled={refrescando}
            title="Refrescar lista de cupones"
          >
            <span className="material-symbols-outlined">refresh</span>
            {refrescando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* ── KPIs Rápidos ── */}
      <div className="cupones-kpis">
        <div className="cupones-kpi-card">
          <div className="cupones-kpi-icon cupones-kpi-icon--total">
            <span className="material-symbols-outlined">confirmation_number</span>
          </div>
          <div className="cupones-kpi-info">
            <span className="cupones-kpi-val">{cupones.length}</span>
            <span className="cupones-kpi-label">Total Cupones</span>
          </div>
        </div>

        <div className="cupones-kpi-card">
          <div className="cupones-kpi-icon cupones-kpi-icon--activos">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="cupones-kpi-info">
            <span className="cupones-kpi-val" style={{ color: '#16a34a' }}>{cantActivos}</span>
            <span className="cupones-kpi-label">Activos hoy</span>
          </div>
        </div>

        <div className="cupones-kpi-card">
          <div className="cupones-kpi-icon cupones-kpi-icon--inactivos">
            <span className="material-symbols-outlined">pause_circle</span>
          </div>
          <div className="cupones-kpi-info">
            <span className="cupones-kpi-val" style={{ color: '#64748b' }}>{cantInactivos}</span>
            <span className="cupones-kpi-label">Pausados</span>
          </div>
        </div>
      </div>

      {/* ── Alerta global ── */}
      {errorGlobal && (
        <div className="admin-alert admin-alert--error" role="alert">
          <span className="material-symbols-outlined">error</span>
          <span>{errorGlobal}</span>
        </div>
      )}

      {/* ── Grid Principal ── */}
      <div className="cupones-grid">
        {/* ── Columna 1: Formulario de Creación ── */}
        <section className="cupones-card" aria-labelledby="form-cupones-titulo">
          <div className="cupones-card__header">
            <div>
              <h2 id="form-cupones-titulo" className="cupones-card__titulo">
                <span className="material-symbols-outlined">add_circle</span>
                Nuevo Cupón
              </h2>
              <p className="cupones-card__sub">Completá los datos para generar el código</p>
            </div>
          </div>

          <form id="form-crear-cupon" className="cupones-form" onSubmit={handleSubmit} noValidate>
            {/* Código */}
            <div className="cupones-form__field">
              <label htmlFor="cupon-codigo" className="cupones-form__label">
                Código del cupón <span aria-hidden="true">*</span>
              </label>
              <div className="cupones-codigo-input-wrap">
                <input
                  id="cupon-codigo"
                  name="codigo"
                  type="text"
                  className="cupones-form__input"
                  placeholder="EJ: VERANO2026"
                  value={form.codigo}
                  onChange={handleChange}
                  maxLength={50}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
                <span className="material-symbols-outlined cupones-codigo-input-icon">sell</span>
              </div>
              <span className="cupones-form__hint">
                Se guarda automáticamente en mayúsculas sin espacios.
              </span>
            </div>

            {/* Tipo y Valor */}
            <div className="cupones-form__row">
              <div className="cupones-form__field">
                <label htmlFor="cupon-tipo" className="cupones-form__label">
                  Tipo <span aria-hidden="true">*</span>
                </label>
                <select
                  id="cupon-tipo"
                  name="tipo"
                  className="cupones-form__select"
                  value={form.tipo}
                  onChange={handleChange}
                >
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="monto_fijo">Monto fijo ($)</option>
                </select>
              </div>

              <div className="cupones-form__field">
                <label htmlFor="cupon-valor" className="cupones-form__label">
                  Descuento <span aria-hidden="true">*</span>
                </label>
                <div className="cupones-form__input-prefix">
                  <span className="cupones-form__prefix-icon">
                    {form.tipo === 'porcentaje' ? '%' : '$'}
                  </span>
                  <input
                    id="cupon-valor"
                    name="valor"
                    type="number"
                    className="cupones-form__input cupones-form__input--prefixed"
                    placeholder={form.tipo === 'porcentaje' ? '15' : '1500'}
                    value={form.valor}
                    onChange={handleChange}
                    min="0.01"
                    max={form.tipo === 'porcentaje' ? 100 : undefined}
                    step="0.01"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Fechas de Vigencia */}
            <div className="cupones-form__row">
              <div className="cupones-form__field">
                <label htmlFor="cupon-fecha-inicio" className="cupones-form__label">
                  Vigencia desde
                </label>
                <input
                  id="cupon-fecha-inicio"
                  name="fechaInicio"
                  type="date"
                  className="cupones-form__input"
                  value={form.fechaInicio}
                  onChange={handleChange}
                />
              </div>

              <div className="cupones-form__field">
                <label htmlFor="cupon-fecha-fin" className="cupones-form__label">
                  Vigencia hasta
                </label>
                <input
                  id="cupon-fecha-fin"
                  name="fechaFin"
                  type="date"
                  className="cupones-form__input"
                  value={form.fechaFin}
                  onChange={handleChange}
                  min={form.fechaInicio || undefined}
                />
              </div>
            </div>

            {/* Toggles (Uso único + Activo) */}
            <div className="cupones-form__toggles">
              <label className="cupones-switch" htmlFor="cupon-uso-unico">
                <span className="cupones-switch__label">Uso único por pasajero</span>
                <input
                  id="cupon-uso-unico"
                  name="usoUnicoPorPersona"
                  type="checkbox"
                  className="cupones-switch__input"
                  checked={form.usoUnicoPorPersona}
                  onChange={handleChange}
                />
                <span className="cupones-switch__slider" aria-hidden="true" />
              </label>

              <label className="cupones-switch" htmlFor="cupon-activo">
                <span className="cupones-switch__label">Activo al crear</span>
                <input
                  id="cupon-activo"
                  name="activo"
                  type="checkbox"
                  className="cupones-switch__input"
                  checked={form.activo}
                  onChange={handleChange}
                />
                <span className="cupones-switch__slider" aria-hidden="true" />
              </label>
            </div>

            {/* Alertas locales */}
            {errorForm && (
              <div className="admin-alert admin-alert--error" role="alert">
                <span className="material-symbols-outlined">error</span>
                <span>{errorForm}</span>
              </div>
            )}
            {exito && (
              <div className="admin-alert admin-alert--success" role="status">
                <span className="material-symbols-outlined">check_circle</span>
                <span>{exito}</span>
              </div>
            )}

            <button
              id="btn-crear-cupon"
              type="submit"
              className="cupones-btn-submit"
              disabled={enviando}
            >
              {enviando ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Creando cupón…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">add</span>
                  Crear Cupón
                </>
              )}
            </button>
          </form>
        </section>

        {/* ── Columna 2: Tabla de Cupones Existentes ── */}
        <section className="cupones-card" aria-labelledby="tabla-cupones-titulo">
          <div className="cupones-card__header">
            <div>
              <h2 id="tabla-cupones-titulo" className="cupones-card__titulo">
                <span className="material-symbols-outlined">format_list_bulleted</span>
                Cupones en el sistema
              </h2>
              <p className="cupones-card__sub">Hacé clic en el estado para activar o pausar un código</p>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="cupones-filtros-bar">
            <div className="cupones-search">
              <span className="material-symbols-outlined cupones-search-icon">search</span>
              <input
                type="text"
                className="cupones-form__input"
                placeholder="Buscar por código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="cupones-filter-chips">
              <button
                type="button"
                className={`cupones-filter-chip ${filtroEstado === 'todos' ? 'cupones-filter-chip--activo' : ''}`}
                onClick={() => setFiltroEstado('todos')}
              >
                Todos ({cupones.length})
              </button>
              <button
                type="button"
                className={`cupones-filter-chip ${filtroEstado === 'activos' ? 'cupones-filter-chip--activo' : ''}`}
                onClick={() => setFiltroEstado('activos')}
              >
                Activos ({cantActivos})
              </button>
              <button
                type="button"
                className={`cupones-filter-chip ${filtroEstado === 'inactivos' ? 'cupones-filter-chip--activo' : ''}`}
                onClick={() => setFiltroEstado('inactivos')}
              >
                Inactivos ({cantInactivos})
              </button>
            </div>
          </div>

          {/* Contenido: Loading, Vacío o Tabla */}
          {cargando ? (
            <div className="admin-empty" aria-label="Cargando cupones">
              <span className="spinner spinner--dark" style={{ width: 28, height: 28 }} />
              <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Cargando cupones…</p>
            </div>
          ) : cuponesFiltrados.length === 0 ? (
            <div className="admin-empty">
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline-variant)' }}>
                confirmation_number
              </span>
              <p style={{ marginTop: '0.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                {busqueda || filtroEstado !== 'todos'
                  ? 'No se encontraron cupones con ese criterio'
                  : 'No hay cupones cargados todavía'}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', margin: 0 }}>
                {busqueda || filtroEstado !== 'todos'
                  ? 'Probá borrando el texto de búsqueda o cambiando el filtro.'
                  : 'Creá tu primer cupón con el formulario de la izquierda.'}
              </p>
            </div>
          ) : (
            <div className="cupones-table-wrap">
              <table className="cupones-table" aria-label="Lista de cupones de descuento">
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Descuento</th>
                    <th scope="col">Vigencia</th>
                    <th scope="col">Uso único</th>
                    <th scope="col" style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cuponesFiltrados.map((cupon) => (
                    <tr
                      key={cupon.id}
                      className={!cupon.activo ? 'cupones-table tr--inactivo' : ''}
                    >
                      <td>
                        <span className="cupones-code-badge">
                          <span className="material-symbols-outlined">tag</span>
                          {cupon.codigo}
                        </span>
                      </td>
                      <td>
                        <span className={`cupones-type-chip cupones-type-chip--${cupon.tipo}`}>
                          {cupon.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                        </span>
                      </td>
                      <td>
                        <span className="cupones-val-tag">
                          {formatearValor(cupon.tipo, cupon.valor)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                          {cupon.fechaInicio || cupon.fechaFin ? (
                            <>
                              {formatearFecha(cupon.fechaInicio)}
                              {' → '}
                              {formatearFecha(cupon.fechaFin)}
                            </>
                          ) : (
                            'Permanente'
                          )}
                        </span>
                      </td>
                      <td>
                        {cupon.usoUnicoPorPersona ? (
                          <span className="cupones-pill cupones-pill--si">1 por persona</span>
                        ) : (
                          <span className="cupones-pill cupones-pill--no">Múltiple</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          id={`btn-toggle-cupon-${cupon.id}`}
                          className={`cupones-toggle-btn ${cupon.activo ? 'cupones-toggle-btn--activo' : 'cupones-toggle-btn--inactivo'}`}
                          onClick={() => handleToggleActivo(cupon)}
                          disabled={toggling === cupon.id}
                          aria-label={`${cupon.activo ? 'Desactivar' : 'Activar'} cupón ${cupon.codigo}`}
                          title={cupon.activo ? 'Clic para desactivar' : 'Clic para activar'}
                        >
                          {toggling === cupon.id ? (
                            <span className="spinner spinner--dark" style={{ width: 12, height: 12 }} />
                          ) : (
                            <span className="material-symbols-outlined">
                              {cupon.activo ? 'check_circle' : 'do_not_disturb_on'}
                            </span>
                          )}
                          <span>{cupon.activo ? 'Activo' : 'Pausado'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CuponesPage;
