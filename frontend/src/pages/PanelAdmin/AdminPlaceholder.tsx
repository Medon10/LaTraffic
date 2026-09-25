import React from 'react';

/**
 * Placeholder genérico para secciones del panel admin que todavía
 * no están implementadas (HU-16 a HU-23).
 *
 * Recibe el nombre de la sección, el ícono de Material Symbols y el
 * número de historia de usuario pendiente para dar contexto.
 */
interface PlaceholderProps {
  titulo: string;
  icono: string;
  hu?: string;
  descripcion?: string;
}

export const AdminPlaceholder: React.FC<PlaceholderProps> = ({
  titulo,
  icono,
  hu,
  descripcion,
}) => {
  return (
    <section className="admin-placeholder" aria-labelledby="placeholder-titulo">
      <span
        className="material-symbols-outlined admin-placeholder__icono"
        aria-hidden="true"
      >
        {icono}
      </span>

      {hu && (
        <span className="admin-placeholder__badge">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            pending
          </span>
          {hu}
        </span>
      )}

      <h1 id="placeholder-titulo" className="admin-placeholder__titulo">
        {titulo}
      </h1>

      <p className="admin-placeholder__subtitulo">
        {descripcion ??
          'Esta sección está en desarrollo y estará disponible próximamente.'}
      </p>
    </section>
  );
};

export default AdminPlaceholder;
