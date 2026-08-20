import * as maplibregl from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// maplibre resolves its render worker from `import.meta.url` at runtime
// (new URL('./maplibre-gl-worker.mjs', import.meta.url)), which bundlers
// cannot statically detect — the worker would never be emitted in production
// and every map would hang on a silent 404. Importing the worker with Vite's
// `?url` suffix produces a real, bundled URL in dev and build alike; pinning
// it here (before any map is created) makes both environments load the same
// worker file.
maplibregl.setWorkerUrl(maplibreWorkerUrl)

/**
 * Shared helpers for the storefront maps (booking-page location map, pickup
 * map modal, tour-detail location map). Maps are rendered with MapLibre GL
 * using free raster tile providers — no API key required.
 *
 * Provider history: the maps previously used OpenFreeMap vector tiles
 * (tiles.openfreemap.org/planet/*.pbf). That endpoint began returning empty
 * (0-byte) tiles while the style JSON kept loading, which MapLibre treats as
 * valid-but-empty (no `error` event), leaving a permanently blank basemap.
 * OSM raster tiles then started returning an "Access denied" placeholder as a
 * 200 (x-blocked header) — again silent for MapLibre. Because both failures
 * are silent, a one-tile pixel probe picks a healthy provider up front
 * (Carto first), with OSM and Esri as fallbacks, before the map is built.
 */

export interface TileProvider {
  id: string
  name: string
  /** MapLibre raster tile URL templates ({z}/{x}/{y}). */
  tiles: string[]
  /** License-required attribution shown on the map. */
  attribution: string
  /** A known-land tile (z7, southern Ghana) used for the health probe. */
  probeUrl: string
}

export const TILE_PROVIDERS: TileProvider[] = [
  {
    id: 'carto',
    name: 'CARTO Voyager',
    tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors © CARTO',
    probeUrl: 'https://basemaps.cartocdn.com/rastertiles/voyager/7/63/62.png',
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors',
    probeUrl: 'https://tile.openstreetmap.org/7/63/62.png',
  },
  {
    id: 'esri',
    name: 'Esri World Street Map',
    // Note: Esri's tile path is {z}/{y}/{x}, unlike OSM-style providers.
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
    attribution: '© OpenStreetMap contributors © Esri',
    probeUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/7/62/63',
  },
]

/** A minimal raster style for the given tile provider. */
export function buildTileStyle(provider: TileProvider): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      tiles: {
        type: 'raster',
        tiles: provider.tiles,
        tileSize: 256,
        maxzoom: 19,
        attribution: provider.attribution,
      },
    },
    layers: [{ id: 'tiles', type: 'raster', source: 'tiles' }],
  }
}

/** Mean squared deviation of the sampled luminances (0 = flat colour). */
export function tileVariance(samples: number[]): number {
  if (samples.length === 0) return 0
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  return samples.reduce((acc, s) => acc + (s - mean) ** 2, 0) / samples.length
}

/**
 * True when the sampled tile is essentially one flat colour — the signature
 * of the placeholder images tile servers return when a request is blocked
 * (e.g. OSM's "Access denied" tile), which MapLibre paints silently.
 */
export function isSolidTile(samples: number[]): boolean {
  return tileVariance(samples) < 1
}

/** Loads an image cross-origin for canvas inspection, or null on any failure. */
export function loadProbeImage(url: string, timeoutMs = 4000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    let settled = false
    const finish = (ok: boolean): void => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(ok && img.naturalWidth > 0 ? img : null)
    }
    const timer = window.setTimeout(() => finish(false), timeoutMs)
    img.onload = () => finish(true)
    img.onerror = () => finish(false)
    img.src = url
  })
}

/** Downsamples the tile to a 64×64 canvas and returns luminance samples. */
export function sampleTilePixels(img: HTMLImageElement): number[] {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  try {
    ctx.drawImage(img, 0, 0, size, size)
    const data = ctx.getImageData(0, 0, size, size).data
    const samples: number[] = []
    for (let y = 0; y < size; y += 8) {
      for (let x = 0; x < size; x += 8) {
        const i = (y * size + x) * 4
        samples.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
      }
    }
    return samples
  } catch {
    return []
  }
}

/**
 * True when the provider serves a real basemap tile: the probe image loads
 * and paints more than a flat colour. A tainted canvas or load failure is
 * treated as unhealthy (MapLibre raster tiles need CORS anyway).
 */
export async function probeTileProvider(
  provider: TileProvider,
  options: { loadImage?: typeof loadProbeImage; sample?: typeof sampleTilePixels } = {},
): Promise<boolean> {
  const loadImage = options.loadImage ?? loadProbeImage
  const sample = options.sample ?? sampleTilePixels
  const img = await loadImage(provider.probeUrl)
  if (!img) return false
  return !isSolidTile(sample(img))
}

let tileProviderCache: Promise<TileProvider> | undefined

/** Resets the module-level provider probe cache (used by tests). */
export function resetTileProviderCache(): void {
  tileProviderCache = undefined
}

/**
 * Picks the first tile provider whose probe tile is healthy, falling back to
 * the first provider when every probe fails (the map-level error failover
 * then handles a genuinely dead basemap). Memoized: one probe run per page
 * load, shared by all maps.
 */
export function resolveTileProvider(
  providers: TileProvider[] = TILE_PROVIDERS,
  options: { probe?: typeof probeTileProvider } = {},
): Promise<TileProvider> {
  const probe = options.probe ?? probeTileProvider
  tileProviderCache ??= (async () => {
    for (const provider of providers) {
      if (await probe(provider)) return provider
    }
    return providers[0]
  })()
  return tileProviderCache
}

/** Default camera fallback — Accra, the platform's origin market. */
export const DEFAULT_CENTER: [number, number] = [-0.187, 5.6037]

let warmResourcesStarted = false

/**
 * Idempotent warm-up for the tile providers: preconnect hints to every tile
 * host so the first map opens fast instead of cold-starting against the CDN.
 * Runs once per page load.
 */
export function warmMapResources(): void {
  if (warmResourcesStarted || typeof document === 'undefined') return
  warmResourcesStarted = true
  try {
    for (const provider of TILE_PROVIDERS) {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = new URL(provider.probeUrl).origin
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    }
  } catch {
    /* warm-up is best-effort */
  }
}

/** Supplier's default pin colour (green) for pickup / meeting points. */
export const TOUR_PIN_COLOR = '#047857'
/** Red pin for the traveller's chosen pickup location. */
export const USER_PIN_COLOR = '#dc2626'
/** Violet pin for traveller-added (double-clicked) pickup spots. */
export const CUSTOM_PIN_COLOR = '#7c3aed'

export interface MapPoint {
  lat: number
  lng: number
  label?: string
  kind: 'tour' | 'user'
  /** Google place id — enables Place Details in the pin's info window. */
  placeId?: string | null
  rating?: number | null
  category?: string | null
}

/** The slice of the tour's meeting/pickup config the map builders need. */
export interface PickupMapSource {
  meetingMode?: 'meeting_point' | 'pickup' | 'none'
  meetingPoint?: string
  meetingPointLat?: number | null
  meetingPointLng?: number | null
  pickupAreas?: { name?: string; address?: string; lat?: number | null; lng?: number | null }[]
  pickupLocations?: { name?: string; address?: string; lat?: number | null; lng?: number | null }[]
}

export function toNumber(v: unknown): number | null {
  // null/undefined/'' must stay null — Number(null) === 0, and a phantom
  // (0, 0) pin at the Gulf of Guinea broke the camera fit and map data gates.
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** All coordinate points from the supplier's config (meeting point, or every
    pickup area / pickup location), labelled with the point's name/address. */
export function buildTourPoints(tour: PickupMapSource): MapPoint[] {
  const pts: MapPoint[] = []

  // Infer the effective meeting mode when the backend doesn't set it.
  const hasMeetingData = !!(tour.meetingPoint || tour.meetingPointLat != null)
  const hasPickupData =
    (tour.pickupAreas?.length ?? 0) > 0 || (tour.pickupLocations?.length ?? 0) > 0
  const effectiveMode = tour.meetingMode
    ?? (hasMeetingData ? 'meeting_point' : hasPickupData ? 'pickup' : undefined)

  if (effectiveMode === 'meeting_point') {
    const lat = toNumber(tour.meetingPointLat)
    const lng = toNumber(tour.meetingPointLng)
    if (lat != null && lng != null) {
      pts.push({ lat, lng, label: tour.meetingPoint || '', kind: 'tour' })
    }
  }
  if (effectiveMode === 'pickup') {
    for (const a of tour.pickupAreas || []) {
      const lat = toNumber(a?.lat)
      const lng = toNumber(a?.lng)
      if (lat != null && lng != null) {
        pts.push({ lat, lng, label: a.name || a.address || '', kind: 'tour' })
      }
    }
    for (const l of tour.pickupLocations || []) {
      const lat = toNumber(l?.lat)
      const lng = toNumber(l?.lng)
      if (lat != null && lng != null) {
        pts.push({ lat, lng, label: l.name || l.address || '', kind: 'tour' })
      }
    }
  }
  return pts
}

/** The classic map-pin SVG (filled body + white centre dot) — the supplier's
    shape, recoloured per marker. Returns the SVG markup for marker elements. */
export function pinSvg(color: string): string {
  return `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="${color}"/><circle cx="16" cy="16" r="6" fill="white" stroke="${color}" stroke-width="2"/></svg>`
}

/** Encodes a marker SVG into a data URI usable as a Google Maps Marker icon. */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Builds a MapLibre marker element showing the pin in the given colour. */
export function maplibrePinEl(color: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'maplibregl-marker'
  el.innerHTML = pinSvg(color)
  el.style.cursor = 'pointer'
  return el
}

/**
 * Marker element for pickup/meeting point pins with a pulsating glow halo
 * (the `.pin-glow` animation from index.css, tinted with --pin-color).
 * Works as the `element` for both Mapbox GL and MapLibre markers.
 */
export function pulsingPinElement(color: string, cursor = 'pointer'): HTMLDivElement {
  const el = document.createElement('div')
  // Both engine marker classes provide the same absolute positioning. The
  // position MUST be explicit inline: `relative` would keep each marker in
  // the canvas container's normal flow, so the 2nd+ markers stack below the
  // first (offset by a multiple of the pin's ~40px height) and every pin
  // lands displaced from its real coordinate, carrying its glow with it.
  el.className = 'maplibregl-marker mapboxgl-marker'
  el.style.cssText = `position: absolute; top: 0; left: 0; cursor: ${cursor};`
  const glow = document.createElement('span')
  glow.className = 'pin-glow'
  glow.style.setProperty('--pin-color', color)
  const pin = document.createElement('div')
  pin.innerHTML = pinSvg(color)
  pin.style.cssText = 'position: relative; z-index: 1; pointer-events: auto;'
  el.appendChild(glow)
  el.appendChild(pin)
  return el
}

/** Creates a MapLibre map in the given container, or null if WebGL/style
    initialization throws synchronously (the caller then shows a fallback). */
export function createMapLibreMap(
  container: HTMLElement,
  options: Omit<maplibregl.MapOptions, 'container'> = {},
): maplibregl.Map | null {
  try {
    return new maplibregl.Map({ container, ...options })
  } catch {
    return null
  }
}

/** Pans/zooms the map so every point is visible; falls back to Accra. */
export function fitMapToPoints(map: maplibregl.Map, points: MapPoint[], padding = 48): void {
  if (points.length === 0) {
    map.setCenter([-0.187, 5.6037])
    map.setZoom(6)
    return
  }
  if (points.length === 1) {
    map.setCenter([points[0].lng, points[0].lat])
    map.setZoom(13)
    return
  }
  const bounds = new maplibregl.LngLatBounds()
  for (const p of points) bounds.extend([p.lng, p.lat])
  map.fitBounds(bounds, { padding, maxZoom: 15 })
}

/** GeoJSON FeatureCollection from polygon rings ordered as [lat, lng]. */
export function ringsToFeatureCollection(rings: [number, number][][]): {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    properties: Record<string, never>
    geometry: { type: 'Polygon'; coordinates: [number, number][][] }
  }[]
} {
  return {
    type: 'FeatureCollection',
    features: rings.map((ring) => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [ring.map(([lat, lng]) => [lng, lat])],
      },
    })),
  }
}

export interface GeoCamera {
  center?: [number, number]
  zoom?: number
  bounds?: maplibregl.LngLatBounds
  padding?: number
  maxZoom?: number
}

/**
 * Camera for the booking pickup map: fits every zone/exclusion ring and point,
 * zooms to 13 for a lone coordinate, and falls back to the platform origin.
 * Mirrors the supplier dashboard's cameraFromGeoshape.
 */
export function cameraFromGeoData(options: {
  zones: [number, number][][]
  rings: [number, number][][]
  points: MapPoint[]
  userPoint?: { lat: number; lng: number } | null
}): GeoCamera {
  const coords: [number, number][] = []
  const push = (lat: number, lng: number): void => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) coords.push([lat, lng])
  }
  for (const ring of options.zones) for (const [lat, lng] of ring) push(lat, lng)
  for (const ring of options.rings) for (const [lat, lng] of ring) push(lat, lng)
  for (const p of options.points) push(p.lat, p.lng)
  if (options.userPoint) push(options.userPoint.lat, options.userPoint.lng)

  if (coords.length === 0) return { center: DEFAULT_CENTER, zoom: 6 }
  const [firstLat, firstLng] = coords[0]
  const lone = coords.every(
    ([lat, lng]) => Math.abs(lat - firstLat) < 1e-6 && Math.abs(lng - firstLng) < 1e-6,
  )
  if (lone) return { center: [firstLng, firstLat], zoom: 13 }

  const bounds = new maplibregl.LngLatBounds()
  for (const [lat, lng] of coords) bounds.extend([lng, lat])
  return { bounds, padding: 50, maxZoom: 15 }
}