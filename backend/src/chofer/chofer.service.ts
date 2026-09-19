import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Viaje } from '../viajes/viaje.entity.js';
import { EstadoPasaje } from '../shared/types/index.js';
import { HttpError } from '../shared/middleware/error-handler.middleware.js';
import {
  GoogleMapsService,
  GoogleMapsRutaResult,
  Waypoint,
} from './googlemaps.service.js';

export interface ParadaRuta {
  posicion: number;
  label: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface RutaViajeResult {
  viajeId: number;
  fecha: string;
  sentido: string;
  /** Cantidad de pasajes confirmados en el viaje. */
  pasajesConfirmados: number;
  /** Lista de paradas intermedias en el orden optimizado por Maps. */
  paradas: ParadaRuta[];
  /** Null si no hay pasajes confirmados (sin necesidad de llamar a Maps). */
  ruta: GoogleMapsRutaResult | null;
  /** Mensaje informativo si no se pudo calcular la ruta. */
  mensaje?: string;
}

/**
 * ChoferService — T-08 (diseno-arquitectura.md §9)
 *
 * obtenerRuta:
 *   1. Carga el viaje con sus pasajes confirmados y sus paradas/domicilios.
 *   2. Recolecta waypoints únicos (paradas fijas con coords + domicilios como strings).
 *   3. Si hay waypoints, delega a GoogleMapsService.calcularRuta() con el
 *      origen/destino fijo según el sentido del viaje (Colón ↔ Rosario).
 *   4. Devuelve el orden optimizado y el deeplink para abrir en la app de Maps.
 */
export class ChoferService {
  constructor(
    private readonly mapsService: GoogleMapsService = new GoogleMapsService()
  ) {}

  private getEm(): EntityManager {
    const em = RequestContext.getEntityManager() as EntityManager;
    if (!em) throw new Error('No se encontró EntityManager en el contexto actual');
    return em;
  }

  /**
   * Calcula la ruta optimizada para un viaje dado.
   *
   * Recolecta todos los puntos de origen/destino de los pasajes confirmados
   * y llama a la Directions API de Google Maps con optimize_waypoints=true.
   *
   * @param viajeId - ID del viaje a procesar.
   */
  async obtenerRuta(viajeId: number): Promise<RutaViajeResult> {
    const em = this.getEm();

    // Cargar el viaje con horario + pasajes confirmados + sus paradas y usuarios
    const viaje = await em.findOne(
      Viaje,
      { id: viajeId },
      {
        populate: [
          'horario',
          'pasajes',
          'pasajes.paradaOrigen',
          'pasajes.paradaDestino',
        ],
      }
    );

    if (!viaje) {
      throw new HttpError(404, 'Viaje no encontrado');
    }

    // Filtrar solo pasajes confirmados (RF-16)
    const pasajesConfirmados = viaje.pasajes
      .getItems()
      .filter((p) => p.estado === EstadoPasaje.CONFIRMADA);

    // Determinar extremos fijos del viaje según sentido del horario
    const sentido = viaje.horario.sentido;
    const [origenViaje, destinoViaje] =
      sentido === 'colon_rosario'
        ? ['Colón, Entre Ríos, Argentina', 'Rosario, Santa Fe, Argentina']
        : ['Rosario, Santa Fe, Argentina', 'Colón, Entre Ríos, Argentina'];

    if (pasajesConfirmados.length === 0) {
      return {
        viajeId,
        fecha: viaje.fecha,
        sentido,
        pasajesConfirmados: 0,
        paradas: [],
        ruta: null,
        mensaje: 'El viaje no tiene pasajes confirmados. No se calculó ruta.',
      };
    }

    // ── Recolectar waypoints únicos ──────────────────────────────────────────
    // Usamos un Set de claves para deduplicar paradas idénticas
    // (ej: dos pasajeros con la misma parada de origen no generan el mismo punto dos veces).
    const seen = new Set<string>();
    const waypoints: Waypoint[] = [];

    for (const pasaje of pasajesConfirmados) {
      // Origen del pasaje
      if (pasaje.paradaOrigen) {
        const p = pasaje.paradaOrigen;
        const lat = Number(p.latitud);
        const lng = Number(p.longitud);

        if (!isNaN(lat) && !isNaN(lng)) {
          // Parada fija con coordenadas → máxima precisión
          const key = `coords:${lat},${lng}`;
          if (!seen.has(key)) {
            seen.add(key);
            waypoints.push({ tipo: 'coords', label: p.nombre, lat, lng });
          }
        } else {
          // Parada sin coords → fallback al nombre como dirección
          const key = `address:${p.nombre}`;
          if (!seen.has(key)) {
            seen.add(key);
            waypoints.push({ tipo: 'address', label: p.nombre, address: p.nombre });
          }
        }
      } else if (pasaje.domicilioOrigen) {
        const key = `address:${pasaje.domicilioOrigen.trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          waypoints.push({
            tipo: 'address',
            label: pasaje.domicilioOrigen,
            address: pasaje.domicilioOrigen,
          });
        }
      }

      // Destino del pasaje
      if (pasaje.paradaDestino) {
        const p = pasaje.paradaDestino;
        const lat = Number(p.latitud);
        const lng = Number(p.longitud);

        if (!isNaN(lat) && !isNaN(lng)) {
          const key = `coords:${lat},${lng}`;
          if (!seen.has(key)) {
            seen.add(key);
            waypoints.push({ tipo: 'coords', label: p.nombre, lat, lng });
          }
        } else {
          const key = `address:${p.nombre}`;
          if (!seen.has(key)) {
            seen.add(key);
            waypoints.push({ tipo: 'address', label: p.nombre, address: p.nombre });
          }
        }
      } else if (pasaje.domicilioDestino) {
        const key = `address:${pasaje.domicilioDestino.trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          waypoints.push({
            tipo: 'address',
            label: pasaje.domicilioDestino,
            address: pasaje.domicilioDestino,
          });
        }
      }
    }

    // Si todos los pasajes tienen las mismas paradas fijas extremas (ej. toda la ruta),
    // puede que no haya waypoints intermedios genuinos — igual dejamos que Maps los calcule.
    const ruta = await this.mapsService.calcularRuta(
      origenViaje,
      destinoViaje,
      waypoints
    );

    return {
      viajeId,
      fecha: viaje.fecha,
      sentido,
      pasajesConfirmados: pasajesConfirmados.length,
      paradas: ruta.ordenOptimizado.map((p) => ({
        posicion: p.posicion,
        label: p.label,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
      })),
      ruta,
    };
  }
}
