export const config = { runtime: 'nodejs' }

const BOT_AGENTS = [
  'googlebot', 'google-inspectiontool', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'sogou', 'facebot', 'facebookexternalhit', 'twitterbot',
  'linkedinbot', 'slackbot', 'whatsapp', 'telegrambot', 'applebot',
  'discordbot', 'pinterest', 'redditbot', 'quora', 'viber', 'skype',
  'ia_archiver', 'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot',
  'rogerbot', 'exabot', 'zoominfobot',
]

const SKIP_PATHS = [
  '/dashboard', '/booking', '/auth', '/login', '/api/',
  '/payment-methods', '/supplier/register', '/supplier/list-experience',
]

const STATIC_EXTS = [
  '.xml', '.txt', '.json', '.png', '.jpg', '.jpeg', '.svg', '.gif',
  '.webp', '.ico', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot',
]

// Generated from the same React components and data visitors see.
const PUBLIC_HTML_PAGES = new Set([
  '/careers', '/contact-us', '/cookies-policy', '/privacy-policy', '/supplier-terms', '/reviews',
])

function isBot(ua: string): boolean {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return BOT_AGENTS.some((b) => lower.includes(b))
}

function shouldSkip(pathname: string): boolean {
  return SKIP_PATHS.some((p) => pathname.startsWith(p))
}

function isStatic(pathname: string): boolean {
  return STATIC_EXTS.some((ext) => pathname.endsWith(ext))
}

/* --------------------------------------------------------------------------
 * SerpApi Google Maps search (inlined — keep this file self-contained).
 *
 * This project has `"type": "module"` in package.json and Vercel executes
 * Routing Middleware as native ESM; an extensionless relative import of a
 * helper module crashed every invocation with MIDDLEWARE_INVOCATION_FAILED in
 * production on the storefront that first shipped this feature. The SerpApi
 * client is inlined here for that reason — do not extract it into a separate
 * module that this file imports.
 *
 * SerpApi blocks browser calls (it sends no CORS headers) and the API key must
 * stay server-side, so this runs inside the Vercel middleware and the Vite
 * dev-server route (`vite.config.ts` imports the functions below). The browser
 * only ever talks to the storefront's own `/api/maps-search` route.
 *
 * SerpApi response notes (https://serpapi.com/google-maps-api):
 *  - a list query returns `local_results[]` with `gps_coordinates`, `address`,
 *    `country` and `place_id` per place;
 *  - a query that resolves to one specific place (e.g. a business name) comes
 *    back as a single `place_results` object instead — both shapes are read;
 *  - an empty Google Maps result set is still HTTP 200, with
 *    `search_information.local_results_state: "Fully empty"`;
 *  - errors surface as `search_metadata.status: "Error"` + a top-level
 *    `error` string, or as 401 (bad key) / 429 (quota or throughput).
 * ------------------------------------------------------------------------ */

export interface GhanaMapPlace {
  title: string
  address: string
  lat: number
  lng: number
  placeId: string | null
}

export type MapsSearchFailure = 'not_configured' | 'quota' | 'upstream'

export type MapsSearchResult =
  | { ok: true; results: GhanaMapPlace[] }
  | { ok: false; reason: MapsSearchFailure }

export const SERPAPI_SEARCH_ENDPOINT = 'https://serpapi.com/search.json'

/** Fallback search origin (Accra) when a tour has no coordinates of its own. */
export const DEFAULT_GHANA_ORIGIN = { lat: 5.6037, lng: -0.187 } as const
const MAPS_ZOOM = 12
const MAPS_TIMEOUT_MS = 8000
const MAX_RESULTS = 5

interface SerpApiLocalResult {
  title?: string
  address?: string
  country?: string
  gps_coordinates?: { latitude?: number; longitude?: number }
  place_id?: string
}

interface SerpApiResponse {
  error?: string
  local_results?: SerpApiLocalResult[]
  /** A query that resolves to one specific place returns this instead. */
  place_results?: SerpApiLocalResult
  search_information?: { local_results_state?: string }
  search_metadata?: { status?: string }
}

/** Ghana-only filter: keep Ghana-labelled results and unlabelled ones. */
export function isGhanaResult(result: SerpApiLocalResult): boolean {
  const country = (result.country || '').trim().toLowerCase()
  return country.length === 0 || country === 'ghana'
}

/**
 * Normalizes SerpApi results into the picker's place shape — reading the
 * `local_results` list, or the single `place_results` object Google returns
 * when the query names one specific place.
 */
export function normalizeResults(body: SerpApiResponse | null | undefined): GhanaMapPlace[] {
  const local = Array.isArray(body?.local_results) ? body.local_results : []
  const list = local.length > 0 ? local : body?.place_results ? [body.place_results] : local
  const places: GhanaMapPlace[] = []
  for (const result of list) {
    const lat = result?.gps_coordinates?.latitude
    const lng = result?.gps_coordinates?.longitude
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (!isGhanaResult(result)) continue
    const title = (result.title || result.address || '').trim()
    if (!title) continue
    places.push({
      title,
      address: (result.address || '').trim(),
      lat,
      lng,
      placeId: typeof result.place_id === 'string' && result.place_id ? result.place_id : null,
    })
    if (places.length >= MAX_RESULTS) break
  }
  return places
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MAPS_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Searches Google Maps (via SerpApi) for `query`, biased to `origin` and
 * hard-filtered to Ghana. Returns a discriminated result so callers can map
 * "not configured" / "quota exhausted" to friendly UI states without ever
 * leaking the API key or raw upstream errors.
 */
export async function searchGhanaPlaces(
  query: string,
  origin: { lat: number; lng: number } | null | undefined,
  apiKey: string,
): Promise<MapsSearchResult> {
  if (!apiKey) return { ok: false, reason: 'not_configured' }
  const q = query.trim().slice(0, 120)
  if (q.length < 3) return { ok: true, results: [] }

  const lat = origin && Number.isFinite(origin.lat) ? origin.lat : DEFAULT_GHANA_ORIGIN.lat
  const lng = origin && Number.isFinite(origin.lng) ? origin.lng : DEFAULT_GHANA_ORIGIN.lng
  const params = new URLSearchParams({
    engine: 'google_maps',
    q,
    ll: `@${lat},${lng},${MAPS_ZOOM}z`,
    google_domain: 'google.com.gh',
    hl: 'en',
    gl: 'gh',
    api_key: apiKey,
  })

  let response: Response
  try {
    response = await fetchWithTimeout(`${SERPAPI_SEARCH_ENDPOINT}?${params.toString()}`)
  } catch {
    return { ok: false, reason: 'upstream' }
  }

  if (!response.ok) {
    if (response.status === 429) return { ok: false, reason: 'quota' }
    if (response.status === 401 || response.status === 403) return { ok: false, reason: 'not_configured' }
    return { ok: false, reason: 'upstream' }
  }

  const body = (await response.json().catch(() => null)) as SerpApiResponse | null
  if (!body || body.search_metadata?.status === 'Error') return { ok: false, reason: 'upstream' }
  return { ok: true, results: normalizeResults(body) }
}

/* --------------------------------------------------------------------------
 * `/api/maps-search` route
 * ------------------------------------------------------------------------ */

const MAPS_SEARCH_PATH = '/api/maps-search'
const MAX_QUERY_LENGTH = 120

/**
 * Reads the server-side SerpApi key without referencing a Node `process`
 * global by name — this file is also type-checked against DOM typings (the
 * app project pulls it in via its tests), where `process` is not declared.
 *
 * The key is stored under its VITE_-prefixed deployment name (tooling
 * convention), but this is the SERVER runtime: it never reaches the browser.
 * A Vite build guard (`server/noClientSerpKey.ts`) fails the build if any
 * client code references it or the bare `import.meta.env` object.
 * `SERPAPI_API_KEY` is still accepted as a legacy alias.
 */
function getSerpApiKey(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return env?.VITE_SERP_API_KEY?.trim() || env?.SERPAPI_API_KEY?.trim() || ''
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // SerpApi caches identical searches for one hour (those repeats are
      // free); letting the CDN reuse the response for the same window means
      // repeated searches never even reach the upstream API.
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  })
}

/**
 * `GET /api/maps-search?q=…&lat=…&lng=…` — proxies a Ghana-biased Google
 * Maps place search through SerpApi for the booking pickup picker.
 *
 * SerpApi sends no CORS headers and its key must stay server-side, so this
 * same-origin route is the only place the browser can reach Google Maps
 * search from. Input is validated, the key never leaves the server, and
 * failures map to `{ ok: false, reason }` so the client can fall back to the
 * paste-link / manual-pin options.
 */
export async function handleMapsSearch(request: Request): Promise<Response> {
  if (request.method !== 'GET') return jsonResponse({ ok: false, reason: 'method' }, 405)

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (q.length < 3 || q.length > MAX_QUERY_LENGTH) {
    return jsonResponse({ ok: false, reason: 'invalid' }, 400)
  }

  const latRaw = url.searchParams.get('lat')
  const lngRaw = url.searchParams.get('lng')
  let origin: { lat: number; lng: number } | null = null
  if ((latRaw != null) !== (lngRaw != null)) {
    return jsonResponse({ ok: false, reason: 'invalid' }, 400)
  }
  if (latRaw != null && lngRaw != null) {
    const lat = Number(latRaw)
    const lng = Number(lngRaw)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return jsonResponse({ ok: false, reason: 'invalid' }, 400)
    }
    origin = { lat, lng }
  }

  const result = await searchGhanaPlaces(q, origin, getSerpApiKey())
  return jsonResponse(result)
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url)
  const pathname = url.pathname
  const ua = request.headers.get('user-agent') || ''

  // SerpApi-backed Google Maps search proxy — handled before every rewrite so
  // it can never be SPA-rewritten or served the bot prerender.
  if (pathname === MAPS_SEARCH_PATH) return handleMapsSearch(request)

  // Vercel's Image Optimization endpoint carries every parameter in the query
  // string, so `/_vercel/image` has no file extension. `isStatic()` matches on
  // known extensions, so this clears it, clears the bot prerouter (no dot in
  // the path) and lands on the SPA rewrite at the bottom, which answers with
  // index.html instead of an optimized image. Hand it straight to the platform.
  if (pathname.startsWith('/_vercel/')) return

  // Let static files pass through
  if (isStatic(pathname)) return

  // Bot detection: rewrite to prerender endpoint
  if (request.method === 'GET' && isBot(ua) && !shouldSkip(pathname)) {
    const publicPath = pathname.replace(/\/$/, '')
    if (PUBLIC_HTML_PAGES.has(publicPath)) {
      return new Response(null, {
        status: 200,
        headers: {
          'x-middleware-rewrite': `/__seo${publicPath}.html`,
          'X-Prerender-Bot': 'true',
        },
      })
    }
    // Stories are client-side data the backend cannot read, so the prerenderer
    // can only answer them with a hub that links to none of them (detail pages
    // with 404/noindex). They are rendered to static HTML at build time
    // (scripts/generate-story-pages.cjs) and served straight from the
    // filesystem instead: /stories for the hub, /stories/<slug> for the page.
    // Without this the six story URLs in the sitemap all answered 404 to
    // crawlers while the files sat deployed and reachable by hand.
    if (pathname === '/stories' || pathname === '/stories/') {
      return new Response(null, {
        status: 200,
        headers: {
          'x-middleware-rewrite': '/stories/index.html',
          'X-Prerender-Bot': 'true',
        },
      })
    }
    const storySlug = pathname.match(/^\/stories\/([^/]+)\/?$/)?.[1]
    // Already-suffixed paths (/stories/x.html) must fall through to the
    // prerenderer, which answers them with a real 404 instead of x.html.html.
    // The rewrite itself is not re-entered here, so the platform serves the
    // static file directly.
    if (storySlug && !storySlug.endsWith('.html')) {
      return new Response(null, {
        status: 200,
        headers: {
          'x-middleware-rewrite': `/stories/${encodeURIComponent(storySlug)}.html`,
          'X-Prerender-Bot': 'true',
        },
      })
    }

    const target = `${pathname}${url.search}`
    const prerenderUrl = `https://api.expeditiongotours.com/api/prerender?url=${encodeURIComponent(target)}`
    return new Response(null, {
      status: 200,
      headers: {
        'x-middleware-rewrite': prerenderUrl,
        'X-Prerender-Bot': 'true',
      },
    })
  }

  // SPA routing: rewrite non-file requests to index.html
  if (request.method === 'GET' && !pathname.includes('.')) {
    const indexUrl = new URL('/index.html', request.url)
    return new Response(null, {
      status: 200,
      headers: {
        'x-middleware-rewrite': indexUrl.toString(),
      },
    })
  }
}
