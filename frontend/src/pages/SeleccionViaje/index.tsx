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
  const fecha = searchParams.get('fecha') || 'Próxima salida';
  const hora = searchParams.get('hora') || '18:00 hs';

  // Verificar si alguna de las paradas es intermedia
  const esParadaIntermedia =
    origen.includes('Hughes') ||
    origen.includes('Wheelwright') ||
    destino.includes('Hughes') ||
    destino.includes('Wheelwright');

  // Opciones de viajes demostrativas según el sentido y horario elegido
  const viajes: ViajeOpcion[] = [
    {
      id: 1,
      salida: hora,
      llegada: hora.startsWith('18') ? '20:15 hs' : '15:15 hs',
      origen,
      destino,
      precio: 9500,
      cuposDisponibles: 5,
      tipoVehiculo: 'Mercedes-Benz Sprinter (Ejecutiva)',
    },
  ];

  return (
    <div className="page-container">
      {/* Resumen del tramo seleccionado */}
      <div
        style={{
          backgroundColor: 'var(--surface-container-low)',
          border: '1px solid var(--surface-variant)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.15rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tramo Seleccionado &bull; {fecha}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
            {origen} &rarr; {destino}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '2px' }}>
            1 pasaje nominativo
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

      {/* Aviso de parada intermedia si corresponde (HU-05) */}
      {esParadaIntermedia && (
        <div
          style={{
            backgroundColor: '#fff8e1',
            border: '1px solid #ffe082',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.825rem',
            color: '#795548',
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#f57f17' }}>info</span>
          <div>
            En pueblos intermedios (Hughes, Wheelwright), el punto de encuentro es fijo sobre la ruta (no es puerta a puerta).
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
          Servicio Disponible
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          Horario fijo semanal
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
              gap: '0.85rem',
              borderLeft: '4px solid var(--secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                  }}
                >
                  {viaje.salida}
                </span>
                <span style={{ margin: '0 0.5rem', color: 'var(--outline)' }}>&rarr;</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                  {viaje.llegada}
                </span>
                <div style={{ fontSize: '0.8rem', color: 'var(--outline)', marginTop: '2px' }}>
                  {viaje.tipoVehiculo}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  ${viaje.precio.toLocaleString('es-AR')}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>pasaje individual</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px', color: viaje.cuposDisponibles <= 2 ? 'var(--error)' : 'var(--secondary)' }}
                >
                  airline_seat_recline_extra
                </span>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: viaje.cuposDisponibles <= 2 ? 'var(--error)' : 'var(--on-surface-variant)',
                  }}
                >
                  {viaje.cuposDisponibles} {viaje.cuposDisponibles === 1 ? 'butaca libre' : 'butacas libres'}
                </span>
              </div>

              <Link
                to={`/checkout?viajeId=${viaje.id}&origen=${encodeURIComponent(origen)}&destino=${encodeURIComponent(destino)}&fecha=${encodeURIComponent(fecha)}&hora=${encodeURIComponent(viaje.salida)}`}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.15rem', fontSize: '0.9rem' }}
              >
                Reservar Butaca
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeleccionViajePage;
