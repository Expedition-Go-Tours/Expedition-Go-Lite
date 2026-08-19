import * as mapboxgl from 'mapbox-gl/esm'
import mapboxWorkerUrl from 'mapbox-gl/dist/esm/worker.js?url'

// mapbox-gl's ESM build loads its render worker from `new URL('worker.js',
// import.meta.url)` when no worker URL is set — a pattern bundlers cannot
// statically emit. Importing the worker with Vite's `?url` suffix produces a
// real, bundled URL in dev and build alike; pinning it here (before any map is
// created) makes both environments load the same worker chunk.
mapboxgl.setWorkerUrl(mapboxWorkerUrl)

/** The Maps access token — VITE_MAPBOX_ACCESS_TOKEN from .env. */
export function getMapboxToken(): string {
  return (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined)?.trim() || ''
}

/** Vector style used by the booking-page pickup map. */
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/standard'
