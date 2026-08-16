/**
 * Geographic helpers for pickup geoshapes (GetYourGuide-style service zones).
 *
 * A pickup geoshape is a closed polygon (ordered [lat, lng] vertices) that
 * defines where a supplier offers area-based pickup. Customers pick an
 * address at checkout; the address is valid only if it falls inside one of
 * the supplier's polygons and outside every exclusion zone.
 *
 * This is a 1:1 TypeScript port of the backend's
 * Expedition-Go-Backend-v2/utils/geoUtils.js — client feedback and the
 * server verdict must never disagree.
 */

/**
 * Radius (meters) around a location-only pickup area (saved as a point, no
 * drawn geoshape) within which a customer address is considered inside the
 * area. Must match the backend's LOCATION_AREA_RADIUS_M in geoUtils.js.
 */
export const LOCATION_AREA_RADIUS_M = 5000

export type LatLng = [number, number]

export interface PickupAreaShape {
  name?: string
  /** Pickup reference window for this area, e.g. '0-45'. */
  time?: string
  address?: string
  lat?: number | null
  lng?: number | null
  /** Ordered [lat, lng] vertices of the drawn service zone. */
  polygon?: LatLng[] | null
  /** Drawn exclusion zones (each an ordered [lat, lng] polygon). */
  exclusions?: LatLng[][] | null
}

export interface PickupLocationShape {
  name?: string
  address?: string
  lat?: number | null
  lng?: number | null
}

/** A matched area, flagged when the address falls inside one of its exclusion zones. */
export type PickupZoneMatch = PickupAreaShape & { _excluded?: true }

/**
 * Ray-casting point-in-polygon test.
 * @param lat point latitude
 * @param lng point longitude
 * @param polygon ordered [lat, lng] vertices
 */
export function pointInPolygon(lat: number, lng: number, polygon: LatLng[]): boolean {
  if (!Array.isArray(polygon) || polygon.length < 3) return false

  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [, lngI] = polygon[i]
    const [latI] = polygon[i]
    const [, lngJ] = polygon[j]
    const [latJ] = polygon[j]
    const intersect =
      latI > lat !== latJ > lat &&
      lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Haversine distance in meters between two points.
 */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const NORMALIZE_NAME = (v: unknown) => String(v || '').trim().toLowerCase()

export function hasDrawnShape(area: PickupAreaShape): boolean {
  return Array.isArray(area.polygon) && area.polygon.length >= 3
}

/**
 * Resolve whether an address falls inside any area of a geoshape and outside
 * all of its exclusion zones.
 *
 * Mirrors the backend precedence exactly: areas are evaluated in array
 * order and the first match wins; an address inside an exclusion zone of a
 * matching area returns that area flagged `_excluded`.
 *
 * @returns matching area, or null when no area matches
 */
export function findPickupAreaForAddress(
  address: { lat: number; lng: number; name?: string },
  pickupAreas: PickupAreaShape[],
): PickupZoneMatch | null {
  if (!Array.isArray(pickupAreas) || !address || !Number.isFinite(address.lat) || !Number.isFinite(address.lng)) {
    return null
  }

  for (const area of pickupAreas) {
    if (!hasDrawnShape(area)) {
      // Legacy area without a drawn geoshape: match the saved location
      // point by proximity, or fall back to the old exact-name match for
      // areas without coordinates so pre-geoshape products keep working.
      const aLat = typeof area.lat === 'number' ? area.lat : NaN
      const aLng = typeof area.lng === 'number' ? area.lng : NaN
      if (Number.isFinite(aLat) && Number.isFinite(aLng) && distanceMeters(address.lat, address.lng, aLat, aLng) <= LOCATION_AREA_RADIUS_M) {
        return area
      }
      if (NORMALIZE_NAME(address.name) === NORMALIZE_NAME(area.name)) return area
      continue
    }

    if (!pointInPolygon(address.lat, address.lng, area.polygon as LatLng[])) continue

    // Inside the service zone — reject addresses inside any exclusion zone.
    const excludedBy = (area.exclusions || []).find(
      (exclusion) => Array.isArray(exclusion) && pointInPolygon(address.lat, address.lng, exclusion),
    )
    if (excludedBy) return { ...area, _excluded: true }

    return area
  }

  return null
}

export type PickupZoneStatus = 'in_area' | 'excluded' | 'outside' | 'no_coords' | 'no_zones' | 'none'

/**
 * Status of a customer address against the tour's pickup areas, for live
 * checkout feedback.
 */
export function pickupZoneStatus(
  address: { name?: string; lat: number | null; lng: number | null } | null | undefined,
  pickupAreas: PickupAreaShape[],
): PickupZoneStatus {
  const areas = Array.isArray(pickupAreas) ? pickupAreas : []
  if (!address || address.lat == null || address.lng == null || !Number.isFinite(address.lat) || !Number.isFinite(address.lng)) {
    return 'no_coords'
  }
  if (areas.length === 0) return 'no_zones'
  const match = findPickupAreaForAddress({ lat: address.lat, lng: address.lng, name: address.name }, areas)
  if (!match) return 'outside'
  return match._excluded ? 'excluded' : 'in_area'
}