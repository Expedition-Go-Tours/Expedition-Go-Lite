import { useQuery } from '@tanstack/react-query'
import data from '../data/externalReviews.json'

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
 * Enforced here in addition to the scraper (`scripts/sync-reviews.js`) so a
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

export function useExternalReviewStats() {
  return useQuery({
    queryKey: ['external-reviews-stats'],
    queryFn: () => Promise.resolve(data.stats as ExternalReviewStats),
    staleTime: Infinity,
  })
}
