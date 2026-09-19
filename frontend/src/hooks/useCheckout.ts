import { useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { SentidoViaje } from '../types/index.ts';
import { validarCupon } from '../services/cupones.service.ts';
import { ApiError } from '../shared/api.ts';

// ── Tipos de estado del cupón ──────────────────────────────────────────────────

export type CuponEstado = 'idle' | 'loading' | 'valido' | 'invalido';

export function useCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Parámetros del viaje (desde URL) ────────────────────────────────────────

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

  // ── Estado del formulario ────────────────────────────────────────────────────

  const isSubmittingRef = useRef(false);
  const [direccionRosario, setDireccionRosario] = useState(direccionRosarioParam);
  const [errorDir, setErrorDir] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Estado del cupón (HU-22) ─────────────────────────────────────────────────

  const [codigoCupon, setCodigoCupon] = useState('');
  const [cuponEstado, setCuponEstado] = useState<CuponEstado>('idle');
  const [cuponMensaje, setCuponMensaje] = useState('');
  const [cuponId, setCuponId] = useState<number | null>(null);
  const [descuentoCupon, setDescuentoCupon] = useState(0);

  /** Precio final mostrado en UI: precio base menos el descuento del cupón */
  const precioFinal = Math.max(0, precio - descuentoCupon);

  /**
   * Llama al backend para validar el cupón.
   * Si es válido actualiza el descuento; si no, muestra el error inline
   * sin bloquear el flujo de reserva (HU-22, criterio 3).
   */
  const handleAplicarCupon = async () => {
    const codigo = codigoCupon.trim();
    if (!codigo) return;

    setCuponEstado('loading');
    setCuponMensaje('');

    try {
      const resultado = await validarCupon(codigo, precio);
      setCuponId(resultado.cuponId);
      setDescuentoCupon(resultado.descuento);
      setCuponEstado('valido');
      setCuponMensaje(`Cupón "${resultado.codigo}" aplicado — ${formatPeso(resultado.descuento)} de descuento`);
    } catch (err) {
      setCuponEstado('invalido');
      const mensaje =
        err instanceof ApiError
          ? err.message
          : 'No pudimos validar el cupón. Revisá el código e intentá de nuevo.';
      setCuponMensaje(mensaje);
      setCuponId(null);
      setDescuentoCupon(0);
    }
  };

  /** Quita el cupón aplicado y vuelve al precio base. */
  const handleQuitarCupon = () => {
    setCodigoCupon('');
    setCuponEstado('idle');
    setCuponMensaje('');
    setCuponId(null);
    setDescuentoCupon(0);
  };

  const redirectUrl = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `/checkout?${qs}` : '/checkout';
  }, [searchParams]);

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    // Bloqueo síncrono inmediato: si ya está procesando, ignora cualquier click posterior
    if (isSubmittingRef.current || loading) return;

    if (!direccionRosario.trim()) {
      setErrorDir(true);
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      // Llamada a la API de reservas (HU-08/09/10)
      // cuponId queda disponible para incluirlo en el payload
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigate('/mis-reservas');
    } catch (err) {
      console.error('Error al confirmar reserva:', err);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return {
    sentido,
    esColonRosario,
    origenParam,
    destinoParam,
    fecha,
    hora,
    precio,
    precioFinal,
    paradaFija,
    paradaOrigenLabel,
    labelDireccion,
    placeholderDir,
    // Form
    direccionRosario,
    setDireccionRosario,
    errorDir,
    setErrorDir,
    loading,
    redirectUrl,
    handleConfirmar,
    // Cupón (HU-22)
    codigoCupon,
    setCodigoCupon,
    cuponEstado,
    cuponMensaje,
    cuponId,
    descuentoCupon,
    handleAplicarCupon,
    handleQuitarCupon,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPeso(amount: number): string {
  return `$${Number(amount).toLocaleString('es-AR')}`;
}
