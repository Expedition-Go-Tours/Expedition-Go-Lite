import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: { count?: number }) => {
      const translations: Record<string, string> = {
        'sections.whatTravellersAreSaying': 'What travellers are saying',
        'reviews.writeAReview': 'Write a review',
        'tourDetail.destinationHost': 'Experience Host',
        'reviews.noReviewsTitle': 'No reviews yet',
        'reviews.noReviewsText':
          'This experience is new on TravioGhana. Reviews appear here as soon as travellers write them.',
        'tourDetail.operatorReviews': '{{count}} reviews on TripAdvisor, GetYourGuide & Google',
        'reviews.readThem': 'Read them',
      }
      const template = translations[key] ?? (typeof fallback === 'string' ? fallback : key)
      if (options?.count == null) return template
      return template.includes('{{count, number}}')
        ? template.replace('{{count, number}}', options.count.toLocaleString())
        : template.replace('{{count}}', String(options.count))
    },
  }),
}))

import ReviewsSection from './ReviewsSection'

const baseProps = {
  rating: 0,
  reviewCount: 0,
  reviewBreakdown: [],
  reviews: [],
  hasMore: false,
  loadingMore: false,
  onLoadMore: () => {},
  onWriteReview: () => {},
  starFilter: null,
  onStarFilterChange: () => {},
  supplierName: 'Expedition-Go Tours LTD',
}

describe('ReviewsSection empty state', () => {
  beforeEach(() => {
    cleanup()
  })

  it('replaces the 0.0 summary with the operator proof', () => {
    const onOperatorReviewsClick = vi.fn()
    const { container } = render(
      <ReviewsSection
        {...baseProps}
        operatorProof={{ rating: 4.9, reviewCount: 1204 }}
        onOperatorReviewsClick={onOperatorReviewsClick}
      />,
    )

    expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    expect(container.querySelector('.reviews-layout')).toBeNull()

    const proof = container.querySelector('.reviews-empty-proof')
    expect(proof?.textContent).toContain('Expedition-Go Tours LTD')
    expect(proof?.textContent).toContain('4.9')
    expect(proof?.textContent).toContain('1204 reviews on TripAdvisor, GetYourGuide & Google')

    fireEvent.click(screen.getByRole('button', { name: 'Read them' }))
    expect(onOperatorReviewsClick).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state without proof when the operator has no totals', () => {
    const { container } = render(<ReviewsSection {...baseProps} />)

    expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    expect(container.querySelector('.reviews-empty-proof')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Read them' })).toBeNull()
  })

  it('keeps the normal rating layout when the tour has reviews', () => {
    const { container } = render(
      <ReviewsSection
        {...baseProps}
        rating={4.5}
        reviewCount={12}
        reviewBreakdown={[
          { label: '5 stars', stars: 5, count: 10, percentage: 83 },
          { label: '4 stars', stars: 4, count: 2, percentage: 17 },
        ]}
      />,
    )

    expect(container.querySelector('.reviews-layout')).not.toBeNull()
    expect(container.querySelector('.reviews-empty')).toBeNull()
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })
})
