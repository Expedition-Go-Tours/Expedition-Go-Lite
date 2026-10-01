/**
 * Canonical tour URLs.
 *
 * Shape: `/tour/{id}/{slug}` (and `/{id}/{slug}/booking`). The **id is the
 * identity** — it never changes, so retitling a tour (which regenerates its
 * slug) cannot break a shared, bookmarked or indexed link. The slug is
 * decorative: it makes the URL readable, and the API resolves the first
 * segment as either an id or a slug, so the single-segment form still works.
 *
 * When the id is unknown (static/mock card content, legacy search entries)
 * the helpers fall back to the slug-only form.
 *
 * A tour's DETAIL page lives on Travio Ghana, not here — see `tourHref`.
 * This app still needs the path form for its own router: the canonical tag,
 * the post-review return path, and booking.
 */

/**
 * Host serving tour detail pages.
 *
 * Expedition is the browse layer; the detail page — and with it the booking
 * funnel — is Travio Ghana's. Overridable so preview deployments can point at
 * a staging host instead of production.
 */
export const TOUR_SITE = (import.meta.env.VITE_TOUR_DETAIL_SITE || 'https://www.travioghana.com').replace(
  /\/+$/,
  '',
)

const seg = (value: string) => encodeURIComponent(value)

/** This app's own route for a tour. Internal only — never put it in an href. */
export function tourPath(id?: string | null, slug?: string | null): string {
  if (id && slug) return `/tour/${seg(id)}/${seg(slug)}`
  return `/tour/${seg(id || slug || '')}`
}

/**
 * Absolute cross-origin URL for a tour's detail page.
 *
 * This is the only correct value for an href pointing at a tour. Three
 * properties make the absolute form necessary rather than convenient:
 *
 *  - React Router does not resolve an absolute URL passed to `<Link to>` or
 *    `navigate()`; it parses it as a path, producing `/https:/…`.
 *  - A client-side route change never leaves this origin, so a path-only link
 *    would keep the user on Expedition and defeat the handoff entirely.
 *  - Copy-link / middle-click then yield the destination the user will
 *    actually land on, not an Expedition URL that has to be resolved later.
 */
export function tourHref(id?: string | null, slug?: string | null): string {
  return `${TOUR_SITE}${tourPath(id, slug)}`
}

/**
 * Booking stays on this domain: the checkout, payment and account routes are
 * Expedition's own, and the detail page hands off before this is reached.
 */
export function bookingPath(id?: string | null, slug?: string | null): string {
  const idSegment = id || slug || ''
  const slugSegment = slug || idSegment
  return `/${seg(idSegment)}/${seg(slugSegment)}/booking`
}
