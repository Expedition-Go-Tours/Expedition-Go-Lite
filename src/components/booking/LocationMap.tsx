import { useMemo, useState } from 'react'
import { recordGoogleMapsFailure, shouldAttemptGoogleMaps } from '@/lib/googleMaps'
import { buildTourPoints, toNumber, type MapPoint, type PickupMapSource } from '@/lib/mapUtils'
import { getMapboxToken } from '@/lib/mapbox'
import { pickupZoneRings } from '@/lib/pickupZone'
import GooglePickupMap from './GooglePickupMap'
import MapboxPickupMap from './MapboxPickupMap'
import PickupZoneMap, { type PickupZoneMapTour } from './PickupZoneMap'

interface LocationMapProps {
  tour: PickupZoneMapTour
  userMarker?: { lat: number | null; lng: number | null } | null
  onUserPointChange?: (lat: number, lng: number) => void
  /** Reverse-geocoded formatted address for a point picked on the map. */
  onUserAddressChange?: (address: string) => void
  /** Extra non-interactive pins (e.g. nearby landmarks) layered on the map. */
  extraPoints?: MapPoint[]
  /** Fired with the pin's label when a tour pickup/meeting pin is tapped. */
  onPinClick?: (label: string) => void
  /** Fired when the map is double-clicked at a spot (to add a pickup location). */
  onDoubleClickPoint?: (lat: number, lng: number) => void
  /** Height classes for the map container (defaults to the standard booking height). */
  mapHeight?: string
}

/**
 * Layered pickup map for the booking area — Google Maps (via the
 * @vis.gl/react-google-maps APIProvider) is the PRIMARY renderer when the
 * Maps JS API can load (key + billing); any fatal failure degrades to Mapbox
 * GL (2D), then MapLibre + OSM tiles, then the textual fallback (address +
 * Google Maps link).
 *
 *  1. Google Maps JS API     — primary (key required; billing must be enabled)
 *  2. Mapbox GL JS (2D)      — fallback on Google fatal failure (token required)
 *  3. MapLibre + OSM tiles   — fallback on Mapbox fatal failure
 *  4. Text + Google Maps link — last resort (PickupZoneMap `mapDisabled`)
 *
 * The layered chain reuses the loader's outcome cache (localStorage): after a
 * Google failure, later mounts skip the network and go straight to Mapbox for
 * the retry window, and the map comes back automatically once billing is fixed.
 */
export default function LocationMap({ tour, userMarker, onUserPointChange, onUserAddressChange, extraPoints, onPinClick, onDoubleClickPoint, mapHeight }: LocationMapProps) {
  const [googleFailed, setGoogleFailed] = useState(false)
  const [mapboxFailed, setMapboxFailed] = useState(false)
  const [osmFailed, setOsmFailed] = useState(false)

  // Mapbox token — evaluated once per mount; a missing token skips layer 2.
  const mapboxToken = useMemo(() => getMapboxToken(), [])

  const tourPoints = useMemo(() => buildTourPoints(tour as PickupMapSource), [tour])
  // Drawn geoshapes + location-only radius circles (mirrors the child map
  // renderers, so the map-data gate never disagrees with what they draw).
  const zones = useMemo(
    () => pickupZoneRings(tour.pickupAreas, tour.pickupLocations?.filter(Boolean).length ?? 0),
    [tour.pickupAreas, tour.pickupLocations],
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

  // No map data at all → let PickupZoneMap render its OSM-embed/text fallback
  // (Google renders nothing without coordinates anyway).
  if (!hasMapData) {
    return (
      <PickupZoneMap
        tour={tour}
        userMarker={userMarker}
        onUserPointChange={onUserPointChange}
        onUserAddressChange={onUserAddressChange}
        extraPoints={extraPoints}
        onPinClick={onPinClick}
        onDoubleClickPoint={onDoubleClickPoint}
        mapHeight={mapHeight}
      />
    )
  }

  // 1. PRIMARY — Google Maps. A fatal API failure (auth/billing/script) falls
  //    through to the Mapbox → MapLibre stack. The failure is recorded in the
  //    loader's outcome cache so later mounts skip Google for the retry window.
  if (shouldAttemptGoogleMaps() && !googleFailed) {
    return (
      <GooglePickupMap
        tour={tour}
        userMarker={userMarker}
        onUserPointChange={onUserPointChange}
        onUserAddressChange={onUserAddressChange}
        extraPoints={extraPoints}
        onPinClick={onPinClick}
        onDoubleClickPoint={onDoubleClickPoint}
        mapHeight={mapHeight}
        onFatalFailure={() => {
          recordGoogleMapsFailure()
          setGoogleFailed(true)
        }}
      />
    )
  }

  // 2. Mapbox GL (2D) when a token is configured.
  if (mapboxToken && !mapboxFailed) {
    return (
      <MapboxPickupMap
        tour={tour}
        userMarker={userMarker}
        onUserPointChange={onUserPointChange}
        onUserAddressChange={onUserAddressChange}
        extraPoints={extraPoints}
        onPinClick={onPinClick}
        onDoubleClickPoint={onDoubleClickPoint}
        mapHeight={mapHeight}
        onFatalFailure={() => setMapboxFailed(true)}
      />
    )
  }

  // 3. MapLibre + OSM tiles.
  if (!osmFailed) {
    return (
      <PickupZoneMap
        tour={tour}
        userMarker={userMarker}
        onUserPointChange={onUserPointChange}
        onUserAddressChange={onUserAddressChange}
        extraPoints={extraPoints}
        onPinClick={onPinClick}
        onDoubleClickPoint={onDoubleClickPoint}
        mapHeight={mapHeight}
        onFatalFailure={() => setOsmFailed(true)}
      />
    )
  }

  // 4. Last resort — text + Google Maps link (no map attempt, no retry loop).
  return (
    <PickupZoneMap
      tour={tour}
      userMarker={userMarker}
      onUserPointChange={onUserPointChange}
      onUserAddressChange={onUserAddressChange}
      extraPoints={extraPoints}
      onPinClick={onPinClick}
      onDoubleClickPoint={onDoubleClickPoint}
      mapHeight={mapHeight}
      mapDisabled
    />
  )
}
