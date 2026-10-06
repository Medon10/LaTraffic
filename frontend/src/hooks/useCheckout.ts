import { useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { SentidoViaje } from '../types/index.ts';
import { validarCupon } from '../services/cupones.service.ts';
import { pasajesService } from '../services/pasajes.service.ts';
import { ApiError } from '../shared/api.ts';
import type { MapaPickerResult } from '../componentes/MapaPicker.tsx';

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
  const viajeId = Number(searchParams.get('viaje_id')) || 0;
  const paradaOrigenId = searchParams.get('parada_origen_id') ? Number(searchParams.get('parada_origen_id')) : undefined;
  const paradaDestinoId = searchParams.get('parada_destino_id') ? Number(searchParams.get('parada_destino_id')) : undefined;
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
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const [latDomicilio, setLatDomicilio] = useState<number | null>(latParam ? Number(latParam) : null);
  const [lonDomicilio, setLonDomicilio] = useState<number | null>(lngParam ? Number(lngParam) : null);
  const [errorDir, setErrorDir] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Handler unificado para el MapaPicker:
   * actualiza la dirección en texto y las coordenadas.
   * Si lat/lng son 0 (limpiado o fallback sin mapa), los trata como nulos.
   */
  const handleDireccionChange = (result: MapaPickerResult) => {
    setDireccionRosario(result.direccion);
    if (result.direccion && result.lat !== 0 && result.lng !== 0) {
      setLatDomicilio(result.lat);
      setLonDomicilio(result.lng);
    } else {
      setLatDomicilio(null);
      setLonDomicilio(null);
    }
    if (errorDir) setErrorDir(false);
  };

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

  const [errorApiReserva, setErrorApiReserva] = useState<string | null>(null);

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    // Bloqueo síncrono inmediato: si ya está procesando, ignora cualquier click posterior
    if (isSubmittingRef.current || loading) return;

    if (!direccionRosario.trim()) {
      setErrorDir(true);
      return;
    }

    if (!viajeId || viajeId <= 0) {
      setErrorApiReserva('El viaje seleccionado no es válido o ha expirado. Por favor volvé a la pantalla de selección de viaje.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorApiReserva(null);

    try {
      // Armar el payload según sentido:
      // colon-rosario: origen = parada fija (paradaOrigenId), destino = domicilio Rosario
      // rosario-colon: origen = domicilio Rosario,             destino = parada fija (paradaDestinoId)
      const hayCoords = latDomicilio !== null && lonDomicilio !== null;

      const payload = esColonRosario
        ? {
            viaje_id: viajeId,
            metodo_pago: 'efectivo' as const, // TODO: reemplazar con el valor del step de pago (HU-08/09/10)
            monto: precioFinal,
            parada_origen_id: paradaOrigenId,
            domicilio_destino: direccionRosario,
            ...(hayCoords && { lat_destino: latDomicilio!, lon_destino: lonDomicilio! }),
            ...(cuponId && { codigo_cupon: codigoCupon }),
          }
        : {
            viaje_id: viajeId,
            metodo_pago: 'efectivo' as const,
            monto: precioFinal,
            domicilio_origen: direccionRosario,
            ...(hayCoords && { lat_origen: latDomicilio!, lon_origen: lonDomicilio! }),
            parada_destino_id: paradaDestinoId,
            ...(cuponId && { codigo_cupon: codigoCupon }),
          };

      await pasajesService.crearPasaje(payload);
      navigate('/mis-reservas');
    } catch (err) {
      console.error('Error al confirmar reserva:', err);
      const mensaje =
        err instanceof ApiError
          ? err.message
          : 'No pudimos confirmar la reserva. Intentá de nuevo o contactá al equipo por WhatsApp.';
      setErrorApiReserva(mensaje);
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
    latDomicilio,
    lonDomicilio,
    handleDireccionChange,
    errorDir,
    setErrorDir,
    loading,
    redirectUrl,
    handleConfirmar,
    errorApiReserva,
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
