import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { buildTourPoints, toNumber, type PickupMapSource } from '@/lib/mapUtils'
import type { PickupAreaShape } from '@/lib/pickupZone'
import GooglePickupMap from './GooglePickupMap'
import PickupZoneMap, { type PickupZoneMapTour } from './PickupZoneMap'

interface LocationMapProps {
  tour: PickupZoneMapTour
  userMarker?: { lat: number | null; lng: number | null } | null
  onUserPointChange?: (lat: number, lng: number) => void
  /** Reverse-geocoded formatted address for a point picked on the map. */
  onUserAddressChange?: (address: string) => void
}

/**
 * Layered pickup map for the booking area:
 *
 *  1. Google Maps JS API   — primary, when a valid VITE_GOOGLE_MAPS_API_KEY loads
 *  2. MapLibre + OSM tiles  — automatic fallback on any Google load failure
 *  3. Text + Google Maps link — last resort (rendered by PickupZoneMap)
 *
 * Tours without any coordinates skip Google entirely and go straight to
 * PickupZoneMap's textual fallback.
 */
export default function LocationMap({ tour, userMarker, onUserPointChange, onUserAddressChange }: LocationMapProps) {
  const [maps, setMaps] = useState<typeof google.maps | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    let active = true
    loadGoogleMaps()
      .then((maps) => {
        if (active) setMaps(maps)
      })
      .catch(() => {
        /* fall back to OSM below */
      })
      .finally(() => {
        if (active) setResolved(true)
      })
    return () => {
      active = false
    }
  }, [])

  const tourPoints = useMemo(() => buildTourPoints(tour as PickupMapSource), [tour])
  const zones = useMemo(
    () =>
      (tour.pickupAreas || []).filter(
        (a): a is PickupAreaShape & { polygon: [number, number][] } =>
          !!a && Array.isArray(a.polygon) && a.polygon.length >= 3,
      ).map((a) => a.polygon),
    [tour.pickupAreas],
  )
  const exclusions = useMemo(
    () =>
      (tour.pickupAreas || [])
        .flatMap((a) => (Array.isArray(a?.exclusions) ? a.exclusions : []))
        .filter((e): e is [number, number][] => Array.isArray(e) && e.length >= 3),
    [tour.pickupAreas],
  )
  const userPoint = useMemo(() => {
    const lat = toNumber(userMarker?.lat)
    const lng = toNumber(userMarker?.lng)
    return lat != null && lng != null ? { lat, lng } : null
  }, [userMarker?.lat, userMarker?.lng])

  const hasMapData =
    zones.length > 0 || exclusions.length > 0 || tourPoints.length > 0 || userPoint != null

  // While the Google API loads, keep the same box size so the step/modal
  // doesn't jump (Google usually resolves in <1s; on failure we keep OSM).
  if (!resolved) {
    return (
      <div className="p-3">
        <div className="relative flex h-[220px] w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200/40 bg-slate-50">
          <Loader2 className="size-5 animate-spin text-slate-300" />
        </div>
      </div>
    )
  }

  if (maps && hasMapData) {
    return (
      <GooglePickupMap
        maps={maps}
        tour={tour}
        userMarker={userMarker}
        onUserPointChange={onUserPointChange}
        onUserAddressChange={onUserAddressChange}
      />
    )
  }

  // Google unavailable or no coordinates → MapLibre + OSM tiles, which in turn
  // degrades to the text + Google Maps link when the tiles also fail.
  return (
    <PickupZoneMap
      tour={tour}
      userMarker={userMarker}
      onUserPointChange={onUserPointChange}
      onUserAddressChange={onUserAddressChange}
    />
  )
}