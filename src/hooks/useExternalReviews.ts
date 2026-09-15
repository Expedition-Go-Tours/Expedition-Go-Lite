import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import data from '../data/externalReviews.json'
import { matchTourForTitle, type MatchableTour } from '../lib/reviewTourLink'

export interface ExternalReview {
  id: string
  source: 'TRIPADVISOR' | 'GETYOURGUIDE' | 'GOOGLE'
  reviewerName: string
  reviewerAvatar: string | null
  rating: number
  title: string | null
  text: string
  textTruncated: string | null
  tourTitle: string
  tourThumbnail: string | null
  tourUrl: string
  tourLink: string
  coverPhoto: string | null
  originalDate: string | null
  platformRating: number | null
  platformReviewCount: number | null
}

export interface ExternalReviewStats {
  totalReviews: number
  averageRating: number | null
  platforms: {
    source: string
    reviewCount: number
    averageRating: number
  }[]
}

// Fisher-Yates shuffle for deterministic randomization
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Google reviews at 3 stars or below are never shown (social-proof policy).
 * Enforced here in addition to the scraper (`scripts/sync-reviews.cjs`) so a
 * stale or hand-regenerated JSON can never surface them.
 */
const MIN_GOOGLE_RATING = 4

function visibleReviews(): ExternalReview[] {
  return (data.reviews as ExternalReview[]).filter(
    (r) => r.source !== 'GOOGLE' || r.rating >= MIN_GOOGLE_RATING,
  )
}

export function useExternalReviews(limit = 100) {
  return useQuery({
    queryKey: ['external-reviews', limit],
    queryFn: () => {
      const mixed = shuffle(visibleReviews())
      return Promise.resolve(mixed.slice(0, limit))
    },
    staleTime: Infinity,
  })
}

export function useAllExternalReviews() {
  return useQuery({
    queryKey: ['external-reviews-all'],
    queryFn: () => Promise.resolve(visibleReviews()),
    staleTime: Infinity,
  })
}

/**
 * Sources whose scraped reviews make up the headline stats bar. Google rows
 * are business-level (they carry the Google Maps listing as their "tour"), so
 * they are listed in the UI but never counted in the headline numbers.
 */
export const COUNTED_SOURCES: ExternalReview['source'][] = ['TRIPADVISOR', 'GETYOURGUIDE']

/**
 * Stats derived from the reviews actually present in the dataset — never from
 * the platform-wide totals scraped off the listing headers (those count every
 * product on the platform and made the bar read "1204+" for 143 rows).
 */
export function computeExternalReviewStats(reviews: ExternalReview[]): ExternalReviewStats {
  const platforms = new Map<string, { count: number; sum: number }>()
  let totalReviews = 0
  let countedSum = 0

  for (const review of reviews) {
    const entry = platforms.get(review.source) ?? { count: 0, sum: 0 }
    entry.count++
    entry.sum += review.rating
    platforms.set(review.source, entry)

    if (COUNTED_SOURCES.includes(review.source)) {
      totalReviews++
      countedSum += review.rating
    }
  }

  return {
    totalReviews,
    averageRating: totalReviews > 0 ? Math.round((countedSum / totalReviews) * 10) / 10 : null,
    platforms: [...platforms.entries()].map(([source, { count, sum }]) => ({
      source,
      reviewCount: count,
      averageRating: Math.round((sum / count) * 10) / 10,
    })),
  }
}

export function useExternalReviewStats() {
  return useQuery({
    queryKey: ['external-reviews-stats'],
    // Computed from the visible reviews (same array the cards render) so the
    // stat can never drift from the list — the stored `data.stats` block is
    // only a scraper artifact.
    queryFn: () => Promise.resolve(computeExternalReviewStats(visibleReviews())),
    staleTime: Infinity,
  })
}

/**
 * External reviews whose platform title maps to the given tour. Used by the
 * tour detail page so a product shows the TripAdvisor / GetYourGuide reviews
 * scraped for it, not just in-app ones. Business-level Google rows (title
 * "Expedition-Go Tours LTD") don't map to any single tour and are excluded.
 */
export function useTourExternalReviews(tour: MatchableTour | null | undefined) {
  const { data: all, isLoading } = useAllExternalReviews()
  const title = tour?.title
  const location = tour?.location

  const reviews = useMemo(() => {
    if (!all || !title) return [] as ExternalReview[]
    return all
      .filter((review) => matchTourForTitle(review.tourTitle, [{ title, location }]) !== null)
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating
        const da = a.originalDate ? new Date(a.originalDate).getTime() : 0
        const db = b.originalDate ? new Date(b.originalDate).getTime() : 0
        return db - da
      })
  }, [all, title, location])

  return { reviews, isLoading }
}
