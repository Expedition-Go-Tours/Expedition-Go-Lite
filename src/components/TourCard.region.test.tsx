import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'

vi.mock('../context/WishlistContext', () => ({
  useWishlist: () => ({
    isInWishlist: () => false,
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
  }),
  toWishlistItem: () => ({ id: 'wishlist-test' }),
}))
vi.mock('../context/SellOutContext', () => ({
  useSellOutContext: () => ({ isLikelyToSellOut: () => false }),
}))
vi.mock('../hooks/useExternalReviews', () => ({
  useCombinedTourStats: () => ({ rating: 5, reviewCount: 12, externalCount: 0 }),
}))
vi.mock('./FormattedPrice', () => ({
  default: ({ value }: { value?: string }) => <span data-testid="price">{value}</span>,
}))
/**
 * TourCard also records tour views for Continue Planning, and that hook throws
 * without its provider. Stubbed rather than wrapped so these tests stay about
 * the region and don't break when the view-capture wiring changes; the hook has
 * its own coverage.
 */
vi.mock('../hooks/useTourViewCapture', () => ({
  useTourViewCapture: () => vi.fn(),
}))

// Real provider, so the region actually reaches the same storage the homepage
// reads. Asserting against a mock would only prove the mock was called.
import { LocationSearchProvider } from '../context/LocationSearchContext'
import { readRegionFromHash } from '../lib/tourRegionHandoff'
import TourCard from './TourCard'

/**
 * Clicking a tour leaves this origin for Travio Ghana, and the region it was
 * clicked from has to come back to scope the homepage — the same thing a
 * search-suggestion click already did.
 *
 * Two channels, both required:
 *  - `setLocation`, which persists only for visitors who accepted functional
 *    cookies and is otherwise an in-memory map that dies on unload;
 *  - this page's URL fragment, which survives the round trip for everyone.
 *
 * Order matters. The region must be recorded *before* the page navigates —
 * `location.assign` tears the page down, so anything written after it is lost.
 */

/** The live jsdom location, captured before any test stubs it. */
const realLocation = window.location

const REGION = 'Central Region'

const baseProps: ComponentProps<typeof TourCard> = {
  title: 'Cape Coast Castle Walking Tour',
  slug: 'cape-coast-castle-walking-tour',
  category: 'Day Tour',
  duration: '2 hours',
  features: 'Guide',
  price: '$45',
  rating: '4.8',
  reviews: 42,
  location: 'Cape Coast, Ghana',
  region: REGION,
  image: 'https://example.com/photo.jpg',
}

function renderCard(extra: Partial<ComponentProps<typeof TourCard>> = {}) {
  return render(
    <LocationSearchProvider>
      <TourCard {...baseProps} {...extra} />
    </LocationSearchProvider>,
  )
}

/**
 * jsdom refuses real navigation and its `location` methods can't be redefined
 * in place, so the whole `window.location` is replaced — but `hash`/`href` stay
 * live getters over the real object. Snapshotting them into plain values would
 * freeze them at stub time and hide exactly what these tests assert.
 */
function stubAssign(onAssign?: () => void) {
  const assign = vi.fn(() => onAssign?.())
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      get hash() { return realLocation.hash },
      set hash(v: string) { realLocation.hash = v },
      get href() { return realLocation.href },
      set href(v: string) { realLocation.href = v },
      get pathname() { return realLocation.pathname },
      set pathname(v: string) { realLocation.pathname = v },
      get search() { return realLocation.search },
      set search(v: string) { realLocation.search = v },
      assign,
      origin: realLocation.origin,
      host: realLocation.host,
      hostname: realLocation.hostname,
      protocol: realLocation.protocol,
      toString: () => realLocation.toString(),
    },
  })
  vi.spyOn(window, 'open').mockImplementation(() => null)
  return { assign }
}

describe('TourCard remembers the region it navigated from', () => {

  beforeAll(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  beforeEach(() => {
    // Start on a listing so the tests can prove the click does not rewrite the
    // path — going back must return to the listing, not the homepage.
    window.history.replaceState(null, '', '/tours?place=Cape%20Coast')
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: realLocation,
    })
    cleanup()
    vi.restoreAllMocks()
  })

  it('stamps the region into the URL on a same-tab click', async () => {
    const { assign } = stubAssign()

    const { container } = renderCard({ openInNewTab: false })
    fireEvent.click(container.querySelector('.tour-card')!)
    await waitFor(() => expect(assign).toHaveBeenCalled())

    expect(readRegionFromHash(window.location.hash)).toBe(REGION)
  })

  it('stamps it on a plain title click too (that path skips openTour)', () => {
    const { container } = renderCard({ openInNewTab: false })
    fireEvent.click(container.querySelector('.tour-card-title a')!)

    expect(readRegionFromHash(window.location.hash)).toBe(REGION)
  })

  it('keeps the path and query so back-navigation returns to the listing', () => {
    const { container } = renderCard({ openInNewTab: false })
    fireEvent.click(container.querySelector('.tour-card')!)

    expect(window.location.pathname).toBe('/tours')
    expect(window.location.search).toBe('?place=Cape%20Coast')
  })

  it('does not stamp for a new-tab click — this page stays alive', async () => {
    stubAssign()

    const { container } = renderCard()
    fireEvent.click(container.querySelector('.tour-card')!)
    await waitFor(() => expect(window.open).toHaveBeenCalled())

    // Nothing to carry across: the in-memory store this page holds is exactly
    // what the visitor comes back to.
    expect(window.location.hash).toBe('')
  })

  it('records the region before navigating, not after', async () => {
    // `location.assign` unloads the page — a region written in its .then()
    // would never render. Assert the stamp exists at the moment of navigation.
    let hashAtNavigation: string | null = null
    const { assign } = stubAssign(() => {
      hashAtNavigation = window.location.hash
    })

    const { container } = renderCard({ openInNewTab: false })
    fireEvent.click(container.querySelector('.tour-card')!)
    await waitFor(() => expect(assign).toHaveBeenCalled())

    expect(readRegionFromHash(hashAtNavigation ?? '')).toBe(REGION)
  })

  it('skips the stamp when the tour has no region', () => {
    const { container } = renderCard({ openInNewTab: false, region: null })
    fireEvent.click(container.querySelector('.tour-card')!)

    expect(window.location.hash).toBe('')
  })

  it('skips a blank region rather than writing an empty param', () => {
    const { container } = renderCard({ openInNewTab: false, region: '   ' })
    fireEvent.click(container.querySelector('.tour-card')!)

    expect(window.location.hash).toBe('')
  })

  it('is a no-op rather than a crash for a legacy card with no region prop', () => {
    const { container } = renderCard({ openInNewTab: false, region: undefined })
    fireEvent.click(container.querySelector('.tour-card')!)

    expect(window.location.hash).toBe('')
  })
})