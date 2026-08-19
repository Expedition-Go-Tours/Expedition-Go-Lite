import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import { MapPin, RefreshCw } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { reverseGeocode } from '@/lib/locations'
import {
  DEFAULT_CENTER,
  TOUR_PIN_COLOR,
  USER_PIN_COLOR,
  buildTileStyle,
  buildTourPoints,
  cameraFromGeoData,
  createMapLibreMap,
  pulsingPinElement,
  resolveTileProvider,
  ringsToFeatureCollection,
  toNumber,
  warmMapResources,
  type MapPoint,
  type PickupMapSource,
  type TileProvider,
} from '@/lib/mapUtils'
import { pickupZoneRings, type PickupAreaShape } from '@/lib/pickupZone'

/**
 * The booking page's tour object — the supplier's meeting/pickup config with
 * the drawn geoshapes that PickupMapSource doesn't declare.
 */
export interface PickupZoneMapTour {
  meetingMode?: 'meeting_point' | 'pickup' | 'none'
  meetingPoint?: string
  meetingPointAddress?: string
  meetingPointLat?: number | null
  meetingPointLng?: number | null
  pickupAreas?: (PickupAreaShape | null | undefined)[]
  pickupLocations?: { name?: string; address?: string; lat?: number | null; lng?: number | null }[]
  pickupDescription?: string
}

/**
 * GetYourGuide-style pickup map for the checkout. Renders the supplier's
 * drawn zones (green), exclusion zones (red dashed), the pickup/meeting
 * points, and a draggable blue pin for the traveller's chosen location.
 *
 * Production notes (mirroring the supplier dashboard's map system):
 *  - the tile style is warmed up (preconnect + force-cached fetch) before the
 *    first map opens, so the checkout never cold-starts against the tile CDN;
 *  - all map state lives in refs; sources/overlays are created exactly once
 *    and live-updated, so React re-renders never recreate the map;
 *  - a failing style degrades to the OSM embed / text + Google Maps link
 *    instead of leaving a blank box;
 *  - torn-down completely on unmount (no leaked maps, markers or timers).
 *
 * When the tour has no coordinates at all (legacy name/address-only config)
 * it falls back to an OSM embed located by the address string.
 */
export default function PickupZoneMap({
  tour,
  userMarker,
  onUserPointChange,
  onUserAddressChange,
  extraPoints,
  onFatalFailure,
  mapDisabled,
  onPinClick,
  onDoubleClickPoint,
  mapHeight = 'h-[320px] sm:h-[340px]',
}: {
  tour: PickupZoneMapTour
  userMarker?: { lat: number | null; lng: number | null } | null
  onUserPointChange?: (lat: number, lng: number) => void
  /** Reverse-geocoded formatted address for a point picked on the map. */
  onUserAddressChange?: (address: string) => void
  /** Extra non-interactive pins (e.g. nearby landmarks) layered on the map. */
  extraPoints?: MapPoint[]
  /** Fired when the map fatally fails (tile/style CDN down) — the layered
      LocationMap uses this to switch to Google Maps. */
  onFatalFailure?: () => void
  /** When true, never attempt to build the map — render the text fallback
      directly (used after the Google fallback also fails). */
  mapDisabled?: boolean
  /** Fired with the pin's label when a tour pickup/meeting pin is tapped. */
  onPinClick?: (label: string) => void
  /** Fired when the map is double-clicked at a spot (to add a pickup location). */
  onDoubleClickPoint?: (lat: number, lng: number) => void
  /** Height classes for the map container (defaults to the standard booking height). */
  mapHeight?: string
}) {
  const [osmFailed, setOsmFailed] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [tileProvider, setTileProvider] = useState<TileProvider | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const embedRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const tourPinsRef = useRef<maplibregl.Marker[]>([])
  const extraPinsRef = useRef<maplibregl.Marker[]>([])
  const userPinRef = useRef<maplibregl.Marker | null>(null)
  const mapReadyRef = useRef(false)
  const paintedRef = useRef(false)
  const mapFailTimerRef = useRef<number | null>(null)
  const loadWatchdogRef = useRef<number | null>(null)
  const paintedWatchdogRef = useRef<number | null>(null)
  /** True right after the draggable pin is dropped — the map fires a click
      after a marker drag; that ghost click must not re-trigger click-to-pick
      (which would fly the camera off to zoom 15 / re-open the prompt). */
  const dragJustEndedRef = useRef(false)
  const onUserPointChangeRef = useRef(onUserPointChange)
  const onUserAddressChangeRef = useRef(onUserAddressChange)
  const onFatalFailureRef = useRef(onFatalFailure)
  const onPinClickRef = useRef(onPinClick)
  const onDoubleClickPointRef = useRef(onDoubleClickPoint)
  useEffect(() => {
    onUserPointChangeRef.current = onUserPointChange
    onUserAddressChangeRef.current = onUserAddressChange
    onFatalFailureRef.current = onFatalFailure
    onPinClickRef.current = onPinClick
    onDoubleClickPointRef.current = onDoubleClickPoint
  }, [onUserPointChange, onUserAddressChange, onFatalFailure, onPinClick, onDoubleClickPoint])

  const failMap = (): void => {
    setMapFailed(true)
    paintedRef.current = false
    onFatalFailureRef.current?.()
  }

  // Supplier's pickup/meeting points (green pins) + the traveller's pin.
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

  const points: MapPoint[] = useMemo(
    () => [...tourPoints, ...(userPoint ? [{ lat: userPoint.lat, lng: userPoint.lng, kind: 'user' as const }] : [])],
    [tourPoints, userPoint],
  )
  const userPointKey = userPoint ? `${userPoint.lat.toFixed(6)},${userPoint.lng.toFixed(6)}` : ''

  const hasMapData =
    zones.length > 0 || exclusions.length > 0 || tourPoints.length > 0 || userPoint != null

  // Textual fallback when the supplier only entered names/addresses (no
  // coordinates): still render a map by asking Google to locate the address.
  const fallbackQuery = useMemo(() => {
    // Infer effective mode when meetingMode is undefined.
    const hasMeeting = !!(tour.meetingPoint || tour.meetingPointAddress)
    const hasPickup = (tour.pickupAreas?.length ?? 0) > 0 || (tour.pickupLocations?.length ?? 0) > 0
    const mode = tour.meetingMode ?? (hasMeeting ? 'meeting_point' : hasPickup ? 'pickup' : undefined)

    if (mode === 'meeting_point') {
      return tour.meetingPointAddress || tour.meetingPoint || ''
    }
    if (mode === 'pickup') {
      const area = (tour.pickupAreas || []).find((a) => a && (a.address || a.name))
      if (area) return area.address || area.name || ''
      const loc = (tour.pickupLocations || []).find((l) => l && (l.address || l.name))
      if (loc) return loc.address || loc.name || ''
      return tour.pickupDescription || ''
    }
    return ''
  }, [tour.meetingMode, tour.meetingPointAddress, tour.meetingPoint, tour.pickupAreas, tour.pickupLocations, tour.pickupDescription])

  // Pick a healthy tile provider once per page load (probes the first tile),
  // then hand the choice to the build effect below.
  useEffect(() => {
    if (mapFailed || mapDisabled || !hasMapData) return
    let cancelled = false
    void resolveTileProvider().then((provider) => {
      if (!cancelled) setTileProvider(provider)
    })
    return () => {
      cancelled = true
    }
  }, [mapFailed, mapDisabled, hasMapData])

  // Build the map once: warmed style, zone/exclusion overlays, tour pins and
  // an initial camera that fits the whole service area.
  useEffect(() => {
    if (mapFailed || mapDisabled || !hasMapData || !tileProvider || !containerRef.current) return
    if (mapRef.current) return
    warmMapResources()
    const container = containerRef.current
    const map = createMapLibreMap(container, {
      style: buildTileStyle(tileProvider),
      center: DEFAULT_CENTER,
      zoom: 6,
      localIdeographFontFamily: 'sans-serif',
    })
    if (!map) {
      // No WebGL / unsupported device → degrade to the textual fallback.
      window.setTimeout(failMap, 0)
      return
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    // A worker/style failure can be silent (e.g. the worker asset 404s without
    // ever raising a map 'error'), leaving a permanent spinner. If the style
    // hasn't loaded within the grace period, degrade to the fallback stack.
    loadWatchdogRef.current = window.setTimeout(failMap, 12000)

    // Click-to-pick (mirrors the supplier's LocationMapPicker): sets the
    // traveller's pickup coordinates, drops the pin and zooms to street level.
    const onClick = (e: maplibregl.MapMouseEvent): void => {
      // A mouseup right after dropping the draggable pin fires a ghost click —
      // skip it so the camera doesn't fly off right after the drop.
      if (dragJustEndedRef.current) {
        dragJustEndedRef.current = false
        return
      }
      const { lat, lng } = e.lngLat
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
    const onDblclick = (e: maplibregl.MapMouseEvent): void => {
      e.preventDefault()
      onDoubleClickPointRef.current?.(e.lngLat.lat, e.lngLat.lng)
    }
    map.on('dblclick', onDblclick)

    map.on('load', () => {
      // Ignore late events from a stale (unmounted) instance — StrictMode
      // remounts effects, and a replaced map's 'load' must not mark the live
      // map ready before its own style is loaded.
      if (!mapRef.current || mapRef.current !== map) return
      // Style loaded — a success beats any pre-load error, so disarm the
      // failover timer and the load watchdog before drawing overlays.
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

      // Supplier pins — the overlay that was missing and left location-only
      // tours as "bare land". Pulsating glow marks pickup/meeting points.
      for (const p of tourPoints) {
        const marker = new maplibregl.Marker({ element: pulsingPinElement(TOUR_PIN_COLOR), anchor: 'bottom' })
        marker.setLngLat([p.lng, p.lat])
        if (p.label) {
          marker.getElement().addEventListener('click', () => {
            onPinClickRef.current?.(p.label || '')
          })
          marker.setPopup(new maplibregl.Popup({ offset: 18 }).setText(p.label))
        }
        tourPinsRef.current.push(marker.addTo(map))
      }

      const camera = cameraFromGeoData({ zones, rings: exclusions, points: tourPoints, userPoint })
      if (camera.bounds) {
        map.fitBounds(camera.bounds, { padding: camera.padding, maxZoom: camera.maxZoom, duration: 0 })
      } else if (camera.center != null && camera.zoom != null) {
        map.jumpTo({ center: camera.center, zoom: camera.zoom })
      }

      mapReadyRef.current = true
      setMapReady(true)

      // Tiles-painted watchdog: 'load' can fire with only the style's
      // background rendered (e.g. tile requests failing silently on a blocked
      // CDN) — if the map never paints within the grace period, degrade to
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

    // A failing style/tile CDN must not leave a permanent blank box in the
    // checkout — degrade to the fallback after a grace period. Errors on a
    // map that HAS painted are transient (single raster tile 404s self-heal);
    // errors before the first paint mean the basemap is dead.
    map.on('error', () => {
      if (!mapRef.current || mapRef.current !== map) return
      if (paintedRef.current) return
      if (mapFailTimerRef.current == null) {
        mapFailTimerRef.current = window.setTimeout(failMap, 5000)
      }
    })

    mapRef.current = map
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
    // Overlays are live-updated by the effect below; the map itself is built
    // once per (provider, fallback, data-availability) state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFailed, mapDisabled, hasMapData, tileProvider])

  // Live-update overlays as the traveller picks/drags a location.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !hasMapData) return
    const setSource = (id: string, rings: [number, number][][]): void => {
      try {
        const source = map.getSource(id)
        if (source && 'setData' in source) {
          (source as maplibregl.GeoJSONSource).setData(ringsToFeatureCollection(rings))
        }
      } catch {
        // Source not present yet — the build effect adds it on 'load'.
      }
    }
    if (zones.length > 0) setSource('pz-zones', zones)
    if (exclusions.length > 0) setSource('pz-excl', exclusions)

    // Refresh the extra (landmark) pins — non-interactive amber dots.
    extraPinsRef.current.forEach((m) => m.remove())
    extraPinsRef.current = []
    for (const p of extraPoints || []) {
      const el = document.createElement('div')
      el.style.cssText = 'filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.25)); cursor: default;'
      el.innerHTML = `<svg width="20" height="26" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill="#d97706"/><circle cx="13" cy="13" r="5" fill="#fff"/></svg>`
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      marker.setLngLat([p.lng, p.lat])
      if (p.label) {
        marker.setPopup(new maplibregl.Popup({ offset: 18 }).setText(p.label))
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
      const marker = new maplibregl.Marker({ element: pulsingPinElement('#2563eb', 'grab'), anchor: 'bottom', draggable: true })
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat()
        onUserPointChangeRef.current?.(lat, lng)
        dragJustEndedRef.current = true
      })
      userPinRef.current = marker.setLngLat([userPoint.lng, userPoint.lat]).addTo(map)
    }
  }, [zones, exclusions, userPoint, mapReady, hasMapData, extraPoints])

  // Legacy name/address-only config: OSM embed, located by the address text.
  const mapView = useMemo(() => {
    if (hasMapData || points.length === 0 || containerWidth <= 0) return null
    const H = 200
    const W = containerWidth
    const lats = points.map((m) => m.lat)
    const lngs = points.map((m) => m.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const cLat = (minLat + maxLat) / 2
    const cLng = (minLng + maxLng) / 2
    // Degrees-per-pixel must be equal in both axes so the bbox matches the
    // container aspect; use the larger of the two so every marker fits.
    const wDeg = Math.max(maxLng - minLng, 0.001) + 0.01
    const hDeg = Math.max(maxLat - minLat, 0.001) + 0.01
    const dpp = Math.max(wDeg / W, hDeg / H)
    const bbW = dpp * W
    const bbH = dpp * H
    const bbMinLng = cLng - bbW / 2
    const bbMaxLng = cLng + bbW / 2
    const bbMinLat = cLat - bbH / 2
    const bbMaxLat = cLat + bbH / 2
    const bbox = `${bbMinLng}%2C${bbMinLat}%2C${bbMaxLng}%2C${bbMaxLat}`
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`
    const pins = points.map((m) => {
      const isUser = userPointKey === `${m.lat.toFixed(6)},${m.lng.toFixed(6)}`
      return { lat: m.lat, lng: m.lng, x: ((m.lng - bbMinLng) / bbW) * 100, y: (1 - (m.lat - bbMinLat) / bbH) * 100, isUser }
    })
    return { embedUrl, pins }
  }, [hasMapData, points, containerWidth, userPointKey])

  const mapPoint = userPoint ?? tourPoints[0] ?? null
  const mapsLink = mapPoint
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mapPoint.lat},${mapPoint.lng}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery || tour.meetingPointAddress || tour.meetingPoint || '')}`

  useEffect(() => {
    if (hasMapData) return
    const el = embedRef.current
    if (!el) return
    const update = (): void => setContainerWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasMapData])

  if (!hasMapData && !fallbackQuery) return null

  return (
    <div className="p-3">
      <div className={`relative ${mapHeight} w-full touch-none overflow-hidden rounded-xl border border-slate-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
        {hasMapData && !mapFailed && !mapDisabled ? (
          tileProvider == null ? (
            <div className="absolute inset-0 z-0 flex items-center justify-center gap-2 bg-slate-50">
              <RefreshCw size={14} className="animate-spin text-slate-400" />
              <span className="text-xs font-medium text-slate-400">Loading map…</span>
            </div>
          ) : (
          <>
            <div ref={containerRef} className="absolute inset-0 z-0" />
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
          </>
          )
        ) : mapView && !osmFailed ? (
          <>
            <iframe
              title="Location map"
              src={mapView.embedUrl}
              className="absolute inset-0 h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onError={() => setOsmFailed(true)}
            />
            {mapView.pins.map((p, i) => (
              <span
                key={i}
                className="absolute z-10"
                style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -100%)' }}
              >
                <MapPin className="size-6" color={p.isUser ? USER_PIN_COLOR : TOUR_PIN_COLOR} fill="currentColor" />
              </span>
            ))}
          </>
        ) : (
          <div ref={embedRef} className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 px-4 text-center">
            <MapPin className="size-5 shrink-0 text-slate-300" />
            <p className="text-xs leading-relaxed text-slate-500">
              {tour.meetingPointAddress || tour.meetingPoint || fallbackQuery || 'Meeting location will be confirmed after booking.'}
            </p>
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              Open in Google Maps
            </a>
            {mapFailed && !mapDisabled && (
              <button
                type="button"
                onClick={() => {
                  setMapFailed(false)
                  setMapReady(false)
                }}
                className="mt-1 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              >
                <RefreshCw size={12} />
                Retry map
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}