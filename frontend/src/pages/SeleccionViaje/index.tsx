import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

interface ViajeOpcion {
  id: number;
  salida: string;
  llegada: string;
  origen: string;
  destino: string;
  precio: number;
  cuposDisponibles: number;
  tipoVehiculo: string;
}

export const SeleccionViajePage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const origen = searchParams.get('origen') || 'Colón (Base)';
  const destino = searchParams.get('destino') || 'Rosario (Domicilio)';
  const fecha = searchParams.get('fecha') || 'Hoy';
  const pasajeros = searchParams.get('pasajeros') || '1';

  // Opciones de viajes demostrativas
  const viajes: ViajeOpcion[] = [
    {
      id: 1,
      salida: '06:30 hs',
      llegada: '08:45 hs',
      origen,
      destino,
      precio: 9500,
      cuposDisponibles: 4,
      tipoVehiculo: 'Mercedes-Benz Sprinter (Ejecutiva)',
    },
    {
      id: 2,
      salida: '13:00 hs',
      llegada: '15:15 hs',
      origen,
      destino,
      precio: 9500,
      cuposDisponibles: 8,
      tipoVehiculo: 'Mercedes-Benz Sprinter (Ejecutiva)',
    },
    {
      id: 3,
      salida: '18:30 hs',
      llegada: '20:45 hs',
      origen,
      destino,
      precio: 9500,
      cuposDisponibles: 2,
      tipoVehiculo: 'Mercedes-Benz Sprinter (Ejecutiva)',
    },
  ];

  return (
    <div className="page-container">
      {/* Resumen del tramo buscado */}
      <div
        style={{
          backgroundColor: 'var(--surface-container-low)',
          border: '1px solid var(--surface-variant)',
          borderRadius: 'var(--radius-xl)',
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--outline)', textTransform: 'uppercase' }}>
            Tramo seleccionado &bull; {fecha}
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
            {origen} &rarr; {destino}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
            {pasajeros} {Number(pasajeros) === 1 ? 'pasajero' : 'pasajeros'}
          </div>
        </div>
        <Link
          to="/"
          className="btn btn-outline"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
        >
          Modificar
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
          Horarios Disponibles
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          {viajes.length} servicios
        </span>
      </div>

      {/* Lista de viajes disponibles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {viajes.map((viaje) => (
          <div
            key={viaje.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              borderLeft: '4px solid var(--secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                  }}
                >
                  {viaje.salida}
                </span>
                <span style={{ margin: '0 0.5rem', color: 'var(--outline)' }}>&rarr;</span>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                  {viaje.llegada}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  ${viaje.precio.toLocaleString('es-AR')}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>por pasajero</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px', color: viaje.cuposDisponibles <= 2 ? 'var(--error)' : 'var(--secondary)' }}
                >
                  airline_seat_recline_extra
                </span>
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: viaje.cuposDisponibles <= 2 ? 'var(--error)' : 'var(--on-surface-variant)',
                  }}
                >
                  {viaje.cuposDisponibles} {viaje.cuposDisponibles === 1 ? 'asiento restante' : 'asientos restantes'}
                </span>
              </div>

              <Link
                to={`/checkout?viajeId=${viaje.id}&origen=${encodeURIComponent(origen)}&destino=${encodeURIComponent(destino)}`}
                className="btn btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}
              >
                Seleccionar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeleccionViajePage;
