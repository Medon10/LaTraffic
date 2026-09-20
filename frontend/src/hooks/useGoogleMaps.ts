import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Carga el script de Google Maps JavaScript API dinámicamente (una sola vez).
 * Usa la variable de entorno VITE_GOOGLE_MAPS_API_KEY.
 *
 * Retorna el estado de carga del script.
 */
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    // Ya cargado globalmente (evita duplicar el script en re-renders o HMR)
    if (window.google?.maps || loadedRef.current) {
      setIsLoaded(true);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      setError('Falta configurar VITE_GOOGLE_MAPS_API_KEY en el frontend.');
      return;
    }

    loadedRef.current = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es&region=AR`;
    script.async = true;
    script.defer = true;

    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      setError('No se pudo cargar el mapa. Verificá tu conexión e intentá de nuevo.');
      loadedRef.current = false;
    };

    document.head.appendChild(script);

    return () => {
      // No removemos el script al desmontar porque Google Maps es global
    };
  }, []);

  return { isLoaded, error };
}

// ── Tipos de resultado del MapaPicker ────────────────────────────────────────

export interface MapaPickerResult {
  direccion: string;
  lat: number;
  lng: number;
}

// Centro inicial: Rosario, Argentina
const DEFAULT_CENTER = { lat: -32.9468, lng: -60.6393 };

/**
 * Hook que inicializa un mapa de Google Maps con un marcador arrastrable
 * y un Autocomplete sobre el input, y devuelve la ubicación seleccionada.
 */
export function useMapaPicker(
  mapContainerRef: React.RefObject<HTMLDivElement | null>,
  inputRef: React.RefObject<HTMLInputElement | null>,
  isLoaded: boolean,
  onChange: (result: MapaPickerResult) => void
) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const updateFromLatLng = useCallback(
    (lat: number, lng: number, geocode = false) => {
      if (!mapRef.current || !markerRef.current) return;

      const pos = { lat, lng };
      markerRef.current.setPosition(pos);
      mapRef.current.panTo(pos);

      if (geocode) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: pos }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            const addr = results[0].formatted_address;
            if (inputRef.current) inputRef.current.value = addr;
            onChange({ direccion: addr, lat, lng });
          } else {
            onChange({ direccion: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng });
          }
        });
      }
    },
    [inputRef, onChange]
  );

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !inputRef.current) return;
    if (mapRef.current) return; // ya inicializado

    // Inicializar el mapa
    const map = new google.maps.Map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });
    mapRef.current = map;

    // Marcador arrastrable
    const marker = new google.maps.Marker({
      position: DEFAULT_CENTER,
      map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      title: 'Arrastrá el pin para ajustar la ubicación',
    });
    markerRef.current = marker;

    // Click en el mapa → mover el pin
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      updateFromLatLng(e.latLng.lat(), e.latLng.lng(), true);
    });

    // Drag del marcador → geocodificar y actualizar
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (!pos) return;
      updateFromLatLng(pos.lat(), pos.lng(), true);
    });

    // Autocomplete de Places sobre el input
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current!, {
      componentRestrictions: { country: 'ar' },
      fields: ['formatted_address', 'geometry'],
    });
    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const addr = place.formatted_address ?? inputRef.current?.value ?? '';

      updateFromLatLng(lat, lng, false);
      onChange({ direccion: addr, lat, lng });
    });

    // Geolocalización opcional: centrar en ubicación actual si el usuario la permite
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          map.setCenter({ lat, lng });
          marker.setPosition({ lat, lng });
        },
        () => {
          // Sin permiso → quedamos en el centro por defecto (Rosario)
        },
        { timeout: 3000 }
      );
    }
  }, [isLoaded, mapContainerRef, inputRef, updateFromLatLng, onChange]);

  return { mapRef, markerRef };
}
