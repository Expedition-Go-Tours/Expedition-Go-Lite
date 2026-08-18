import * as maplibregl from 'maplibre-gl'

/**
 * Shared helpers for the storefront maps (booking-page location map, pickup
 * map modal, tour-detail location map). Maps are rendered with MapLibre GL
 * using free OpenFreeMap tiles — the same approach as the supplier's
 * LocationMapPicker — so no API key is required.
 */

export const TILE_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

/** Default camera fallback — Accra, the platform's origin market. */
export const DEFAULT_CENTER: [number, number] = [-0.187, 5.6037]

let warmResourcesStarted = false

/**
 * Idempotent warm-up for the free tile service: a preconnect hint plus a
 * force-cached fetch of the style JSON, so the first map opens fast instead
 * of cold-starting against OpenFreeMap. Mirrors the supplier dashboard's
 * mapConfig warm-up.
 */
export function warmMapResources(style: string = TILE_STYLE): void {
  if (warmResourcesStarted || typeof document === 'undefined') return
  warmResourcesStarted = true
  try {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = 'https://tiles.openfreemap.org'
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  } catch {
    /* warm-up is best-effort */
  }
  try {
    void fetch(style, { cache: 'force-cache', mode: 'cors' }).catch(() => undefined)
  } catch {
    /* ignore */
  }
}

/** Supplier's default pin colour (green) for pickup / meeting points. */
export const TOUR_PIN_COLOR = '#047857'
/** Red pin for the traveller's chosen pickup location. */
export const USER_PIN_COLOR = '#dc2626'

export interface MapPoint {
  lat: number
  lng: number
  label?: string
  kind: 'tour' | 'user'
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
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** All coordinate points from the supplier's config (meeting point, or every
    pickup area / pickup location), labelled with the point's name/address. */
export function buildTourPoints(tour: PickupMapSource): MapPoint[] {
  const pts: MapPoint[] = []
  if (tour.meetingMode === 'meeting_point') {
    const lat = toNumber(tour.meetingPointLat)
    const lng = toNumber(tour.meetingPointLng)
    if (lat != null && lng != null) {
      pts.push({ lat, lng, label: tour.meetingPoint || '', kind: 'tour' })
    }
  }
  if (tour.meetingMode === 'pickup') {
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

/** Builds a MapLibre marker element showing the pin in the given colour. */
export function maplibrePinEl(color: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'maplibregl-marker'
  el.innerHTML = pinSvg(color)
  el.style.cursor = 'pointer'
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