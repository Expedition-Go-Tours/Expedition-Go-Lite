import { useEffect, useRef, useState } from 'react'
import { Car, ExternalLink, Footprints, Loader2, Route } from 'lucide-react'
import {
  appleMapsDirectionsUrl,
  fetchGeoapifyRoute,
  formatRouteDistance,
  formatRouteDuration,
  googleMapsDirectionsUrl,
  type GeoapifyRoute,
  type RouteMode,
} from '@/lib/geoapifyRouting'

interface DirectionsDestination {
  lat: number
  lng: number
  label: string
}

interface DirectionsPanelProps {
  /** The location the traveller wants directions to (null = render nothing). */
  destination: DirectionsDestination | null
  /** Origin used when device geolocation is unavailable or denied. */
  fallbackOrigin?: DirectionsDestination | null
  /** Fires with the drawn route so the parent map can render it (null on
      clear/remount). Mount with a changing `key` per destination to reset. */
  onRouteChange?: (route: GeoapifyRoute | null) => void
  /** Embed without the bordered white strip (for use inside a summary card). */
  inline?: boolean
}

/** Travel modes the Geoapify route supports (drive/walk). */
const ROUTE_MODES: { id: RouteMode; label: string; icon: typeof Car }[] = [
  { id: 'drive', label: 'Drive', icon: Car },
  { id: 'walk', label: 'Walk', icon: Footprints },
]

/**
 * "Get directions" control for a chosen location. Resolves the traveller's
 * device location as the origin (falling back to `fallbackOrigin` when
 * geolocation is unavailable/denied), fetches a Geoapify route (drive/walk)
 * and hands it to the parent via `onRouteChange` so it can be drawn on the
 * map. Also offers Google/Apple Maps turn-by-turn deep-links. Mount with a
 * changing `key` per destination so the drawn route resets on selection change.
 */
export default function DirectionsPanel({ destination, fallbackOrigin = null, onRouteChange, inline = false }: DirectionsPanelProps) {
  const [origin, setOrigin] = useState<DirectionsDestination | null>(null)
  const [originStatus, setOriginStatus] = useState<'idle' | 'locating' | 'located' | 'error'>('idle')
  const [routeMode, setRouteMode] = useState<RouteMode>('drive')
  const [drawnRoute, setDrawnRoute] = useState<GeoapifyRoute | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState(false)
  const [directionsOpen, setDirectionsOpen] = useState(false)
  /** Bumped on clear/unmount — a fetch resolving afterwards is discarded. */
  const requestIdRef = useRef(0)
  const onRouteChangeRef = useRef(onRouteChange)

  useEffect(() => {
    onRouteChangeRef.current = onRouteChange
  }, [onRouteChange])

  useEffect(() => {
    return () => {
      requestIdRef.current += 1
      onRouteChangeRef.current?.(null)
    }
  }, [])

  const locateOrigin = (): Promise<DirectionsDestination | null> => {
    return new Promise((resolve) => {
      const resolveFallback = (): DirectionsDestination | null => {
        if (fallbackOrigin) {
          setOrigin(fallbackOrigin)
          setOriginStatus('located')
          return fallbackOrigin
        }
        setOriginStatus('error')
        return null
      }
      const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined
      if (!geo || typeof geo.getCurrentPosition !== 'function') {
        resolve(resolveFallback())
        return
      }
      setOriginStatus('locating')
      geo.getCurrentPosition(
        (pos) => {
          const o = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your current location' }
          setOrigin(o)
          setOriginStatus('located')
          resolve(o)
        },
        () => resolve(resolveFallback()),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      )
    })
  }

  const fetchDirections = async (mode: RouteMode = routeMode): Promise<void> => {
    if (!destination) return
    let currentOrigin = origin
    if (!currentOrigin) {
      const located = await locateOrigin()
      if (!located) return
      currentOrigin = located
    }
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setRouteLoading(true)
    setRouteError(false)
    setDrawnRoute(null)
    const result = await fetchGeoapifyRoute(
      { lat: currentOrigin.lat, lng: currentOrigin.lng },
      { lat: destination.lat, lng: destination.lng },
      mode,
    )
    // The panel was cleared or remounted (new destination) while the route was
    // in flight — discard the stale result.
    if (requestId !== requestIdRef.current) return
    setRouteLoading(false)
    if (result) {
      setDrawnRoute(result)
      onRouteChangeRef.current?.(result)
    } else {
      setRouteError(true)
    }
    setDirectionsOpen(true)
  }

  const changeRouteMode = (mode: RouteMode): void => {
    setRouteMode(mode)
    if (drawnRoute || routeError) {
      void fetchDirections(mode)
    }
  }

  const clearDirections = (): void => {
    requestIdRef.current += 1
    setDrawnRoute(null)
    setRouteError(false)
    setRouteLoading(false)
    setDirectionsOpen(false)
    onRouteChangeRef.current?.(null)
  }

  if (!destination) return null

  return (
    <div className={inline ? 'space-y-2' : 'border-t border-slate-100 bg-white px-4 py-2.5'}>
      {!directionsOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchDirections()}
            disabled={routeLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#179237]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#179237] shadow-sm transition-colors hover:bg-emerald-50"
          >
            {routeLoading ? <Loader2 size={12} className="animate-spin" /> : <Route size={12} />}
            Get directions
          </button>
          <span className="text-xs text-slate-400">
            {originStatus === 'locating' && 'Locating you…'}
            {originStatus === 'error' && "Couldn't get your location"}
            {originStatus === 'located' && origin && `From: ${origin.label}`}
          </span>
          <span className="text-slate-300">·</span>
          <a
            href={googleMapsDirectionsUrl(origin, destination, routeMode)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 underline underline-offset-2 transition-colors hover:text-[#179237]"
          >
            Open in Google Maps <ExternalLink size={11} />
          </a>
          <a
            href={appleMapsDirectionsUrl(origin, destination)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 underline underline-offset-2 transition-colors hover:text-[#179237]"
          >
            Apple Maps <ExternalLink size={11} />
          </a>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {drawnRoute ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Route size={12} className="text-[#179237]" />
                ≈ {formatRouteDuration(drawnRoute.durationSec)} · {formatRouteDistance(drawnRoute.distanceM)}
              </span>
            ) : routeLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Loader2 size={12} className="animate-spin text-[#179237]" />
                Getting directions…
              </span>
            ) : null}
            {routeError && (
              <span className="text-xs font-medium text-rose-600">Couldn&apos;t calculate directions.</span>
            )}
            {origin && <span className="text-xs text-slate-500">From: {origin.label}</span>}
            <div className="flex items-center gap-1" role="group" aria-label="Travel mode">
              {ROUTE_MODES.map((m) => {
                const active = m.id === routeMode
                const MIcon = m.icon
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => changeRouteMode(m.id)}
                    aria-pressed={active}
                    title={`${m.label} directions`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? 'border-[#179237] bg-[#179237] text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-[#179237]/50 hover:text-[#179237]'
                    }`}
                  >
                    <MIcon size={11} />
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                )
              })}
            </div>
            <span className="text-slate-300">·</span>
            <a
              href={googleMapsDirectionsUrl(origin, destination, routeMode)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 underline underline-offset-2 transition-colors hover:text-[#179237]"
            >
              Google Maps <ExternalLink size={11} />
            </a>
            <a
              href={appleMapsDirectionsUrl(origin, destination)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 underline underline-offset-2 transition-colors hover:text-[#179237]"
            >
              Apple Maps <ExternalLink size={11} />
            </a>
            <button
              type="button"
              onClick={clearDirections}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 underline underline-offset-2 transition-colors hover:text-slate-600"
            >
              Close
            </button>
          </div>
          {drawnRoute && drawnRoute.steps.length > 0 && (
            <ol className="scrollbar-hide mt-2 max-h-32 space-y-1.5 overflow-y-auto pr-1 text-xs text-slate-600">
              {drawnRoute.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-[#179237]">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: s.instruction }} />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
