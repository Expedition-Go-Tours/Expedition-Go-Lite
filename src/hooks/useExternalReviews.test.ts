import { describe, it, expect } from 'vitest'
import { computeExternalReviewStats, type ExternalReview } from './useExternalReviews'

function review(
  partial: Partial<ExternalReview> & Pick<ExternalReview, 'id' | 'source' | 'rating'>,
): ExternalReview {
  return {
    reviewerName: 'Test Reviewer',
    reviewerAvatar: null,
    title: null,
    text: 'Review text',
    textTruncated: null,
    tourTitle: 'Some Tour',
    tourThumbnail: null,
    tourUrl: 'https://example.com/tour',
    tourLink: 'https://example.com/tour',
    coverPhoto: null,
    originalDate: null,
    platformRating: null,
    platformReviewCount: null,
    ...partial,
  }
}

describe('computeExternalReviewStats', () => {
  it('counts only the scraped TripAdvisor and GetYourGuide reviews', () => {
    const stats = computeExternalReviewStats([
      review({ id: 'ta1', source: 'TRIPADVISOR', rating: 5 }),
      review({ id: 'ta2', source: 'TRIPADVISOR', rating: 4 }),
      review({ id: 'gyg1', source: 'GETYOURGUIDE', rating: 4 }),
      review({ id: 'g1', source: 'GOOGLE', rating: 5 }),
      review({ id: 'g2', source: 'GOOGLE', rating: 5 }),
    ])

    expect(stats.totalReviews).toBe(3)
    expect(stats.averageRating).toBe(4.3)
    expect(stats.platforms).toEqual([
      { source: 'TRIPADVISOR', reviewCount: 2, averageRating: 4.5 },
      { source: 'GETYOURGUIDE', reviewCount: 1, averageRating: 4 },
      { source: 'GOOGLE', reviewCount: 2, averageRating: 5 },
    ])
  })

  it('ignores platform-wide totals (platformReviewCount) entirely', () => {
    const stats = computeExternalReviewStats([
      review({ id: 'ta1', source: 'TRIPADVISOR', rating: 5, platformReviewCount: 911 }),
      review({ id: 'gyg1', source: 'GETYOURGUIDE', rating: 5, platformReviewCount: 293 }),
    ])

    expect(stats.totalReviews).toBe(2)
    expect(stats.platforms.map((p) => p.reviewCount)).toEqual([1, 1])
  })

  it('returns zeros for an empty review set', () => {
    expect(computeExternalReviewStats([])).toEqual({
      totalReviews: 0,
      averageRating: null,
      platforms: [],
    })
  })

  it('counts nothing when only Google reviews exist', () => {
    const stats = computeExternalReviewStats([
      review({ id: 'g1', source: 'GOOGLE', rating: 5 }),
    ])

    expect(stats.totalReviews).toBe(0)
    expect(stats.averageRating).toBeNull()
    expect(stats.platforms).toEqual([
      { source: 'GOOGLE', reviewCount: 1, averageRating: 5 },
    ])
  })
})
