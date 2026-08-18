import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { getGoogleMapsMapId } from '@/lib/googleMaps'
import { reverseGeocode } from '@/lib/locations'
import {
  DEFAULT_CENTER,
  TOUR_PIN_COLOR,
  buildTourPoints,
  pinSvg,
  svgDataUri,
  toNumber,
  type PickupMapSource,
} from '@/lib/mapUtils'
import type { PickupAreaShape } from '@/lib/pickupZone'
import type { PickupZoneMapTour } from './PickupZoneMap'

/** Blue draggable pin for the traveller's chosen pickup location. */
const USER_PIN_SVG = `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill="#2563eb"/><circle cx="13" cy="13" r="5" fill="#fff"/></svg>`

/**
 * Renders a classic pin SVG (tip at the bottom edge) as the `content` of an
 * AdvancedMarkerElement. The advanced marker anchors its content by default at
 * the element's bottom center, which lands the pin tip on the map point.
 */
function pinContentElement(svg: string, width: number, height: number): HTMLImageElement {
  const img = document.createElement('img')
  img.src = svgDataUri(svg)
  img.style.width = `${width}px`
  img.style.height = `${height}px`
  img.style.pointerEvents = 'none'
  return img
}

/** Position from an AdvancedMarkerElement, tolerating LatLng or LatLngLiteral. */
function markerPosition(
  maps: typeof google.maps,
  marker: google.maps.marker.AdvancedMarkerElement,
): { lat: number; lng: number } | null {
  const pos = marker.position
  if (!pos) return null
  if (pos instanceof maps.LatLng) return { lat: pos.lat(), lng: pos.lng() }
  return { lat: pos.lat, lng: pos.lng }
}

interface GooglePickupMapProps {
  /** Resolved `google.maps` namespace from the loader (always defined here). */
  maps: typeof google.maps
  tour: PickupZoneMapTour
  userMarker?: { lat: number | null; lng: number | null } | null
  onUserPointChange?: (lat: number, lng: number) => void
  /** Reverse-geocoded formatted address for a point picked on the map. */
  onUserAddressChange?: (address: string) => void
}

/**
 * Google Maps renderer for the checkout pickup map — the primary provider
 * once the Maps JavaScript API has loaded. Mirrors the MapLibre + OSM
 * `PickupZoneMap` visuals: green service zones, red exclusions, green tour
 * pins and a draggable blue pin for the traveller's location.
 *
 * The Google map is created exactly once; polygons/pins are torn down and
 * re-added when the tour data changes. The traveller's draggable pin is
 * managed separately so dragging never rebuilds the map.
 */
export default function GooglePickupMap({ maps, tour, userMarker, onUserPointChange, onUserAddressChange }: GooglePickupMapProps) {
  const [mapReady, setMapReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const tourPinsRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const userPinRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const polygonsRef = useRef<google.maps.Polygon[]>([])
  const onUserPointChangeRef = useRef(onUserPointChange)
  const onUserAddressChangeRef = useRef(onUserAddressChange)
  useEffect(() => {
    onUserPointChangeRef.current = onUserPointChange
    onUserAddressChangeRef.current = onUserAddressChange
  }, [onUserPointChange, onUserAddressChange])

  // Supplier's pickup/meeting points (green pins).
  const tourPoints = useMemo(() => buildTourPoints(tour as PickupMapSource), [tour])

  // Drawn geoshapes + exclusion zones from the supplier's Step-13 config.
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

  // The traveller's typed/dragged pickup location (blue pin).
  const userPoint = useMemo(() => {
    const lat = toNumber(userMarker?.lat)
    const lng = toNumber(userMarker?.lng)
    return lat != null && lng != null ? { lat, lng } : null
  }, [userMarker?.lat, userMarker?.lng])

  const hasMapData = zones.length > 0 || exclusions.length > 0 || tourPoints.length > 0 || userPoint != null

  // All coordinates the initial camera must fit (Accra fallback otherwise).
  const cameraPoints = useMemo(() => {
    const pts: google.maps.LatLngLiteral[] = []
    for (const ring of zones) for (const [lat, lng] of ring) pts.push({ lat, lng })
    for (const ring of exclusions) for (const [lat, lng] of ring) pts.push({ lat, lng })
    for (const p of tourPoints) pts.push({ lat: p.lat, lng: p.lng })
    if (userPoint) pts.push(userPoint)
    return pts
  }, [zones, exclusions, tourPoints, userPoint])

  // Latest camera targets, so the "Re-center" control always refits the current
  // zones/pins instead of the ones captured when the map was first created.
  const cameraPointsRef = useRef(cameraPoints)
  useEffect(() => {
    cameraPointsRef.current = cameraPoints
  }, [cameraPoints])

  const fitCamera = (map: google.maps.Map, pts: google.maps.LatLngLiteral[]): void => {
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
    const bounds = new maps.LatLngBounds()
    for (const p of pts) bounds.extend(p)
    map.fitBounds(bounds, 48)
  }

  // Build the map once (overlays drawn by the effect below).
  useEffect(() => {
    const container = containerRef.current
    if (!container || !maps || !hasMapData) return
    if (mapRef.current) return

    const map = new maps.Map(container, {
      center: { lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] },
      zoom: 6,
      // Advanced markers (google.maps.marker.AdvancedMarkerElement) require a
      // map ID at init. A real VITE_GOOGLE_MAPS_MAP_ID enables cloud-styled
      // maps; DEMO_MAP_ID works without creating one in the console.
      mapId: getGoogleMapsMapId() || maps.Map.DEMO_MAP_ID,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    })
    mapRef.current = map
    fitCamera(map, cameraPoints)

    // Click-to-pick (mirrors the supplier's LocationMapPicker): sets the
    // traveller's pickup coordinates, drops the pin and zooms to street level.
    // Cleaned up with the map's other listeners by clearInstanceListeners.
    maps.event.addListener(map, 'click', (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat()
      const lng = e.latLng?.lng()
      if (lat == null || lng == null) return
      onUserPointChangeRef.current?.(lat, lng)
      map.panTo({ lat, lng })
      map.setZoom(15)
      // Fire-and-forget: fill the pickup address with the closest place name.
      void reverseGeocode(lat, lng).then((r) => {
        if (r?.formatted) onUserAddressChangeRef.current?.(r.formatted)
      })
    })

    // Custom control that re-fits the camera to the current zones/pins —
    // useful after the traveller drags their pin or pans around.
    const recenter = document.createElement('button')
    recenter.type = 'button'
    recenter.title = 'Re-center map on pickup zones'
    recenter.textContent = 'Re-center'
    recenter.style.cssText = [
      'margin: 8px 0',
      'padding: 6px 14px',
      'font: 500 12px/1.4 system-ui, sans-serif',
      'color: #047857',
      'backgroundColor: #ffffff',
      'border: 1px solid #e2e8f0',
      'borderRadius: 9999px',
      'boxShadow: 0 1px 2px rgb(0 0 0 / 0.08)',
      'cursor: pointer',
    ].join(';')
    recenter.addEventListener('click', () => {
      const m = mapRef.current
      if (m) fitCamera(m, cameraPointsRef.current)
    })
    map.controls[maps.ControlPosition.TOP_CENTER].push(recenter)

    maps.event.addListenerOnce(map, 'tilesloaded', () => setMapReady(true))

    const ro = new ResizeObserver(() => {
      const m = mapRef.current
      if (m) maps.event.trigger(m, 'resize')
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      map.controls[maps.ControlPosition.TOP_CENTER].clear()
      tourPinsRef.current.forEach((m) => {
        m.map = null
      })
      tourPinsRef.current = []
      if (userPinRef.current) {
        userPinRef.current.map = null
        userPinRef.current = null
      }
      polygonsRef.current.forEach((p) => p.setMap(null))
      polygonsRef.current = []
      maps.event.clearInstanceListeners(map)
      mapRef.current = null
      setMapReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps, hasMapData])

  // Draw the supplier's zones/exclusions and tour pins; re-drawn when the
  // tour data changes (the map instance itself is reused).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !maps) return
    for (const p of polygonsRef.current) p.setMap(null)
    polygonsRef.current = []
    tourPinsRef.current.forEach((m) => {
      m.map = null
    })
    tourPinsRef.current = []

    for (const ring of zones) {
      polygonsRef.current.push(
        new maps.Polygon({
          map,
          paths: ring.map(([lat, lng]) => ({ lat, lng })),
          fillColor: '#179237',
          fillOpacity: 0.12,
          strokeColor: '#179237',
          strokeWeight: 2,
        }),
      )
    }
    for (const ring of exclusions) {
      polygonsRef.current.push(
        new maps.Polygon({
          map,
          paths: ring.map(([lat, lng]) => ({ lat, lng })),
          fillColor: '#dc2626',
          fillOpacity: 0.12,
          strokeColor: '#dc2626',
          strokeWeight: 2,
        }),
      )
    }

    for (const p of tourPoints) {
      tourPinsRef.current.push(
        new maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: p.lat, lng: p.lng },
          content: pinContentElement(pinSvg(TOUR_PIN_COLOR), 32, 40),
          title: p.label || undefined,
          zIndex: 1,
        }),
      )
    }
  }, [maps, zones, exclusions, tourPoints])

  // The traveller's draggable blue pin — repositioning updates the live zone
  // verdict, mirroring the GetYourGuide pickup map.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !maps) return
    if (userPinRef.current) {
      userPinRef.current.map = null
      userPinRef.current = null
    }
    if (!userPoint) return

    const marker = new maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: userPoint.lat, lng: userPoint.lng },
      content: pinContentElement(USER_PIN_SVG, 26, 34),
      gmpDraggable: true,
      zIndex: 2,
    })
    marker.addListener('dragend', () => {
      const pos = markerPosition(maps, marker)
      if (pos) onUserPointChangeRef.current?.(pos.lat, pos.lng)
    })
    userPinRef.current = marker

    // A freshly chosen address may sit outside the current viewport — pan to
    // it so the traveller sees their pin.
    const bounds = map.getBounds()
    if (!bounds || !bounds.contains(new maps.LatLng(userPoint.lat, userPoint.lng))) {
      map.panTo(new maps.LatLng(userPoint.lat, userPoint.lng))
    }
  }, [maps, userPoint, mapReady])

  if (!hasMapData) return null

  return (
    <div className="p-3">
      <div className="relative h-[220px] w-full overflow-hidden rounded-lg border border-slate-200/40">
        <div ref={containerRef} className="absolute inset-0 z-0" />
        {mapReady && (
          <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5 rounded-lg bg-white/90 px-2.5 py-2 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: '#179237' }} /> Pickup zone
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: '#dc2626' }} /> No pickup
            </span>
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