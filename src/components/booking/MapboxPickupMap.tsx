import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

/** Pickup-area pin (green) â€” matches the app's brand accent. */
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
  /** Fired when the map fatally fails (token/style/CDN down) â€” the layered
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const hasFittedRef = useRef(false)
  /** True right after the draggable pin is dropped â€” the map fires a click
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
  // one pin per pickup/meeting spot â€” no separate violet/indigo marker).
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

  const cameraPoints = useMemo(() => {
    const coords: [number, number][] = []
    for (const ring of zones) for (const [lat, lng] of ring) coords.push([lng, lat])
    for (const ring of exclusions) for (const [lat, lng] of ring) coords.push([lng, lat])
    for (const p of tourPoints) coords.push([p.lng, p.lat])
    if (userPoint) coords.push([userPoint.lng, userPoint.lat])
    return coords
  }, [zones, exclusions, tourPoints, userPoint])

  // Fits the camera to every zone/point â€” the initial fit AND the Re-center
  // button (mirroring the Google map's Re-center control) share this.
  const fitToCamera = useCallback(
    (map: mapboxgl.Map): void => {
      if (cameraPoints.length === 0) return
      if (cameraPoints.length === 1) {
        map.jumpTo({ center: cameraPoints[0], zoom: 13 })
      } else {
        const bounds = new mapboxgl.LngLatBounds()
        for (const [lng, lat] of cameraPoints) bounds.extend([lng, lat])
        map.fitBounds(bounds, { padding: 50, maxZoom: 15 })
      }
    },
    [cameraPoints],
  )

  const handleRecenter = useCallback((): void => {
    const map = mapRef.current
    if (map) fitToCamera(map)
  }, [fitToCamera])

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

    // Create the map one frame after mount. React StrictMode runs effects
    // twice (mount â†’ cleanup â†’ mount); creating the map synchronously would
    // tear it down and immediately recreate it, and mapbox-gl's shared worker
    // pool does not survive that create/remove/create cycle â€” the live map
    // silently never fetches tiles. Deferring creation to the next frame
    // collapses the double invocation into a single map build.
    let disposed = false
    let disposeMap: (() => void) | null = null
    const frame = window.requestAnimationFrame(() => {
      if (disposed || mapRef.current) return

      let created: mapboxgl.Map
      try {
        created = new mapboxgl.Map({
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
      mapRef.current = created

      // mapbox-gl only auto-resizes on *window* resize (no container
      // ResizeObserver) â€” the map would stay at its initial canvas size when
      // the container changes (e.g. the sm: responsive height or the step's
      // layout settling), leaving the basemap cut. Watch the container and
      // resize the map to match so it always fills the frame.
      const ro = new ResizeObserver(() => {
        const m = mapRef.current
        if (m && m !== created) return
        if (m) m.resize()
      })
      ro.observe(container)
      resizeObserverRef.current = ro

      // A failing style/token must not leave a permanent blank box â€” degrade
      // to the fallback stack after a grace period.
      loadWatchdogRef.current = window.setTimeout(failMap, 12000)

      created.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

      const onClick = (e: mapboxgl.MapMouseEvent): void => {
        // A mouseup right after dropping the draggable pin fires a ghost click â€”
        // skip it so the camera doesn't fly off right after the drop.
        if (dragJustEndedRef.current) {
          dragJustEndedRef.current = false
          return
        }
        const { lng, lat } = e.lngLat
        onUserPointChangeRef.current?.(lat, lng)
        created.flyTo({ center: [lng, lat], zoom: 15, duration: 900 })
        // Fire-and-forget: fill the pickup address with the closest place name.
        void reverseGeocode(lat, lng).then((r) => {
          if (r?.formatted) onUserAddressChangeRef.current?.(r.formatted)
        })
      }
      created.on('click', onClick)

      // Double-click â†’ add a custom pickup spot. `preventDefault()` suppresses
      // the default double-click zoom so the gesture only adds the location.
      const onDblclick = (e: mapboxgl.MapMouseEvent): void => {
        e.preventDefault()
        const { lng, lat } = e.lngLat
        onDoubleClickPointRef.current?.(lat, lng)
      }
      created.on('dblclick', onDblclick)

      created.on('load', () => {
        // Ignore late events from a stale (unmounted) instance â€” StrictMode
        // remounts effects, and a replaced map's 'load' must not mark the live
        // map ready before its own style is loaded.
        if (!mapRef.current || mapRef.current !== created) return
        if (loadWatchdogRef.current != null) {
          window.clearTimeout(loadWatchdogRef.current)
          loadWatchdogRef.current = null
        }
        if (mapFailTimerRef.current != null) {
          window.clearTimeout(mapFailTimerRef.current)
          mapFailTimerRef.current = null
        }

        if (zones.length > 0) {
          created.addSource('pz-zones', { type: 'geojson', data: ringsToFeatureCollection(zones) })
          created.addLayer({ id: 'pz-zones-fill', type: 'fill', source: 'pz-zones', paint: { 'fill-color': 'rgba(23,146,55,.14)' } })
          created.addLayer({ id: 'pz-zones-line', type: 'line', source: 'pz-zones', paint: { 'line-color': '#179237', 'line-width': 2 } })
        }
        if (exclusions.length > 0) {
          created.addSource('pz-excl', { type: 'geojson', data: ringsToFeatureCollection(exclusions) })
          created.addLayer({ id: 'pz-excl-fill', type: 'fill', source: 'pz-excl', paint: { 'fill-color': 'rgba(220,38,38,.14)' } })
          created.addLayer({
            id: 'pz-excl-line',
            type: 'line',
            source: 'pz-excl',
            paint: { 'line-color': '#dc2626', 'line-width': 2, 'line-dasharray': [2, 1] },
          })
        }

        // Pins/zones can arrive AFTER the style loads (the geocode pipeline
        // resolves the tour async) â€” the overlay effect below owns all overlays
        // and re-creates them whenever the tour data changes.
        created.jumpTo({ center: [DEFAULT_CENTER[0], DEFAULT_CENTER[1]], zoom: 6 })

        mapReadyRef.current = true
        setMapReady(true)

        // Tiles-painted watchdog: 'load' can fire with only the style's
        // background rendered (e.g. tile requests failing on a dead/quota'd
        // token) â€” if the map never paints within the grace period, degrade to
        // the fallback stack instead of leaving a blank box.
        let paintedChecks = 0
        paintedWatchdogRef.current = window.setInterval(() => {
          if (!mapRef.current || mapRef.current !== created) {
            if (paintedWatchdogRef.current != null) {
              window.clearInterval(paintedWatchdogRef.current)
              paintedWatchdogRef.current = null
            }
            return
          }
          if (created.loaded()) {
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

      // A dead WebGL context paints nothing and fires no map 'error' â€” fail
      // over immediately so the fallback stack takes over.
      created.on('webglcontextlost', () => {
        if (!mapRef.current || mapRef.current !== created) return
        failMap()
      })

      // A failing style/tile CDN must not leave a permanent blank box â€” degrade
      // after a grace period. Errors on a map that HAS painted are transient
      // (single raster tile 404s self-heal); errors before the first paint mean
      // the basemap is dead and the fallback stack should take over.
      created.on('error', () => {
        if (!mapRef.current || mapRef.current !== created) return
        if (paintedRef.current) return
        if (mapFailTimerRef.current == null) {
          mapFailTimerRef.current = window.setTimeout(failMap, 5000)
        }
      })

      disposeMap = () => {
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
        resizeObserverRef.current?.disconnect()
        resizeObserverRef.current = null
        tourPinsRef.current.forEach((m) => m.remove())
        tourPinsRef.current = []
        extraPinsRef.current.forEach((m) => m.remove())
        extraPinsRef.current = []
        if (userPinRef.current) {
          userPinRef.current.remove()
          userPinRef.current = null
        }
        created.off('click', onClick)
        created.off('dblclick', onDblclick)
        created.remove()
        mapRef.current = null
        mapReadyRef.current = false
        paintedRef.current = false
        // A fresh map mount must re-fit the camera to the pins (StrictMode
        // remounts effects without resetting refs, which would otherwise leave
        // the second map stuck on the default camera).
        hasFittedRef.current = false
        setMapReady(false)
      }
    })

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      disposeMap?.()
    }
    // The map is built once per mount; overlays update live via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live-update overlays as the tour data or the traveller's location changes.
  // The geocode pipeline resolves the tour async, so zones/pins can arrive
  // after the map built â€” this effect owns ALL overlays and re-creates them
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
        // Style not fully loaded yet â€” retried on the next data change.
      }
    }
    if (zones.length > 0) ensureZoneLayer('pz-zones', zones)
    if (exclusions.length > 0) ensureZoneLayer('pz-excl', exclusions)

    // Supplier pins â€” all pickup/meeting points in green with the pulsating
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

    // Refresh the extra (landmark) pins â€” amber dots.
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

    // Refresh the traveller's blue pin (draggable â€” repositioning updates the
    // live zone verdict, mirroring the GetYourGuide pickup map). The existing
    // marker is moved in place with setLngLat â€” never recreated â€” so a drop
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
      fitToCamera(map)
    }
  }, [zones, exclusions, userPoint, mapReady, extraPoints, tourPoints, cameraPoints, fitToCamera])

  return (
    <div className="px-0 py-3">
      <div className={`relative ${mapHeight} w-full touch-none overflow-hidden rounded-xl border border-slate-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
        {/* The mapbox-gl CSS forces `.mapboxgl-map { position: relative }`, which
            defeats Tailwind's `absolute inset-0` â€” the container would collapse to
            a few pixels instead of filling the fixed-height frame and the canvas
            ends up a mismatched size, cutting the map. Size it in flow with
            h-full/w-full instead (the frame owns the height). */}
        <div ref={containerRef} className="z-0 h-full w-full" />
        {mapReady && (
          <button
            type="button"
            title="Re-center map on pickup zones"
            onClick={handleRecenter}
            className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#047857] shadow-sm transition-colors hover:bg-slate-50"
          >
            Re-center
          </button>
        )}
        {!mapReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
            <RefreshCw size={14} className="animate-spin text-slate-400" />
            <span className="ml-2 text-xs font-medium text-slate-400">Loading mapâ€¦</span>
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
