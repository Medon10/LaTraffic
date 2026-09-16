import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { SentidoViaje } from '../types/index.ts';

export function useCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sentidoParam = searchParams.get('sentido');
  const sentido: SentidoViaje = sentidoParam === 'rosario-colon' ? 'rosario-colon' : 'colon-rosario';
  const esColonRosario = sentido === 'colon-rosario';

  const origenParam = searchParams.get('origen') || (esColonRosario ? 'Colón — Terminal / Base' : 'Rosario (domicilio)');
  const destinoParam = searchParams.get('destino') || (esColonRosario ? 'Rosario (domicilio)' : 'Colón — Terminal / Base');
  const fecha = searchParams.get('fecha') || '2026-09-18';
  const horaParam = searchParams.get('hora');
  const hora = horaParam || (esColonRosario ? '18:00 hs' : '21:30 hs');
  const precio = Number(searchParams.get('precio')) || 9500;
  const direccionRosarioParam = searchParams.get('direccionRosario') || '';

  const paradaFija = esColonRosario ? origenParam : destinoParam;

  const paradaOrigenLabel = esColonRosario
    ? 'Punto de subida (Punto Fijo)'
    : 'Punto de bajada (Punto Fijo)';

  const labelDireccion = esColonRosario
    ? 'Domicilio de destino en Rosario'
    : 'Domicilio de partida en Rosario';

  const placeholderDir = esColonRosario
    ? 'Calle, altura, piso o lugar (ej: Pellegrini 1450)'
    : 'Calle, altura, piso/depto (ej: San Lorenzo 1120)';

  const [direccionRosario, setDireccionRosario] = useState(direccionRosarioParam);
  const [errorDir, setErrorDir] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectUrl = useMemo(() => {
    return `/checkout?${searchParams.toString()}`;
  }, [searchParams]);

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!direccionRosario.trim()) {
      setErrorDir(true);
      return;
    }
    setLoading(true);
    // Aquí irá la llamada a la API de reservas (HU-08/09/10)
    setTimeout(() => {
      navigate('/mis-reservas');
    }, 600);
  };

  return {
    sentido,
    esColonRosario,
    origenParam,
    destinoParam,
    fecha,
    hora,
    precio,
    paradaFija,
    paradaOrigenLabel,
    labelDireccion,
    placeholderDir,
    direccionRosario,
    setDireccionRosario,
    errorDir,
    setErrorDir,
    loading,
    redirectUrl,
    handleConfirmar,
  };
}
