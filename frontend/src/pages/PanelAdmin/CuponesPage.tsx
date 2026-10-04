import React, { useCallback, useEffect, useState } from 'react';
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
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatearValor(tipo: TipoCupon, valor: string | number): string {
  const num = Number(valor);
  if (tipo === 'porcentaje') return `${num}%`;
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

// ── Componente principal ──────────────────────────────────────────────────────

export const CuponesPage: React.FC = () => {
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  // Formulario
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);

  // Toggle activo inline
  const [toggling, setToggling] = useState<number | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────

  const cargarCupones = useCallback(async () => {
    setCargando(true);
    setErrorGlobal(null);
    try {
      const data = await adminService.getCupones();
      setCupones(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al cargar los cupones';
      setErrorGlobal(msg);
    } finally {
      setCargando(false);
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

    if (!form.codigo.trim()) {
      setErrorForm('El código no puede estar vacío');
      return;
    }
    const valorNum = parseFloat(form.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorForm('El valor debe ser un número mayor a cero');
      return;
    }
    if (form.tipo === 'porcentaje' && valorNum > 100) {
      setErrorForm('El porcentaje no puede ser mayor a 100');
      return;
    }
    if (form.fechaInicio && form.fechaFin && form.fechaInicio > form.fechaFin) {
      setErrorForm('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }

    const dto: CrearCuponDto = {
      codigo: form.codigo.trim().toUpperCase(),
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
      setExito(`Cupón "${nuevo.codigo}" creado exitosamente.`);
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
      const msg = err instanceof ApiError ? err.message : 'Error al actualizar el cupón';
      setErrorGlobal(msg);
    } finally {
      setToggling(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="cupones-page">
      <header className="cupones-header">
        <div className="cupones-header__icon">
          <span className="material-symbols-outlined">local_activity</span>
        </div>
        <div>
          <h1 className="cupones-header__titulo">Cupones de Descuento</h1>
          <p className="cupones-header__sub">
            Creá y gestioná cupones de descuento para campañas y promociones.
          </p>
        </div>
      </header>

      {errorGlobal && (
        <div className="cupones-alert cupones-alert--error" role="alert">
          <span className="material-symbols-outlined">error</span>
          {errorGlobal}
        </div>
      )}

      <div className="cupones-grid">
        {/* ── Formulario de creación ── */}
        <section className="cupones-card" aria-labelledby="form-cupones-titulo">
          <h2 id="form-cupones-titulo" className="cupones-card__titulo">
            <span className="material-symbols-outlined">add_circle</span>
            Nuevo Cupón
          </h2>

          <form id="form-crear-cupon" className="cupones-form" onSubmit={handleSubmit} noValidate>
            <div className="cupones-form__field">
              <label htmlFor="cupon-codigo" className="cupones-form__label">
                Código <span aria-hidden="true">*</span>
              </label>
              <input
                id="cupon-codigo"
                name="codigo"
                type="text"
                className="cupones-form__input"
                placeholder="Ej: VERANO25"
                value={form.codigo}
                onChange={handleChange}
                maxLength={50}
                autoComplete="off"
                spellCheck={false}
                required
              />
              <span className="cupones-form__hint">
                Solo letras, números, guiones y guiones bajos. Se guarda en mayúsculas.
              </span>
            </div>

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
                  Valor <span aria-hidden="true">*</span>
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
                    placeholder={form.tipo === 'porcentaje' ? '10' : '500'}
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

            <div className="cupones-form__checks">
              <label className="cupones-form__check" htmlFor="cupon-uso-unico">
                <input
                  id="cupon-uso-unico"
                  name="usoUnicoPorPersona"
                  type="checkbox"
                  className="cupones-form__checkbox"
                  checked={form.usoUnicoPorPersona}
                  onChange={handleChange}
                />
                <span className="cupones-form__check-mark" />
                <span>Uso único por persona</span>
              </label>

              <label className="cupones-form__check" htmlFor="cupon-activo">
                <input
                  id="cupon-activo"
                  name="activo"
                  type="checkbox"
                  className="cupones-form__checkbox"
                  checked={form.activo}
                  onChange={handleChange}
                />
                <span className="cupones-form__check-mark" />
                <span>Activo al crear</span>
              </label>
            </div>

            {errorForm && (
              <div className="cupones-alert cupones-alert--error cupones-alert--inline" role="alert">
                <span className="material-symbols-outlined">error</span>
                {errorForm}
              </div>
            )}
            {exito && (
              <div className="cupones-alert cupones-alert--ok cupones-alert--inline" role="status">
                <span className="material-symbols-outlined">check_circle</span>
                {exito}
              </div>
            )}

            <button
              id="btn-crear-cupon"
              type="submit"
              className="cupones-btn cupones-btn--primary"
              disabled={enviando}
            >
              {enviando ? (
                <>
                  <span className="cupones-spinner" aria-hidden="true" />
                  Creando…
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

        {/* ── Tabla de cupones ── */}
        <section className="cupones-card cupones-card--tabla" aria-labelledby="tabla-cupones-titulo">
          <h2 id="tabla-cupones-titulo" className="cupones-card__titulo">
            <span className="material-symbols-outlined">list</span>
            Cupones existentes
            {!cargando && (
              <span className="cupones-badge">{cupones.length}</span>
            )}
          </h2>

          {cargando ? (
            <div className="cupones-loading" aria-label="Cargando cupones">
              <span className="cupones-spinner cupones-spinner--lg" aria-hidden="true" />
              <span>Cargando cupones…</span>
            </div>
          ) : cupones.length === 0 ? (
            <div className="cupones-empty">
              <span className="material-symbols-outlined cupones-empty__icono">
                confirmation_number
              </span>
              <p>No hay cupones cargados todavía.</p>
              <p className="cupones-empty__sub">
                Usá el formulario para crear el primero.
              </p>
            </div>
          ) : (
            <div className="cupones-tabla-wrapper">
              <table className="cupones-tabla" aria-label="Lista de cupones de descuento">
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Valor</th>
                    <th scope="col">Desde</th>
                    <th scope="col">Hasta</th>
                    <th scope="col">Uso único</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cupones.map((cupon) => (
                    <tr
                      key={cupon.id}
                      className={`cupones-tabla__fila ${!cupon.activo ? 'cupones-tabla__fila--inactivo' : ''}`}
                    >
                      <td>
                        <span className="cupones-codigo">{cupon.codigo}</span>
                      </td>
                      <td>
                        <span className={`cupones-tipo cupones-tipo--${cupon.tipo}`}>
                          {cupon.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                        </span>
                      </td>
                      <td className="cupones-valor">
                        {formatearValor(cupon.tipo, cupon.valor)}
                      </td>
                      <td>{formatearFecha(cupon.fechaInicio)}</td>
                      <td>{formatearFecha(cupon.fechaFin)}</td>
                      <td>
                        {cupon.usoUnicoPorPersona ? (
                          <span className="cupones-pill cupones-pill--si">Sí</span>
                        ) : (
                          <span className="cupones-pill cupones-pill--no">No</span>
                        )}
                      </td>
                      <td>
                        <button
                          id={`btn-toggle-cupon-${cupon.id}`}
                          className={`cupones-toggle ${cupon.activo ? 'cupones-toggle--activo' : 'cupones-toggle--inactivo'}`}
                          onClick={() => handleToggleActivo(cupon)}
                          disabled={toggling === cupon.id}
                          aria-label={`${cupon.activo ? 'Desactivar' : 'Activar'} cupón ${cupon.codigo}`}
                          title={cupon.activo ? 'Clic para desactivar' : 'Clic para activar'}
                        >
                          {toggling === cupon.id ? (
                            <span className="cupones-spinner cupones-spinner--sm" aria-hidden="true" />
                          ) : (
                            <span className="material-symbols-outlined">
                              {cupon.activo ? 'toggle_on' : 'toggle_off'}
                            </span>
                          )}
                          {cupon.activo ? 'Activo' : 'Inactivo'}
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
