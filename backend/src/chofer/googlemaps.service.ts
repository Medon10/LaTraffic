import { HttpError } from '../shared/middleware/error-handler.middleware.js';

// ────────────────────────────────────────────
// Tipos internos del servicio
// ────────────────────────────────────────────

/** Waypoint con coordenadas exactas (parada fija con lat/lon en BD). */
export interface WaypointCoords {
  tipo: 'coords';
  label: string;
  lat: number;
  lng: number;
}

/** Waypoint como string de dirección (domicilio ingresado por el pasajero). */
export interface WaypointAddress {
  tipo: 'address';
  label: string;
  address: string;
}

export type Waypoint = WaypointCoords | WaypointAddress;

/** Parada en el orden ya optimizado por Google Maps. */
export interface ParadaOrdenada {
  /** Posición en la ruta (0-indexed, después de origen). */
  posicion: number;
  label: string;
  /** Coordenadas si el waypoint era de tipo 'coords'. */
  lat?: number;
  lng?: number;
  /** Dirección textual si era de tipo 'address'. */
  address?: string;
}

export interface GoogleMapsRutaResult {
  /** Paradas intermedias en el orden optimizado sugerido por Google. */
  ordenOptimizado: ParadaOrdenada[];
  /**
   * Índices originales en el orden optimizado (waypoint_order de la API).
   * Útil para reordenar arrays en el cliente.
   */
  waypointOrder: number[];
  /**
   * Deeplink para abrir la ruta directamente en la app de Google Maps.
   * Waypoints ya en el orden optimizado.
   */
  mapsDeepLink: string;
  /**
   * Encoded polyline de la ruta completa (overview_polyline).
   * Disponible para renderizar en un mapa en el frontend si se desea.
   */
  polyline: string;
  /** Distancia total estimada en metros. */
  distanciaMetros: number;
  /** Duración estimada en segundos. */
  duracionSegundos: number;
}

// ────────────────────────────────────────────
// Helpers de serialización
// ────────────────────────────────────────────

/**
 * Convierte un Waypoint al formato que acepta la Directions API como string.
 * - Coords → "lat,lng"
 * - Address → string directo (Google geocodifica inline)
 */
function serializarWaypoint(wp: Waypoint): string {
  return wp.tipo === 'coords' ? `${wp.lat},${wp.lng}` : wp.address;
}

/**
 * Arma el parámetro `waypoints` para la Directions API:
 * "optimize:true|<wp1>|<wp2>|..."
 */
function armarParamWaypoints(waypoints: Waypoint[]): string {
  const serialized = waypoints.map(serializarWaypoint).join('|');
  return `optimize:true|${serialized}`;
}

/**
 * Construye el deeplink de Google Maps con los waypoints ya en el orden
 * optimizado que devolvió la API.
 *
 * Formato: https://www.google.com/maps/dir/?api=1&origin=...&destination=...
 *          &waypoints=wp1|wp2|...&travelmode=driving
 */
function armarDeepLink(
  origen: string,
  destino: string,
  waypointsOrdenados: string[]
): string {
  const base = 'https://www.google.com/maps/dir/?api=1';
  const params = new URLSearchParams({
    origin: origen,
    destination: destino,
    travelmode: 'driving',
  });
  if (waypointsOrdenados.length > 0) {
    params.set('waypoints', waypointsOrdenados.join('|'));
  }
  return `${base}&${params.toString()}`;
}

// ────────────────────────────────────────────
// Servicio principal
// ────────────────────────────────────────────

/**
 * GoogleMapsService — T-08 (diseno-arquitectura.md §9)
 *
 * Llama a la Directions API de Google Maps con `optimize_waypoints=true`
 * para calcular el orden óptimo de paradas intermedias de un viaje.
 *
 * Requiere la variable de entorno GOOGLE_MAPS_API_KEY con la
 * Directions API habilitada en Google Cloud Console.
 */
export class GoogleMapsService {
  private readonly apiKey: string;
  private readonly baseUrl =
    'https://maps.googleapis.com/maps/api/directions/json';

  constructor() {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key || key.trim() === '') {
      // Se valida en runtime para no romper el arranque del server si la
      // clave no está configurada en dev; el error se lanza al usar el método.
      this.apiKey = '';
    } else {
      this.apiKey = key.trim();
    }
  }

  /**
   * Calcula la ruta óptima entre origen y destino con los waypoints intermedios.
   *
   * @param origen  - Punto de partida del viaje (string de dirección o "lat,lng").
   * @param destino - Punto de llegada del viaje.
   * @param waypoints - Lista de paradas intermedias (paradas fijas + domicilios).
   * @returns Resultado con el orden optimizado, deeplink y polyline.
   *
   * @throws HttpError 503 si GOOGLE_MAPS_API_KEY no está configurada.
   * @throws HttpError 502 si la API de Google devuelve un estado de error.
   */
  async calcularRuta(
    origen: string,
    destino: string,
    waypoints: Waypoint[]
  ): Promise<GoogleMapsRutaResult> {
    if (!this.apiKey) {
      throw new HttpError(
        503,
        'El servicio de mapas no está disponible: falta configurar GOOGLE_MAPS_API_KEY.'
      );
    }

    // Construir URL de la Directions API
    const params = new URLSearchParams({
      origin: origen,
      destination: destino,
      key: this.apiKey,
      language: 'es',
    });

    if (waypoints.length > 0) {
      params.set('waypoints', armarParamWaypoints(waypoints));
    }

    const url = `${this.baseUrl}?${params.toString()}`;

    let data: any;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al llamar a Directions API`);
      }
      data = await response.json();
    } catch (err: any) {
      console.error('[GoogleMapsService] Error de red:', err?.message);
      throw new HttpError(
        502,
        'No se pudo comunicar con la API de Google Maps. Intentá de nuevo en unos segundos.'
      );
    }

    // La Directions API siempre devuelve 200 HTTP; el error real está en `status`
    if (data.status !== 'OK') {
      console.error('[GoogleMapsService] Status no OK:', data.status, data.error_message);
      const mensajesConocidos: Record<string, string> = {
        NOT_FOUND: 'No se encontró una ruta entre los puntos indicados.',
        ZERO_RESULTS: 'No se encontraron resultados de ruta para los puntos indicados.',
        MAX_WAYPOINTS_EXCEEDED: 'Se superó el límite de paradas intermedias permitidas por Google Maps.',
        INVALID_REQUEST: 'La solicitud de ruta contiene datos inválidos.',
        REQUEST_DENIED: 'La API Key no tiene permiso para usar la Directions API.',
        OVER_DAILY_LIMIT: 'Se superó el límite diario de la API de Google Maps.',
        OVER_QUERY_LIMIT: 'Se superó el límite de consultas de la API de Google Maps.',
      };
      throw new HttpError(
        502,
        mensajesConocidos[data.status] ??
          `La API de Google Maps devolvió un error: ${data.status}.`
      );
    }

    const ruta = data.routes[0];
    const legs: any[] = ruta.legs ?? [];

    // Extraer orden optimizado (vacío si no hubo waypoints)
    const waypointOrder: number[] = ruta.waypoint_order ?? [];

    // Reordenar waypoints según el orden optimizado
    const waypointsOrdenados: Waypoint[] = waypointOrder.map(
      (i) => waypoints[i]
    );

    const ordenOptimizado: ParadaOrdenada[] = waypointsOrdenados.map(
      (wp, posicion) => {
        const base: ParadaOrdenada = { posicion, label: wp.label };
        if (wp.tipo === 'coords') {
          base.lat = wp.lat;
          base.lng = wp.lng;
        } else {
          base.address = wp.address;
        }
        return base;
      }
    );

    // Distancia y duración totales (suma de todos los tramos)
    const distanciaMetros = legs.reduce(
      (acc: number, leg: any) => acc + (leg.distance?.value ?? 0),
      0
    );
    const duracionSegundos = legs.reduce(
      (acc: number, leg: any) => acc + (leg.duration?.value ?? 0),
      0
    );

    // Deeplink con waypoints ya en el orden optimizado
    const serializedOrdenados = waypointsOrdenados.map(serializarWaypoint);
    const mapsDeepLink = armarDeepLink(origen, destino, serializedOrdenados);

    return {
      ordenOptimizado,
      waypointOrder,
      mapsDeepLink,
      polyline: ruta.overview_polyline?.points ?? '',
      distanciaMetros,
      duracionSegundos,
    };
  }
}
