import { useEffect, useMemo, useRef, useState } from 'react'
import * as mapboxgl from 'mapbox-gl/esm'
import { MapPin, RefreshCw } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'
import { reverseGeocode } from '@/lib/locations'
import {
  DEFAULT_CENTER,
  buildTourPoints,
  pulsingPinElement,
  ringsToFeatureCollection,
  toNumber,
  type MapPoint,
  type PickupMapSource,
} from '@/lib/mapUtils'
import { getMapboxToken, MAPBOX_STYLE } from '@/lib/mapbox'
import { pickupZoneRings } from '@/lib/pickupZone'
import type { PickupZoneMapTour } from './PickupZoneMap'

/** Pickup-area pin (green) — matches the app's brand accent. */
const PICKUP_PIN_COLOR = '#179237'
/** Traveller's chosen pickup location (blue, draggable). */
const USER_PIN_COLOR = '#2563eb'
/** Extra (landmark) pins. */
const EXTRA_PIN_COLOR = '#d97706'

interface MapboxPickupMapProps {
  tour: PickupZoneMapTour
  userMarker?: { lat: number | null; lng: number | null } | null
  onUserPointChange?: (lat: number, lng: number) => void
  /** Reverse-geocoded formatted address for a point picked on the map. */
  onUserAddressChange?: (address: string) => void
  /** Extra non-interactive pins (e.g. nearby landmarks) layered on the map. */
  extraPoints?: MapPoint[]
  /** Fired when the pin's label is tapped. */
  onPinClick?: (label: string) => void
  /** Fired when the map is double-clicked at a spot (to add a pickup location). */
  onDoubleClickPoint?: (lat: number, lng: number) => void
  /** Fired when the map fatally fails (token/style/CDN down) — the layered
      LocationMap then falls back to MapLibre/Google/text. */
  onFatalFailure?: () => void
  /** Height classes for the map container (defaults to the standard booking height). */
  mapHeight?: string
}

/**
 * The booking page's pickup map on Mapbox GL JS (2D only). Renders the
 * supplier's drawn pickup zones (green), exclusion zones (red dashed), the
 * pickup points (green pins), the meeting point (indigo pin) and the
 * traveller's draggable blue pin.
 *
 * This is the PRIMARY renderer of the layered LocationMap; any fatal failure
 * (bad token, billing, style CDN) degrades to the MapLibre + OSM stack.
 */
export default function MapboxPickupMap({
  tour,
  userMarker,
  onUserPointChange,
  onUserAddressChange,
  extraPoints,
  onPinClick,
  onDoubleClickPoint,
  onFatalFailure,
  mapHeight = 'h-[320px] sm:h-[340px]',
}: MapboxPickupMapProps) {
  const [mapReady, setMapReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const tourPinsRef = useRef<mapboxgl.Marker[]>([])
  const extraPinsRef = useRef<mapboxgl.Marker[]>([])
  const userPinRef = useRef<mapboxgl.Marker | null>(null)
  const mapReadyRef = useRef(false)
  const paintedRef = useRef(false)
  const mapFailTimerRef = useRef<number | null>(null)
  const loadWatchdogRef = useRef<number | null>(null)
  const paintedWatchdogRef = useRef<number | null>(null)
  const hasFittedRef = useRef(false)
  /** True right after the draggable pin is dropped — the map fires a click
      after a marker drag; that ghost click must not re-trigger click-to-pick
      (which would fly the camera off to zoom 15 / re-open the prompt). */
  const dragJustEndedRef = useRef(false)
  const onUserPointChangeRef = useRef(onUserPointChange)
  const onUserAddressChangeRef = useRef(onUserAddressChange)
  const onPinClickRef = useRef(onPinClick)
  const onDoubleClickPointRef = useRef(onDoubleClickPoint)
  const onFatalFailureRef = useRef(onFatalFailure)
  useEffect(() => {
    onUserPointChangeRef.current = onUserPointChange
    onUserAddressChangeRef.current = onUserAddressChange
    onPinClickRef.current = onPinClick
    onDoubleClickPointRef.current = onDoubleClickPoint
    onFatalFailureRef.current = onFatalFailure
  }, [onUserPointChange, onUserAddressChange, onPinClick, onDoubleClickPoint, onFatalFailure])

  const failMap = (): void => {
    setMapReady(false)
    mapReadyRef.current = false
    paintedRef.current = false
    onFatalFailureRef.current?.()
  }

  // Pickup points and the meeting point are both green pins (the map renders
  // one pin per pickup/meeting spot — no separate violet/indigo marker).
  const tourPoints = useMemo(() => buildTourPoints(tour as PickupMapSource), [tour])

  // Drawn geoshapes + exclusion zones from the supplier's Step-13 config.
  // Location-only areas (a saved point, no drawn polygon) render as a
  // LOCATION_AREA_RADIUS_M circle — only when it's the tour's single pickup
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

  const cameraPoints = useMemo(() => {
    const coords: [number, number][] = []
    for (const ring of zones) for (const [lat, lng] of ring) coords.push([lng, lat])
    for (const ring of exclusions) for (const [lat, lng] of ring) coords.push([lng, lat])
    for (const p of tourPoints) coords.push([p.lng, p.lat])
    if (userPoint) coords.push([userPoint.lng, userPoint.lat])
    return coords
  }, [zones, exclusions, tourPoints, userPoint])

  // Build the map once; overlays are live-updated by the effect below.
  useEffect(() => {
    if (mapRef.current) return
    const container = containerRef.current
    if (!container) return
    const token = getMapboxToken()
    if (!token) {
      window.setTimeout(failMap, 0)
      return
    }

    let map: mapboxgl.Map
    try {
      map = new mapboxgl.Map({
        accessToken: token,
        container,
        style: MAPBOX_STYLE,
        center: [DEFAULT_CENTER[0], DEFAULT_CENTER[1]],
        zoom: 6,
        // Locked 2D: mercator projection, no tilting.
        projection: 'mercator',
        maxPitch: 0,
      })
    } catch {
      window.setTimeout(failMap, 0)
      return
    }
    mapRef.current = map

    // A failing style/token must not leave a permanent blank box — degrade to
    // the fallback stack after a grace period.
    loadWatchdogRef.current = window.setTimeout(failMap, 12000)

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    const onClick = (e: mapboxgl.MapMouseEvent): void => {
      // A mouseup right after dropping the draggable pin fires a ghost click —
      // skip it so the camera doesn't fly off right after the drop.
      if (dragJustEndedRef.current) {
        dragJustEndedRef.current = false
        return
      }
      const { lng, lat } = e.lngLat
      onUserPointChangeRef.current?.(lat, lng)
      map.flyTo({ center: [lng, lat], zoom: 15, duration: 900 })
      // Fire-and-forget: fill the pickup address with the closest place name.
      void reverseGeocode(lat, lng).then((r) => {
        if (r?.formatted) onUserAddressChangeRef.current?.(r.formatted)
      })
    }
    map.on('click', onClick)

    // Double-click → add a custom pickup spot. `preventDefault()` suppresses
    // the default double-click zoom so the gesture only adds the location.
    const onDblclick = (e: mapboxgl.MapMouseEvent): void => {
      e.preventDefault()
      const { lng, lat } = e.lngLat
      onDoubleClickPointRef.current?.(lat, lng)
    }
    map.on('dblclick', onDblclick)

    map.on('load', () => {
      // Ignore late events from a stale (unmounted) instance — StrictMode
      // remounts effects, and a replaced map's 'load' must not mark the live
      // map ready before its own style is loaded.
      if (!mapRef.current || mapRef.current !== map) return
      if (loadWatchdogRef.current != null) {
        window.clearTimeout(loadWatchdogRef.current)
        loadWatchdogRef.current = null
      }
      if (mapFailTimerRef.current != null) {
        window.clearTimeout(mapFailTimerRef.current)
        mapFailTimerRef.current = null
      }

      if (zones.length > 0) {
        map.addSource('pz-zones', { type: 'geojson', data: ringsToFeatureCollection(zones) })
        map.addLayer({ id: 'pz-zones-fill', type: 'fill', source: 'pz-zones', paint: { 'fill-color': 'rgba(23,146,55,.14)' } })
        map.addLayer({ id: 'pz-zones-line', type: 'line', source: 'pz-zones', paint: { 'line-color': '#179237', 'line-width': 2 } })
      }
      if (exclusions.length > 0) {
        map.addSource('pz-excl', { type: 'geojson', data: ringsToFeatureCollection(exclusions) })
        map.addLayer({ id: 'pz-excl-fill', type: 'fill', source: 'pz-excl', paint: { 'fill-color': 'rgba(220,38,38,.14)' } })
        map.addLayer({
          id: 'pz-excl-line',
          type: 'line',
          source: 'pz-excl',
          paint: { 'line-color': '#dc2626', 'line-width': 2, 'line-dasharray': [2, 1] },
        })
      }

      // Pins/zones can arrive AFTER the style loads (the geocode pipeline
      // resolves the tour async) — the overlay effect below owns all overlays
      // and re-creates them whenever the tour data changes.
      map.jumpTo({ center: [DEFAULT_CENTER[0], DEFAULT_CENTER[1]], zoom: 6 })

      mapReadyRef.current = true
      setMapReady(true)

      // Tiles-painted watchdog: 'load' can fire with only the style's
      // background rendered (e.g. tile requests failing on a dead/quota'd
      // token) — if the map never paints within the grace period, degrade to
      // the fallback stack instead of leaving a blank box.
      let paintedChecks = 0
      paintedWatchdogRef.current = window.setInterval(() => {
        if (!mapRef.current || mapRef.current !== map) {
          if (paintedWatchdogRef.current != null) {
            window.clearInterval(paintedWatchdogRef.current)
            paintedWatchdogRef.current = null
          }
          return
        }
        if (map.loaded()) {
          paintedRef.current = true
          if (paintedWatchdogRef.current != null) {
            window.clearInterval(paintedWatchdogRef.current)
            paintedWatchdogRef.current = null
          }
          return
        }
        paintedChecks += 1
        if (paintedChecks >= 10) {
          if (paintedWatchdogRef.current != null) {
            window.clearInterval(paintedWatchdogRef.current)
            paintedWatchdogRef.current = null
          }
          failMap()
        }
      }, 1000)
    })

    // A dead WebGL context paints nothing and fires no map 'error' — fail
    // over immediately so the fallback stack takes over.
    map.on('webglcontextlost', () => {
      if (!mapRef.current || mapRef.current !== map) return
      failMap()
    })

    // A failing style/tile CDN must not leave a permanent blank box — degrade
    // after a grace period. Errors on a map that HAS painted are transient
    // (single raster tile 404s self-heal); errors before the first paint mean
    // the basemap is dead and the fallback stack should take over.
    map.on('error', () => {
      if (!mapRef.current || mapRef.current !== map) return
      if (paintedRef.current) return
      if (mapFailTimerRef.current == null) {
        mapFailTimerRef.current = window.setTimeout(failMap, 5000)
      }
    })

    return () => {
      if (loadWatchdogRef.current != null) {
        window.clearTimeout(loadWatchdogRef.current)
        loadWatchdogRef.current = null
      }
      if (mapFailTimerRef.current != null) {
        window.clearTimeout(mapFailTimerRef.current)
        mapFailTimerRef.current = null
      }
      if (paintedWatchdogRef.current != null) {
        window.clearInterval(paintedWatchdogRef.current)
        paintedWatchdogRef.current = null
      }
      tourPinsRef.current.forEach((m) => m.remove())
      tourPinsRef.current = []
      extraPinsRef.current.forEach((m) => m.remove())
      extraPinsRef.current = []
      if (userPinRef.current) {
        userPinRef.current.remove()
        userPinRef.current = null
      }
      map.off('click', onClick)
      map.off('dblclick', onDblclick)
      map.remove()
      mapRef.current = null
      mapReadyRef.current = false
      paintedRef.current = false
      setMapReady(false)
    }
    // The map is built once per mount; overlays update live via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live-update overlays as the tour data or the traveller's location changes.
  // The geocode pipeline resolves the tour async, so zones/pins can arrive
  // after the map built — this effect owns ALL overlays and re-creates them
  // whenever the data changes (never re-mounts the map).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Zone/exclusion layers: create if the style loaded without them (late
    // data), otherwise push the new geometry into the existing sources.
    const ensureZoneLayer = (id: 'pz-zones' | 'pz-excl', rings: [number, number][][]): void => {
      try {
        if (!map.getLayer(id)) {
          map.addSource(id, { type: 'geojson', data: ringsToFeatureCollection(rings) })
          if (id === 'pz-zones') {
            map.addLayer({ id: 'pz-zones-fill', type: 'fill', source: id, paint: { 'fill-color': 'rgba(23,146,55,.14)' } })
            map.addLayer({ id: 'pz-zones-line', type: 'line', source: id, paint: { 'line-color': '#179237', 'line-width': 2 } })
          } else {
            map.addLayer({ id: 'pz-excl-fill', type: 'fill', source: id, paint: { 'fill-color': 'rgba(220,38,38,.14)' } })
            map.addLayer({ id: 'pz-excl-line', type: 'line', source: id, paint: { 'line-color': '#dc2626', 'line-width': 2, 'line-dasharray': [2, 1] } })
          }
        } else {
          const source = map.getSource(id)
          if (source && 'setData' in source) {
            (source as mapboxgl.GeoJSONSource).setData(ringsToFeatureCollection(rings))
          }
        }
      } catch {
        // Style not fully loaded yet — retried on the next data change.
      }
    }
    if (zones.length > 0) ensureZoneLayer('pz-zones', zones)
    if (exclusions.length > 0) ensureZoneLayer('pz-excl', exclusions)

    // Supplier pins — all pickup/meeting points in green with the pulsating
    // glow halo (no separate violet/indigo marker).
    tourPinsRef.current.forEach((m) => m.remove())
    tourPinsRef.current = []
    const addPin = (p: MapPoint, color: string): void => {
      const marker = new mapboxgl.Marker({ element: pulsingPinElement(color), anchor: 'bottom' })
      marker.setLngLat([p.lng, p.lat])
      if (p.label) {
        marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setText(p.label))
        marker.getElement().addEventListener('click', () => {
          onPinClickRef.current?.(p.label || '')
        })
      }
      tourPinsRef.current.push(marker.addTo(map))
    }
    for (const p of tourPoints) addPin(p, PICKUP_PIN_COLOR)

    // Refresh the extra (landmark) pins — amber dots.
    extraPinsRef.current.forEach((m) => m.remove())
    extraPinsRef.current = []
    for (const p of extraPoints || []) {
      const marker = new mapboxgl.Marker({ color: EXTRA_PIN_COLOR, anchor: 'bottom' })
      marker.setLngLat([p.lng, p.lat])
      if (p.label) {
        marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setText(p.label))
      }
      extraPinsRef.current.push(marker.addTo(map))
    }

    // Refresh the traveller's blue pin (draggable — repositioning updates the
    // live zone verdict, mirroring the GetYourGuide pickup map). The existing
    // marker is moved in place with setLngLat — never recreated — so a drop
    // never skids the pin to a stale position.
    if (userPinRef.current) {
      if (userPoint) {
        userPinRef.current.setLngLat([userPoint.lng, userPoint.lat])
      } else {
        userPinRef.current.remove()
        userPinRef.current = null
      }
    } else if (userPoint) {
      // Blue draggable pin with the same pulsating glow as the tour pins.
      const marker = new mapboxgl.Marker({ element: pulsingPinElement(USER_PIN_COLOR, 'grab'), anchor: 'bottom', draggable: true })
      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat()
        onUserPointChangeRef.current?.(lat, lng)
        dragJustEndedRef.current = true
      })
      userPinRef.current = marker.setLngLat([userPoint.lng, userPoint.lat]).addTo(map)
    }

    // Fit the camera once real coordinates arrive (the build-time camera is
    // the Accra fallback); never refit on later user interactions.
    if (cameraPoints.length > 0 && !hasFittedRef.current) {
      hasFittedRef.current = true
      if (cameraPoints.length === 1) {
        map.jumpTo({ center: cameraPoints[0], zoom: 13 })
      } else {
        const bounds = new mapboxgl.LngLatBounds()
        for (const [lng, lat] of cameraPoints) bounds.extend([lng, lat])
        map.fitBounds(bounds, { padding: 50, maxZoom: 15 })
      }
    }
  }, [zones, exclusions, userPoint, mapReady, extraPoints, tourPoints, cameraPoints])

  return (
    <div className="p-3">
      <div className={`relative ${mapHeight} w-full touch-none overflow-hidden rounded-xl border border-slate-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
        <div ref={containerRef} className="absolute inset-0 z-0" />
        {!mapReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
            <RefreshCw size={14} className="animate-spin text-slate-400" />
            <span className="ml-2 text-xs font-medium text-slate-400">Loading map…</span>
          </div>
        )}
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
                  <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill={PICKUP_PIN_COLOR} />
                  <circle cx="16" cy="16" r="6" fill="white" stroke={PICKUP_PIN_COLOR} strokeWidth="2" />
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
      </div>
    </div>
  )
}
