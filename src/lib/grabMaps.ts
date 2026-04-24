import maplibregl from 'maplibre-gl';

export interface MapConfig {
  apiKey: string;
  baseUrl?: string;
}

type Coordinate = [number, number];

const GRAB_MAPS_CDN = 'https://maps.grab.com/developer/assets/js/grabmaps.es.js';

let grabMapsModulePromise: Promise<any> | null = null;

async function loadGrabMapsModule(): Promise<any> {
  if (!grabMapsModulePromise) {
    grabMapsModulePromise = import(/* @vite-ignore */ GRAB_MAPS_CDN);
  }

  return grabMapsModulePromise;
}

async function fetchGrabMapsStyle(apiKey: string, baseUrl: string): Promise<any> {
  const response = await fetch(`${baseUrl}/api/style.json?theme=basic`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GrabMaps style: ${response.status}`);
  }

  return response.json();
}

function toLatLng(coordinates: Coordinate): Coordinate {
  return [coordinates[1], coordinates[0]];
}

async function waitForReady(instance: any): Promise<void> {
  if (typeof instance?.onReady !== 'function') {
    return;
  }

  await new Promise<void>((resolve) => {
    const result = instance.onReady(resolve);
    if (result?.then) {
      result.then(resolve).catch(resolve);
    }
  });
}

export class GrabMapsAPI {
  private apiKey: string;
  private baseUrl: string;
  private instance: any = null;
  private client: any = null;
  private usedLibrary = false;

  constructor(config: MapConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://maps.grab.com';
  }

  async createMap(container: HTMLElement, center: Coordinate, zoom = 11): Promise<any> {
    let grabMaps: any = null;

    try {
      grabMaps = await loadGrabMapsModule();
    } catch (error) {
      console.warn('GrabMaps library CDN failed; falling back to authenticated MapLibre style.', error);
    }

    if (grabMaps?.GrabMapsLib) {
      this.instance = new grabMaps.GrabMapsLib({
        container,
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
        lng: center[0],
        lat: center[1],
        zoom,
        navigation: true,
        attribution: true,
        showSearchBar: false,
        showWaypointsModal: false,
        showLayersMenu: false,
      });
      await waitForReady(this.instance);
      this.client = this.instance.getClient?.();
      this.usedLibrary = true;
      return this.instance.getMap();
    }

    if (grabMaps?.GrabMapsBuilder && grabMaps?.MapBuilder) {
      this.client = new grabMaps.GrabMapsBuilder()
        .setBaseUrl(this.baseUrl)
        .setApiKey(this.apiKey)
        .build();
      this.usedLibrary = true;

      return new grabMaps.MapBuilder(this.client)
        .setContainer(container)
        .setCenter(center)
        .setZoom(zoom)
        .enableNavigation()
        .enableAttribution()
        .build();
    }

    const style = await fetchGrabMapsStyle(this.apiKey, this.baseUrl);
    return new maplibregl.Map({
      container,
      style,
      center,
      zoom,
      attributionControl: true,
      transformRequest: (url) => {
        const shouldAuthenticate =
          url.startsWith(`${this.baseUrl}/api/style.json`) ||
          url.startsWith(`${this.baseUrl}/api/v1/`);

        if (shouldAuthenticate) {
          return {
            url,
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          };
        }

        return { url };
      },
    });
  }

  async calculateWaypointRoute(start: Coordinate, end: Coordinate, mode: 'driving' | 'walking' | 'pedestrian' = 'driving'): Promise<any> {
    const libraryMode = mode === 'pedestrian' ? 'walking' : mode;

    if (this.instance?.calculateWaypointRoute) {
      return this.instance.calculateWaypointRoute(start, end, { mode: libraryMode, overview: 'full' });
    }

    if (this.client?.routing?.getRoute) {
      return this.client.routing.getRoute(toLatLng(start), toLatLng(end), {
        mode: libraryMode === 'walking' ? 'walk' : libraryMode,
        overview: 'full',
      });
    }

    const profile = libraryMode === 'walking' ? 'walking' : libraryMode;
    const params = new URLSearchParams({
      profile,
      overview: 'full',
    });
    params.append('coordinates', `${start[0]},${start[1]}`);
    params.append('coordinates', `${end[0]},${end[1]}`);

    const response = await fetch(`${this.baseUrl}/api/v1/maps/eta/v1/direction?${params}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Fallback CalculateRoutes failed: ${response.status}`);
    }

    return response.json();
  }

  async searchText(query: string, location?: Coordinate): Promise<any> {
    if (this.instance?.searchPlaces) {
      return this.instance.searchPlaces(query, {
        country: 'SGP',
        location: location ? toLatLng(location) : undefined,
        limit: 5,
      });
    }

    if (this.client?.search?.searchText) {
      return this.client.search.searchText(query, {
        country: 'SGP',
        location: location ? toLatLng(location) : undefined,
        limit: 5,
      });
    }

    if (this.client?.search?.searchPlaces) {
      return this.client.search.searchPlaces(query, {
        country: 'SGP',
        location: location ? toLatLng(location) : undefined,
        limit: 5,
      });
    }

    const params = new URLSearchParams({
      keyword: query,
      country: 'SGP',
      limit: '5',
    });

    if (location) {
      params.set('location', `${location[1]},${location[0]}`);
    }

    const response = await fetch(`${this.baseUrl}/api/v1/maps/poi/v1/search?${params}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Fallback SearchText failed: ${response.status}`);
    }

    return response.json();
  }

  async reverseGeocode(coordinates: Coordinate): Promise<any> {
    if (this.client?.search?.reverseGeocode) {
      return this.client.search.reverseGeocode(toLatLng(coordinates));
    }

    if (this.client?.search?.reverse) {
      return this.client.search.reverse(toLatLng(coordinates));
    }

    const params = new URLSearchParams({
      location: `${coordinates[1]},${coordinates[0]}`,
    });

    const response = await fetch(`${this.baseUrl}/api/v1/maps/poi/v1/reverse-geo?${params}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Fallback ReverseGeocode failed: ${response.status}`);
    }

    return response.json();
  }

  isUsingLibrary(): boolean {
    return this.usedLibrary;
  }

  clearRoute(): void {
    this.instance?.clearRoute?.();
  }

  destroy(): void {
    this.instance?.destroy?.();
    this.instance = null;
    this.client = null;
  }
}
