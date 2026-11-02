import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: { count?: number }) => {
      const translations: Record<string, string> = {
        'sections.reviews': 'Reviews',
        'tourDetail.destination': 'Destination',
        'tourDetail.destinationHost': 'Experience Host',
        'tourDetail.defaultLocation': 'Ghana',
        'tourDetail.verifiedReviews': 'Verified',
        'tourDetail.verifiedCount': '{{count}} verified reviews',
        'tourDetail.popular': 'Popular',
        'tourDetail.bookedRecently': 'Booked {{count}} times this week',
      }
      const template = translations[key] ?? (typeof fallback === 'string' ? fallback : key)
      return options?.count != null
        ? template.replace('{{count}}', options.count.toLocaleString())
        : template
    },
  }),
}))

import TourHeader from './TourHeader'

/**
 * The three infos above the gallery are one white card: Reviews (combined
 * rating + count), Destination and Experience Host. These tests pin the
 * mockup's "4.3 (900)" value plus the count-only fallback for tours that have
 * no rating yet.
 */
describe('TourHeader info card', () => {
  beforeEach(() => {
    cleanup()
  })

  function renderHeader(overrides: Partial<Parameters<typeof TourHeader>[0]> = {}) {
    return render(
      <TourHeader
        title="Cape Coast Castle, Elmina Castle & Kakum National Park Tour"
        onReviewsClick={() => {}}
        {...{ rating: 4.3, reviewCount: 900, ...overrides }}
      />,
    )
  }

  it('shows the combined rating and count as "4.3 (900)"', () => {
    renderHeader()

    expect(screen.getByRole('button')).toHaveTextContent('4.3 (900)')
  })

  it('falls back to the plain count when the tour has no rating', () => {
    renderHeader({ rating: 0, reviewCount: 12 })

    expect(screen.getByRole('button')).toHaveTextContent('12 reviews')
  })

  it('shows the destination and the Experience Host', () => {
    renderHeader({ location: 'Cape Coast, Ghana', supplierName: 'Expedition-Go Tours LTD' })

    expect(screen.getByText('Destination')).toBeInTheDocument()
    expect(screen.getByText('Cape Coast, Ghana')).toBeInTheDocument()
    expect(screen.getByText('Experience Host')).toBeInTheDocument()
    expect(screen.getByText('Expedition-Go Tours LTD')).toBeInTheDocument()
  })

  it('drops the provider cell when no supplier is set', () => {
    renderHeader()

    expect(screen.queryByText('Experience Host')).toBeNull()
  })

  it('shows the Popular cue from recent bookings', () => {
    renderHeader({ bookingsLast7Days: 4 })

    expect(screen.getByText('Popular')).toBeInTheDocument()
    expect(screen.getByText('Booked 4 times this week')).toBeInTheDocument()
  })

  it('shows the Verified cue from verified reviews', () => {
    renderHeader({ verifiedReviewCount: 12 })

    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('12 verified reviews')).toBeInTheDocument()
  })

  it('omits both trust cues when the backend returns no sample', () => {
    renderHeader({ verifiedReviewCount: null, bookingsLast7Days: null })

    expect(screen.queryByText('Verified')).toBeNull()
    expect(screen.queryByText('Popular')).toBeNull()
  })

  it('fires onReviewsClick from the reviews value', () => {
    const onReviewsClick = vi.fn()
    renderHeader({ onReviewsClick })

    fireEvent.click(screen.getByRole('button'))
    expect(onReviewsClick).toHaveBeenCalledTimes(1)
  })
})
