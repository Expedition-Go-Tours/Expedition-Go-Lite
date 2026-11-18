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
        'tourDetail.newListing': 'New',
        'tourDetail.operatorReviewCount': '{{count, number}} reviews',
        'tourDetail.operatorReviewSources': 'on TripAdvisor, GetYourGuide & Google',
      }
      const template = translations[key] ?? (typeof fallback === 'string' ? fallback : key)
      return options?.count != null
        ? template.replace(/\{\{count(?:, number)?\}\}/, options.count.toLocaleString())
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

  it('shows "New" when the tour has no rating and no reviews', () => {
    renderHeader({ rating: 0, reviewCount: 0 })

    expect(screen.getByRole('button')).toHaveTextContent('New')
  })

  it('uses one column per cell so a no-booking tour keeps three strips', () => {
    const { container } = renderHeader({
      location: 'Accra, Ghana',
      supplierName: 'Expedition-Go Tours LTD',
    })

    expect(container.querySelector('.tour-header-info-row')).toHaveClass('tour-header-info-row-3')
  })

  it('counts the extra trust cues in the row class', () => {
    const { container } = renderHeader({
      location: 'Accra, Ghana',
      supplierName: 'Expedition-Go Tours LTD',
      verifiedReviewCount: 3,
      bookingsLast7Days: 2,
    })

    expect(container.querySelector('.tour-header-info-row')).toHaveClass('tour-header-info-row-5')
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

  it('shows the operator proof under the Experience Host for a new tour', () => {
    const onOperatorReviewsClick = vi.fn()
    renderHeader({
      rating: 0,
      reviewCount: 0,
      location: 'Accra, Ghana',
      supplierName: 'Expedition-Go Tours LTD',
      operatorProof: { rating: 4.9, reviewCount: 1204 },
      onOperatorReviewsClick,
    })

    expect(screen.getByText('1,204 reviews')).toBeInTheDocument()
    expect(screen.getByText('on TripAdvisor, GetYourGuide & Google')).toBeInTheDocument()

    fireEvent.click(screen.getByText('1,204 reviews'))
    expect(onOperatorReviewsClick).toHaveBeenCalledTimes(1)
  })

  it('keeps the operator proof off once the tour has its own reviews', () => {
    renderHeader({
      rating: 0,
      reviewCount: 12,
      location: 'Accra, Ghana',
      supplierName: 'Expedition-Go Tours LTD',
      operatorProof: { rating: 4.9, reviewCount: 1204 },
    })

    expect(screen.queryByText('on TripAdvisor, GetYourGuide & Google')).toBeNull()
  })

  it('fires onReviewsClick from the reviews value', () => {
    const onReviewsClick = vi.fn()
    renderHeader({ onReviewsClick })

    fireEvent.click(screen.getByRole('button'))
    expect(onReviewsClick).toHaveBeenCalledTimes(1)
  })
})
