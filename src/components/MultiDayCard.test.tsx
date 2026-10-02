import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'

/**
 * Multi-day cards hand off to Travio Ghana like day cards do, so they must
 * record the view in Continue Planning at click time — the detail page is a
 * different origin and can never write this site's storage.
 */

const capture = vi.hoisted(() => ({ rememberTour: vi.fn() }))

vi.mock('../context/WishlistContext', () => ({
  useWishlist: () => ({ isInWishlist: () => false, addToWishlist: vi.fn(), removeFromWishlist: vi.fn() }),
  toWishlistItem: () => ({ id: 'wishlist-test' }),
}))
vi.mock('../hooks/useTourViewCapture', () => ({
  useTourViewCapture: () => capture.rememberTour,
}))
vi.mock('../lib/ssoHandoff', () => ({
  ensureHandoff: (href: string) => Promise.resolve(href),
}))
vi.mock('./FormattedPrice', () => ({
  default: ({ usdPrice }: { usdPrice?: number }) => <span data-testid="price">{usdPrice}</span>,
}))

import MultiDayCard from './MultiDayCard'

const baseProps: ComponentProps<typeof MultiDayCard> = {
  id: 'tour-multi',
  title: 'Northern Ghana Safari',
  days: '5 days',
  accommodation: 'Lodge & Camping',
  highlights: 'Mole Park · Larabanga Mosque',
  price: '$520',
  rating: '4.9',
  reviews: 28,
  location: 'Northern Region, Ghana',
  image: 'https://example.com/safari.jpg',
}

describe('MultiDayCard navigation', () => {
  beforeEach(() => {
    capture.rememberTour.mockClear()
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('records the tour before handing off to Travio Ghana', async () => {
    const { container } = render(<MultiDayCard {...baseProps} />)
    fireEvent.click(container.querySelector('.multiday-card')!)

    expect(capture.rememberTour).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tour-multi',
        title: 'Northern Ghana Safari',
        days: '5 days',
        price: '$520',
      }),
    )
    await waitFor(() => expect(window.open).toHaveBeenCalled())
  })
})
