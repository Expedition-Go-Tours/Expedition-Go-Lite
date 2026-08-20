import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Star } from 'lucide-react'
import {
  APIProvider,
  AdvancedMarker,
  ControlPosition,
  InfoWindow,
  Map,
  MapControl,
  Polygon,
  useAdvancedMarkerRef,
  useMap,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps'
import {
  getGoogleMapsApiKey,
  getGoogleMapsMapId,
} from '@/lib/googleMaps'
import { fetchPlaceDetails, type GooglePlaceDetails } from '@/lib/googlePlaces'
import { reverseGeocode } from '@/lib/locations'
import {
  DEFAULT_CENTER,
  TOUR_PIN_COLOR,
  buildTourPoints,
  pinSvg,
  svgDataUri,
  toNumber,
  type MapPoint,
  type PickupMapSource,
} from '@/lib/mapUtils'
import { pickupZoneRings } from '@/lib/pickupZone'
import type { PickupZoneMapTour } from './PickupZoneMap'

/** Blue draggable pin for the traveller's chosen pickup location. */
const USER_PIN_SVG = `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill="#2563eb"/><circle cx="13" cy="13" r="5" fill="#fff"/></svg>`

/** Amber dot pin for extra (landmark) markers. */
const EXTRA_PIN_SVG = `<svg width="20" height="26" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill="#d97706"/><circle cx="13" cy="13" r="5" fill="#fff"/></svg>`

/** The pin SVG as a data-URI img element (the AdvancedMarker children). */
function pinImg(svg: string, width: number, height: number) {
  return (
    <img
      src={svgDataUri(svg)}
      width={width}
      height={height}
      style={{ pointerEvents: 'none', display: 'block' }}
      alt=""
    />
  )
}

interface GooglePickupMapProps {
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
  /** Fired when the API fatally fails (auth/billing/script) â€” the layered
      LocationMap then falls back to Mapbox/MapLibre/text. */
  onFatalFailure?: () => void
  /** Height classes for the map container (defaults to the standard booking height). */
  mapHeight?: string
}

/**
 * Google Maps renderer for the checkout pickup map â€” the PRIMARY provider on
 * the booking page once the Maps JavaScript API loads (billing required).
 * Built on @vis.gl/react-google-maps: declarative `<Map>`, `<AdvancedMarker>`
 * and `<Polygon>` components, plus imperative bits (info windows, camera
 * fitting) confined to the small overlay components below.
 *
 * Mirrors the MapLibre + OSM `PickupZoneMap` visuals: green service zones, red
 * exclusions, green tour pins and a draggable blue pin for the traveller's
 * location. A fatal API failure (auth/billing) is reported to the parent so
 * the fallback stack (Mapbox â†’ MapLibre â†’ text) takes over.
 */
export default function GooglePickupMap({ tour, userMarker, onUserPointChange, onUserAddressChange, extraPoints, onPinClick, onDoubleClickPoint, onFatalFailure, mapHeight = 'h-[320px] sm:h-[340px]' }: GooglePickupMapProps) {
  const apiKey = getGoogleMapsApiKey()
  const failedRef = useRef(false)

  // LocationMap gates on shouldAttemptGoogleMaps() before rendering this, but
  // a swapped/removed key must never render an empty APIProvider.
  if (!apiKey) return null

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['marker', 'places', 'geometry']}
      onError={() => {
        if (failedRef.current) return
        failedRef.current = true
        onFatalFailure?.()
      }}
    >
      <GooglePickupMapInner
        tour={tour}
        userMarker={userMarker}
        onUserPointChange={onUserPointChange}
        onUserAddressChange={onUserAddressChange}
        extraPoints={extraPoints}
        onPinClick={onPinClick}
        onDoubleClickPoint={onDoubleClickPoint}
        onFatalFailure={onFatalFailure}
        mapHeight={mapHeight}
      />
    </APIProvider>
  )
}

function GooglePickupMapInner({ tour, userMarker, onUserPointChange, onUserAddressChange, extraPoints, onPinClick, onDoubleClickPoint, onFatalFailure, mapHeight = 'h-[320px] sm:h-[340px]' }: GooglePickupMapProps) {
  const [mapReady, setMapReady] = useState(false)
  /** True right after the draggable pin is dropped â€” a ghost map click after
      a marker drag must not re-trigger click-to-pick (camera jump / prompt). */
  const dragJustEndedRef = useRef(false)
  const onFatalFailureRef = useRef(onFatalFailure)
  useEffect(() => {
    onFatalFailureRef.current = onFatalFailure
  }, [onFatalFailure])

  // A quota/auth-limited Google API can leave the map blank forever (the
  // style/tiles never load, no error fires). If the map hasn't painted within
  // the grace period, fail over to the Mapbox/MapLibre stack like the other
  // renderers do.
  useEffect(() => {
    if (mapReady) return
    const timer = window.setTimeout(() => {
      onFatalFailureRef.current?.()
    }, 12000)
    return () => window.clearTimeout(timer)
  }, [mapReady])

  // Supplier's pickup/meeting points (green pins).
  const tourPoints = useMemo(() => buildTourPoints(tour as PickupMapSource), [tour])

  // Drawn geoshapes + exclusion zones from the supplier's Step-13 config.
  // Location-only areas (a saved point, no drawn polygon) render as a
  // LOCATION_AREA_RADIUS_M circle â€” only when it's the tour's single pickup
  // spot (no other areas and no pickup locations), so the map matches the
  // "Pickup zone" legend without blobbing multi-location tours.
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

  // The traveller's typed/dragged pickup location (blue pin).
  const userPoint = useMemo(() => {
    const lat = toNumber(userMarker?.lat)
    const lng = toNumber(userMarker?.lng)
    return lat != null && lng != null ? { lat, lng } : null
  }, [userMarker?.lat, userMarker?.lng])

  const hasMapData =
    zones.length > 0 || exclusions.length > 0 || tourPoints.length > 0 || userPoint != null

  // All coordinates the initial camera must fit (Accra fallback otherwise).
  const cameraPoints = useMemo(() => {
    const pts: google.maps.LatLngLiteral[] = []
    for (const ring of zones) for (const [lat, lng] of ring) pts.push({ lat, lng })
    for (const ring of exclusions) for (const [lat, lng] of ring) pts.push({ lat, lng })
    for (const p of tourPoints) pts.push({ lat: p.lat, lng: p.lng })
    if (userPoint) pts.push(userPoint)
    return pts
  }, [zones, exclusions, tourPoints, userPoint])

  // Click-to-pick (mirrors the supplier's LocationMapPicker): sets the
  // traveller's pickup coordinates, drops the pin and zooms to street level.
  const handleMapClick = (e: MapMouseEvent): void => {
    // A mouseup right after dropping the draggable pin can fire a ghost click â€”
    // skip it so the camera doesn't jump right after the drop.
    if (dragJustEndedRef.current) {
      dragJustEndedRef.current = false
      return
    }
    const latLng = e.detail.latLng
    if (!latLng) return
    onUserPointChange?.(latLng.lat, latLng.lng)
    e.map.panTo(latLng)
    e.map.setZoom(15)
    // Fire-and-forget: fill the pickup address with the closest place name.
    void reverseGeocode(latLng.lat, latLng.lng).then((r) => {
      if (r?.formatted) onUserAddressChange?.(r.formatted)
    })
  }

  // Double-click â†’ add a custom pickup spot. `stop()` suppresses Google's
  // default double-click zoom so the gesture only adds the location.
  const handleMapDoubleClick = (e: MapMouseEvent): void => {
    e.stop()
    const latLng = e.detail.latLng
    if (latLng) onDoubleClickPoint?.(latLng.lat, latLng.lng)
  }

  if (!hasMapData) return null

  return (
    <div className="px-0 py-3">
      <div className={`relative ${mapHeight} w-full touch-none overflow-hidden rounded-xl border border-slate-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
        <Map
          mapId={getGoogleMapsMapId() || 'DEMO_MAP_ID'}
          defaultCenter={{ lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] }}
          defaultZoom={6}
          mapTypeControl={false}
          fullscreenControl={false}
          streetViewControl={false}
          onClick={handleMapClick}
          onDblclick={handleMapDoubleClick}
          onTilesLoaded={() => setMapReady(true)}
          className="absolute inset-0"
        >
          {zones.map((ring, i) => (
            <Polygon
              key={`zone-${i}`}
              paths={ring.map(([lat, lng]) => ({ lat, lng }))}
              fillColor="#179237"
              fillOpacity={0.12}
              strokeColor="#179237"
              strokeWeight={2}
            />
          ))}
          {exclusions.map((ring, i) => (
            <Polygon
              key={`excl-${i}`}
              paths={ring.map(([lat, lng]) => ({ lat, lng }))}
              fillColor="#dc2626"
              fillOpacity={0.12}
              strokeColor="#dc2626"
              strokeWeight={2}
            />
          ))}
          <CameraFitter points={cameraPoints} ready={mapReady} />
          <MapControl position={ControlPosition.TOP_CENTER}>
            <RecenterButton points={cameraPoints} />
          </MapControl>
          {tourPoints.map((p) => (
            <TourPin key={`${p.lat}-${p.lng}-${p.label}`} point={p} onPinClick={onPinClick} />
          ))}
          {extraPoints?.map((p) => (
            <ExtraPin key={`${p.lat}-${p.lng}-${p.label}`} point={p} />
          ))}
          {userPoint && (
            <UserPin
              point={userPoint}
              onUserPointChange={onUserPointChange}
              onDragEnded={() => {
                dragJustEndedRef.current = true
              }}
            />
          )}
        </Map>
        {mapReady && (zones.length > 0 || exclusions.length > 0 || tourPoints.length > 1) && (
          <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5 rounded-lg bg-white/90 px-2.5 py-2 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
            {tourPoints.length > 1 && (
              <span className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 32 40"
                  width="13"
                  height="16"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill={TOUR_PIN_COLOR} />
                  <circle cx="16" cy="16" r="6" fill="white" stroke={TOUR_PIN_COLOR} strokeWidth="2" />
                </svg>
                Pickup points
              </span>
            )}
            {zones.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: '#179237' }} /> Pickup zone
              </span>
            )}
            {exclusions.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: '#dc2626' }} /> No pickup
              </span>
            )}
          </div>
        )}
        {mapReady && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1.5 border-t border-slate-100 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-slate-500 backdrop-blur-sm">
            <MapPin size={11} className="shrink-0 text-[#179237]" />
            Click the map to set your pickup location
          </div>
        )}
        {!mapReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
            <MapPin className="size-5 animate-pulse text-slate-300" />
          </div>
        )}
      </div>
    </div>
  )
}

/** Fits the camera once the first tiles land; later pin additions that land
    outside the viewport get a pan so the traveller always sees their pin. */
function CameraFitter({ points, ready }: { points: google.maps.LatLngLiteral[]; ready: boolean }) {
  const map = useMap()
  const fittedRef = useRef(false)
  const lastPointsRef = useRef('')

  useEffect(() => {
    if (!map || !ready) return
    const key = points.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|')
    if (!fittedRef.current) {
      fittedRef.current = true
      lastPointsRef.current = key
      fitCamera(map, points)
      return
    }
    if (key === lastPointsRef.current) return
    lastPointsRef.current = key
    const last = points[points.length - 1]
    if (!last) return
    const bounds = map.getBounds()
    if (!bounds || !bounds.contains(new google.maps.LatLng(last.lat, last.lng))) {
      map.panTo(new google.maps.LatLng(last.lat, last.lng))
    }
  }, [map, ready, points])

  return null
}

/** Fits the camera so every point is visible; falls back to Accra. */
function fitCamera(map: google.maps.Map, pts: google.maps.LatLngLiteral[]): void {
  if (pts.length === 0) {
    map.setCenter({ lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] })
    map.setZoom(6)
    return
  }
  if (pts.length === 1) {
    map.setCenter(pts[0])
    map.setZoom(13)
    return
  }
  const bounds = new google.maps.LatLngBounds()
  for (const p of pts) bounds.extend(p)
  map.fitBounds(bounds, 48)
}

/** Re-center control (re-fits the camera to the current zones/pins). */
function RecenterButton({ points }: { points: google.maps.LatLngLiteral[] }) {
  const map = useMap()
  const pointsRef = useRef(points)
  useEffect(() => {
    pointsRef.current = points
  }, [points])
  return (
    <button
      type="button"
      title="Re-center map on pickup zones"
      onClick={() => {
        if (map) fitCamera(map, pointsRef.current)
      }}
      className="m-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#047857] shadow-sm transition-colors hover:bg-slate-50"
    >
      Re-center
    </button>
  )
}

/** Supplier's pickup/meeting pins (green) â€” taps bubble the label up. The
    pulsating glow halo marks the pickup/meeting points on the map. */
function TourPin({ point, onPinClick }: { point: MapPoint; onPinClick?: (label: string) => void }) {
  const onClickRef = useRef(onPinClick)
  useEffect(() => {
    onClickRef.current = onPinClick
  }, [onPinClick])
  return (
    <AdvancedMarker
      position={{ lat: point.lat, lng: point.lng }}
      title={point.label || undefined}
      zIndex={1}
      onClick={() => {
        if (point.label) onClickRef.current?.(point.label)
      }}
    >
      <div style={{ position: 'relative' }}>
        <span className="pin-glow" style={{ '--pin-color': TOUR_PIN_COLOR } as React.CSSProperties} />
        {pinImg(pinSvg(TOUR_PIN_COLOR), 32, 40)}
      </div>
    </AdvancedMarker>
  )
}

/** Extra (landmark) pins â€” tapping opens an InfoWindow with place details. */
function ExtraPin({ point }: { point: MapPoint }) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState<GooglePlaceDetails | null>(null)
  const requestedRef = useRef<string | null>(null)

  const toggle = (): void => {
    setOpen((o) => !o)
    if (point.placeId && requestedRef.current !== point.placeId && !details) {
      requestedRef.current = point.placeId
      void fetchPlaceDetails(point.placeId).then((d) => {
        if (d) setDetails(d)
      })
    }
  }

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: point.lat, lng: point.lng }}
        title={point.label || undefined}
        zIndex={0}
        onClick={toggle}
      >
        {pinImg(EXTRA_PIN_SVG, 20, 26)}
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="max-w-[220px]">
            <p className="text-sm font-bold text-slate-900">{point.label}</p>
            {details?.formattedAddress && (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{details.formattedAddress}</p>
            )}
            {(details?.rating != null || point.rating != null) && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                {details?.rating ?? point.rating}
                {details?.userRatingCount != null && (
                  <span className="font-medium text-slate-400">({details.userRatingCount} reviews)</span>
                )}
              </p>
            )}
            {details?.openNow != null && (
              <p className={`mt-1 text-xs font-medium ${details.openNow ? 'text-emerald-600' : 'text-rose-500'}`}>
                {details.openNow ? 'Open now' : 'Closed now'}
              </p>
            )}
            {details?.typesLabel && (
              <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{details.typesLabel}</p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  )
}

/** The traveller's draggable blue pin â€” repositioning updates the live
    verdict. It carries the same pulsating glow as the tour pins. */
function UserPin({
  point,
  onUserPointChange,
  onDragEnded,
}: {
  point: { lat: number; lng: number }
  onUserPointChange?: (lat: number, lng: number) => void
  /** Fired when the pin is dropped (used to suppress the ghost map click). */
  onDragEnded?: () => void
}) {
  const onChangeRef = useRef(onUserPointChange)
  const onDragEndedRef = useRef(onDragEnded)
  useEffect(() => {
    onChangeRef.current = onUserPointChange
    onDragEndedRef.current = onDragEnded
  }, [onUserPointChange, onDragEnded])

  return (
    <AdvancedMarker
      position={point}
      draggable
      zIndex={2}
      onDragEnd={(e) => {
        const latLng = e.latLng
        if (latLng) onChangeRef.current?.(latLng.lat(), latLng.lng())
        onDragEndedRef.current?.()
      }}
    >
      <div style={{ position: 'relative' }}>
        <span className="pin-glow" style={{ '--pin-color': '#2563eb' } as React.CSSProperties} />
        {pinImg(USER_PIN_SVG, 26, 34)}
      </div>
    </AdvancedMarker>
  )
}
