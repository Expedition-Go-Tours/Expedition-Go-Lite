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

import TourCard from './TourCard'

/**
 * A tour's detail page lives on Travio Ghana, so every destination a card can
 * produce is absolute and cross-origin.
 *
 * Three consequences these tests pin:
 *  - `window.open` and the crawlable anchor carry the full destination, so
 *    copy-link / middle-click never yield an Expedition URL;
 *  - a same-tab click uses `location.assign` rather than React Router, because
 *    Router resolves an absolute URL as a path (`/https:/…`) and a client-side
 *    route change would not leave this origin anyway;
 *  - the title anchor navigates natively — the handler must not intercept it
 *    and start a second navigation.
 *
 * The host is asserted literally rather than through `TOUR_SITE`: production
 * pointing somewhere other than travioghana.com is exactly what should fail.
 */
const GHANA = 'https://www.travioghana.com'

const baseProps: ComponentProps<typeof TourCard> = {
  title: 'Accra City Tour',
  slug: 'accra-city-tour',
  category: 'Day Tour',
  duration: '8 hours',
  features: 'Guide, Lunch',
  price: '$120',
  rating: '4.8',
  reviews: 42,
  location: 'Accra',
  image: 'https://example.com/photo.jpg',
}

function renderCard(extra: Partial<ComponentProps<typeof TourCard>> = {}) {
  return render(<TourCard {...baseProps} {...extra} />)
}

describe('TourCard navigation', () => {
  const realLocation = window.location
  let assign: ReturnType<typeof vi.fn>

  beforeAll(() => {
    // jsdom's matchMedia lacks addEventListener; TourCard subscribes to a
    // breakpoint for its mobile layout.
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
    assign = vi.fn()
    // jsdom refuses real navigation; nothing else in TourCard reads
    // window.location. Same pattern as Navbar's supplier hand-off test.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...realLocation, assign },
    })
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: realLocation })
    cleanup()
    vi.restoreAllMocks()
  })

  it('opens a new tab by default (homepage, search, related, grid, …)', async () => {
    const { container } = renderCard()
    fireEvent.click(container.querySelector('.tour-card')!)

    // Navigation now waits on a handoff ticket (resolved immediately when
    // signed out), so assert after the microtask settles rather than on the
    // click itself.
    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(`${GHANA}/tour/accra-city-tour`, '_blank', 'noopener'),
    )
    expect(assign).not.toHaveBeenCalled()
  })

  it('sends a same-tab surface straight to Travio Ghana in one step', async () => {
    const { container } = renderCard({ openInNewTab: false })
    fireEvent.click(container.querySelector('.tour-card')!)

    await waitFor(() => expect(assign).toHaveBeenCalledWith(`${GHANA}/tour/accra-city-tour`))
    expect(window.open).not.toHaveBeenCalled()
  })

  it('uses /tour/{id}/{slug} when the tour id is known', async () => {
    const { container } = renderCard({ id: 'cmuefjdhj008gr44h8flybaj7' })
    fireEvent.click(container.querySelector('.tour-card')!)

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        `${GHANA}/tour/cmuefjdhj008gr44h8flybaj7/accra-city-tour`,
        '_blank',
        'noopener',
      ),
    )
  })

  it('keeps modifier-click opening a new tab on same-tab cards', async () => {
    const { container } = renderCard({ openInNewTab: false })
    fireEvent.click(container.querySelector('.tour-card')!, { ctrlKey: true })

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(`${GHANA}/tour/accra-city-tour`, '_blank', 'noopener'),
    )
    expect(assign).not.toHaveBeenCalled()
  })

  it('points the crawlable title link at Travio Ghana', () => {
    const { container } = renderCard({ id: 'cmuefjdhj008gr44h8flybaj7', openInNewTab: false })
    const anchor = container.querySelector<HTMLAnchorElement>('.tour-card-title a')!

    expect(anchor.getAttribute('href')).toBe(`${GHANA}/tour/cmuefjdhj008gr44h8flybaj7/accra-city-tour`)
  })

  it('leaves a plain title click to the anchor instead of navigating twice', () => {
    const { container } = renderCard({ openInNewTab: false })
    fireEvent.click(container.querySelector('.tour-card-title a')!)

    expect(assign).not.toHaveBeenCalled()
    expect(window.open).not.toHaveBeenCalled()
  })
})
