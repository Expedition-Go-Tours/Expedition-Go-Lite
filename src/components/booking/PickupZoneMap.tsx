import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import { MapPin } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  DEFAULT_CENTER,
  TILE_STYLE,
  TOUR_PIN_COLOR,
  USER_PIN_COLOR,
  buildTourPoints,
  cameraFromGeoData,
  createMapLibreMap,
  maplibrePinEl,
  ringsToFeatureCollection,
  toNumber,
  warmMapResources,
  type MapPoint,
  type PickupMapSource,
} from '@/lib/mapUtils'
import type { PickupAreaShape } from '@/lib/pickupZone'

/**
 * The booking page's tour object — the supplier's meeting/pickup config with
 * the drawn geoshapes that PickupMapSource doesn't declare.
 */
interface PickupZoneMapTour {
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
}: {
  tour: PickupZoneMapTour
  userMarker?: { lat: number | null; lng: number | null } | null
  onUserPointChange?: (lat: number, lng: number) => void
}) {
  const [osmFailed, setOsmFailed] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const embedRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const tourPinsRef = useRef<maplibregl.Marker[]>([])
  const userPinRef = useRef<maplibregl.Marker | null>(null)
  const mapReadyRef = useRef(false)
  const mapFailTimerRef = useRef<number | null>(null)
  const onUserPointChangeRef = useRef(onUserPointChange)
  useEffect(() => {
    onUserPointChangeRef.current = onUserPointChange
  }, [onUserPointChange])

  // Supplier's pickup/meeting points (green pins) + the traveller's pin.
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
    if (tour.meetingMode === 'meeting_point') {
      return tour.meetingPointAddress || tour.meetingPoint || ''
    }
    if (tour.meetingMode === 'pickup') {
      const area = (tour.pickupAreas || []).find((a) => a && (a.address || a.name))
      if (area) return area.address || area.name || ''
      const loc = (tour.pickupLocations || []).find((l) => l && (l.address || l.name))
      if (loc) return loc.address || loc.name || ''
      return tour.pickupDescription || ''
    }
    return ''
  }, [tour.meetingMode, tour.meetingPointAddress, tour.meetingPoint, tour.pickupAreas, tour.pickupLocations, tour.pickupDescription])

  // Build the map once: warmed style, zone/exclusion overlays, tour pins and
  // an initial camera that fits the whole service area.
  useEffect(() => {
    if (mapFailed || !hasMapData || !containerRef.current) return
    if (mapRef.current) return
    warmMapResources()
    const container = containerRef.current
    const map = createMapLibreMap(container, {
      style: TILE_STYLE,
      center: DEFAULT_CENTER,
      zoom: 6,
      localIdeographFontFamily: 'sans-serif',
    })
    if (!map) {
      // No WebGL / unsupported device → degrade to the textual fallback.
      window.setTimeout(() => setMapFailed(true), 0)
      return
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      if (!mapRef.current) return

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
      // tours as "bare land".
      for (const p of tourPoints) {
        const marker = new maplibregl.Marker({ element: maplibrePinEl(TOUR_PIN_COLOR), anchor: 'bottom' })
        tourPinsRef.current.push(marker.setLngLat([p.lng, p.lat]).addTo(map))
      }

      const camera = cameraFromGeoData({ zones, rings: exclusions, points: tourPoints, userPoint })
      if (camera.bounds) {
        map.fitBounds(camera.bounds, { padding: camera.padding, maxZoom: camera.maxZoom, duration: 0 })
      } else if (camera.center != null && camera.zoom != null) {
        map.jumpTo({ center: camera.center, zoom: camera.zoom })
      }

      mapReadyRef.current = true
      setMapReady(true)
    })

    // A failing style/tile CDN must not leave a permanent blank box in the
    // checkout — degrade to the OSM/textual fallback after a grace period.
    // Armed on ANY error (pre- or post-load): raster tile failures fire
    // 'error' even after a successful load, so mid-session tile/network
    // outages also reach the fallback instead of a blank map.
    map.on('error', () => {
      if (mapFailTimerRef.current == null) {
        mapFailTimerRef.current = window.setTimeout(() => setMapFailed(true), 8000)
      }
    })

    mapRef.current = map
    return () => {
      if (mapFailTimerRef.current != null) {
        window.clearTimeout(mapFailTimerRef.current)
        mapFailTimerRef.current = null
      }
      tourPinsRef.current.forEach((m) => m.remove())
      tourPinsRef.current = []
      if (userPinRef.current) {
        userPinRef.current.remove()
        userPinRef.current = null
      }
      map.remove()
      mapRef.current = null
      mapReadyRef.current = false
      setMapReady(false)
    }
    // Overlays are live-updated by the effect below; the map itself is built
    // once per (fallback, data-availability) state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFailed, hasMapData])

  // Live-update overlays as the traveller picks/drags a location.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !hasMapData) return
    const setSource = (id: string, rings: [number, number][][]): void => {
      const source = map.getSource(id)
      if (source && 'setData' in source) {
        (source as maplibregl.GeoJSONSource).setData(ringsToFeatureCollection(rings))
      }
    }
    if (zones.length > 0) setSource('pz-zones', zones)
    if (exclusions.length > 0) setSource('pz-excl', exclusions)

    // Refresh the traveller's blue pin (draggable — repositioning updates the
    // live zone verdict, mirroring the GetYourGuide pickup map).
    if (userPinRef.current) {
      userPinRef.current.remove()
      userPinRef.current = null
    }
    if (userPoint) {
      const el = document.createElement('div')
      el.style.cssText = 'filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.3)); cursor: grab;'
      el.innerHTML = `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill="#2563eb"/><circle cx="13" cy="13" r="5" fill="#fff"/></svg>`
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true })
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat()
        onUserPointChangeRef.current?.(lat, lng)
      })
      userPinRef.current = marker.setLngLat([userPoint.lng, userPoint.lat]).addTo(map)
    }
  }, [zones, exclusions, userPoint, mapReady, hasMapData])

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
      <div className="relative h-[220px] w-full overflow-hidden rounded-lg border border-slate-200/40">
        {hasMapData && !mapFailed ? (
          <>
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
          </>
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
          </div>
        )}
      </div>
    </div>
  )
}