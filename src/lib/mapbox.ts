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

// Configure the token GLOBALLY (mapboxgl.setAccessToken) rather than passing
// `accessToken` per-Map-instance. With mapbox-gl 3.28.x the per-instance
// option silently leaves the style never fully loading (styleLoaded stays
// false) and no vector tiles are ever requested — the map paints only its flat
// background, a blank box with the pins floating on it. The global token makes
// the style load and tiles stream in reliably.
const mapboxToken = getMapboxToken()
if (mapboxToken) mapboxgl.setAccessToken(mapboxToken)

/**
 * Vector style used by the booking-page pickup map.
 *
 * Deliberately NOT the "Standard" style (`mapbox://styles/mapbox/standard`):
 * mapbox-gl 3.28.x never issues any vector-tile requests for that style (the
 * style JSON, sprites and fonts all load, but the composite basemap source is
 * never fetched), so the map renders only its flat background — a blank box
 * with the pins floating on it. streets-v12 fetches and paints its tiles
 * reliably, so the Mapbox fallback layer actually shows a basemap.
 */
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12'
