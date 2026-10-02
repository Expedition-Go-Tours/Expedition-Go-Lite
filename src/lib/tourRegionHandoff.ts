/**
 * Carrying a clicked tour's region across the cross-origin trip to Travio
 * Ghana.
 *
 * Clicking a tour leaves this origin, so anything we want remembered about
 * that click has to survive the unload. `LocationSearchContext` handles that
 * with consent-gated storage — but `hasConsent('functional')` is false until
 * the visitor accepts, and stays false forever for anyone who rejects the
 * banner. In those cases setLocation only writes an in-memory map, which is
 * gone by the time they come back.
 *
 * So the region is also stamped into this page's URL fragment before leaving.
 * A fragment is never sent to a server, which keeps it out of request logs,
 * analytics (page views are tracked as pathname+search) and the prerender
 * cache — and it survives a same-tab back/forward regardless of storage or
 * consent. lib/ssoHandoff uses the same part of the URL for the inbound
 * direction; Expedition never receives an #sso ticket, so the two can't
 * collide, but appending rather than overwriting keeps that true if that
 * ever changes.
 */

/** Query key used inside the fragment, e.g. `#sso=…&region=Central+Region`. */
const REGION_KEY = 'region'

/**
 * Read `region` from a fragment string, without the leading `#`.
 * Returns null when absent or blank.
 */
export function readRegionFromHash(hash: string): string | null {
  if (!hash) return null
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  for (const part of raw.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    const key = eq === -1 ? part : part.slice(0, eq)
    if (key !== REGION_KEY) continue
    const value = eq === -1 ? '' : part.slice(eq + 1)
    const decoded = safeDecode(value).trim()
    return decoded || null
  }
  return null
}

/** Rebuild a fragment string without the `region` key, preserving the rest. */
function stripRegionFromHash(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const kept = raw
    .split('&')
    .filter((part) => part && part.split('=')[0] !== REGION_KEY)
  return kept.length > 0 ? `#${kept.join('&')}` : ''
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    // Malformed percent-encoding (a hand-edited URL) — use it verbatim rather
    // than throwing during a click.
    return value
  }
}

/**
 * Stamp `region` onto the CURRENT page's URL so a back-navigation returns to
 * this page carrying it. Mutates history in place; it does not navigate, so
 * React Router's location stays untouched.
 *
 * Same-tab navigation only: opening a new tab leaves this page alive, so its
 * in-memory storage — and this URL — are still there when the visitor returns.
 */
export function stampRegionOnCurrentUrl(region: string | null | undefined): void {
  if (!region || typeof window === 'undefined' || !window.history?.replaceState) return
  try {
    const url = new URL(window.location.href)
    const base = stripRegionFromHash(url.hash)
    const encoded = encodeURIComponent(region.trim())
    if (!encoded) return
    // `base` already carries its own leading '#', or is empty. Appending '#'
// unconditionally would yield '#sso=x#region=y' and break both parsers, so the
// separator is chosen from whether anything survived the strip.
url.hash = base ? `${base}&${REGION_KEY}=${encoded}` : `#${REGION_KEY}=${encoded}`
    window.history.replaceState(window.history.state, '', url.toString())
  } catch {
    // A malformed href (or a locked-down history API) must never break a
    // click — the consent-gated storage write still applies.
  }
}

/**
 * Strip the region from the fragment once the app has read it.
 *
 * The value itself is applied by LocationSearchProvider's initial state, not
 * here — seeding it there means the first render is already scoped, instead of
 * painting the global homepage and fetching it before an effect corrects it.
 * This only cleans the URL up so nothing copied from the address bar carries a
 * one-shot parameter.
 *
 * Reads `window.location` directly rather than React Router's location: a
 * manual replaceState doesn't push a router update, so the router may still be
 * showing the pre-stamp URL.
 *
 * @returns the region that was stripped, or null if there was none.
 */
export function consumeRegionFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const region = readRegionFromHash(window.location.hash)
  if (!region) return null
  try {
    const url = new URL(window.location.href)
    url.hash = stripRegionFromHash(url.hash)
    window.history.replaceState(window.history.state, '', url.toString())
  } catch {
    // A malformed href or a locked-down history API only costs a lingering
    // fragment — the region itself was already read by the provider.
  }
  return region
}