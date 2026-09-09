import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const origen = searchParams.get('origen') || 'Colón (Terminal / Base)';
  const destino = searchParams.get('destino') || 'Rosario (Domicilio)';
  const fecha = searchParams.get('fecha') || 'Próximo Viernes';
  const hora = searchParams.get('hora') || '18:00 hs';
  const precio = searchParams.get('precio') || '9500';

  return (
    <div className="page-container">
      <div className="badge">Paso Final</div>
      <h1>Confirmación de Reserva</h1>
      <p className="subtitle">
        Revisá los datos de tu viaje antes de completar la reserva nominativa.
      </p>

      {/* Resumen del Pasaje */}
      <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>
              Viaje programado &bull; 1 butaca
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
              {origen} &rarr; {destino}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
              {fecha} &bull; Salida {hora}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
              ${Number(precio).toLocaleString('es-AR')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>total a pagar</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--surface-variant)', paddingTop: '0.75rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--whatsapp-color)', fontSize: '18px' }}>check_circle</span>
            <span>Servicio puerta a puerta garantizado en Rosario.</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)' }}>Métodos de Pago Disponibles</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
          Podés abonar mediante transferencia con descuento, efectivo al subir o Mercado Pago con tarjeta de débito/crédito.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-outline">&larr; Modificar datos</Link>
          <Link to="/mis-reservas" className="btn btn-primary">Confirmar y Pagar &rarr;</Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
