/**
 * Homepage Section Hooks
 *
 * React Query hooks for each homepage section.
 * Each hook calls the corresponding backend endpoint and returns
 * pre-sorted, algorithmically ranked tour data.
 *
 * @version 1.0.0
 */

import { useQuery } from '@tanstack/react-query'
import { fetchWithAuth } from '../lib/api'
import { getStoredLocation } from '../lib/analytics'
import type { Tour } from '../components/data'

// ─── Types ────────────────────────────────────────────────────────────

export interface HomepageTour {
  id: string
  title: string
  slug: string
  coverPhoto: string | null
  photos: string[]
  category: string | null
  city: string | null
  country: string | null
  averageRating: number | null
  reviewCount: number
  totalBookings: number
  startingPrice: number | null
  currency: string
  durationMinutes: number | null
  difficulty: string | null
  tags: string[]
  supplier: {
    id: string
    name: string
    photo: string | null
    rating: number | null
  } | null
  _score?: number
  _velocity14d?: number
  _bayesianRating?: number
  _views7d?: number
  _bookings7d?: number
  _wishlists7d?: number
  _distance?: number | null
}

export interface MoodKeyword {
  keyword: string
  image: string | null
  tourCount: number
  category: string | null
  city: string | null
}

export interface PopularDestination {
  city: string
  country: string | null
  tourCount: number
  totalBookings: number
  avgRating: number | null
  avgPrice: number | null
  heroImage: string | null
}

// ─── Fetcher ──────────────────────────────────────────────────────────

async function fetchHomepageSection<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(`/api/homepage${path}`)
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.message || `Request failed (${res.status})`)
  }
  return payload.data
}

// ─── Hooks ────────────────────────────────────────────────────────────

/**
 * Likely to Sell Out — tours with booking momentum in last 14 days.
 */
export function useLikelySellOut(limit = 12) {
  return useQuery({
    queryKey: ['homepage', 'sell-out', limit],
    queryFn: () => fetchHomepageSection<{ tours: HomepageTour[] }>(`/sell-out?limit=${limit}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.tours,
  })
}

/**
 * Top Rated — Bayesian-smoothed quality scores.
 */
export function useTopRated(limit = 12) {
  return useQuery({
    queryKey: ['homepage', 'top-rated', limit],
    queryFn: () => fetchHomepageSection<{ tours: HomepageTour[] }>(`/top-rated?limit=${limit}`),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.tours,
  })
}

/**
 * Trending Now — view/booking/wishlist velocity (7d vs prior 7d).
 */
export function useTrending(limit = 12) {
  return useQuery({
    queryKey: ['homepage', 'trending', limit],
    queryFn: () => fetchHomepageSection<{ tours: HomepageTour[] }>(`/trending?limit=${limit}`),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.tours,
  })
}

/**
 * Recommended for You — personalized by behavior + location + quality.
 */
export function useRecommended(limit = 12) {
  const location = getStoredLocation()
  const params = new URLSearchParams({ limit: String(limit) })
  if (location) {
    params.set('lat', String(location.lat))
    params.set('lng', String(location.lng))
  }

  return useQuery({
    queryKey: ['homepage', 'recommended', limit, location?.lat, location?.lng],
    queryFn: () => fetchHomepageSection<{ tours: HomepageTour[] }>(`/recommended?${params}`),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.tours,
  })
}

/**
 * New Experiences — tours created in last 30 days.
 */
export function useNewExperiences(limit = 10) {
  return useQuery({
    queryKey: ['homepage', 'new', limit],
    queryFn: () => fetchHomepageSection<{ tours: HomepageTour[] }>(`/new?limit=${limit}`),
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.tours,
  })
}

/**
 * Top Attractions — nearby tours sorted by affordability + quality.
 */
export function useTopAttractions(limit = 10) {
  const location = getStoredLocation()
  const params = new URLSearchParams({ limit: String(limit) })
  if (location) {
    params.set('lat', String(location.lat))
    params.set('lng', String(location.lng))
  }

  return useQuery({
    queryKey: ['homepage', 'attractions', limit, location?.lat, location?.lng],
    queryFn: () => fetchHomepageSection<{ tours: HomepageTour[] }>(`/attractions?${params}`),
    staleTime: 10 * 60 * 1000,
    select: (data) => data.tours,
  })
}

/**
 * Mood Keywords — dynamic keywords for "What do you want to do?"
 */
export function useMoodKeywords(limit = 8) {
  return useQuery({
    queryKey: ['homepage', 'mood', limit],
    queryFn: () => fetchHomepageSection<{ keywords: MoodKeyword[] }>(`/mood?limit=${limit}`),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.keywords,
  })
}

/**
 * Popular Destinations — cities with most tours/bookings.
 */
export function usePopularDestinations(limit = 10) {
  return useQuery({
    queryKey: ['homepage', 'destinations', limit],
    queryFn: () => fetchHomepageSection<{ destinations: PopularDestination[] }>(`/destinations?limit=${limit}`),
    staleTime: 60 * 60 * 1000, // 1 hour
    select: (data) => data.destinations,
  })
}

// ─── Mapper ───────────────────────────────────────────────────────────

/**
 * Map an API HomepageTour to the Tour interface that TourCard expects.
 * This is the only bridge between the new API shape and the existing UI.
 */
export function mapToTourCard(t: HomepageTour): Tour {
  const durationStr = t.durationMinutes
    ? t.durationMinutes >= 1440
      ? `${Math.round(t.durationMinutes / 1440)} days`
      : `${Math.round(t.durationMinutes / 60)} hours`
    : ''

  const location = [t.city, t.country].filter(Boolean).join(', ')

  return {
    id: t.id,
    title: t.title,
    category: t.category || '',
    duration: durationStr,
    features: t.tags?.join(', ') || '',
    price: t.startingPrice != null ? `$${t.startingPrice}` : '',
    rating: t.averageRating != null ? String(t.averageRating) : '',
    reviews: t.reviewCount || 0,
    location,
    image: t.coverPhoto || t.photos?.[0] || '',
    photos: t.photos,
    source: 'expedition-go',
    slug: t.slug,
    difficulty: t.difficulty || undefined,
  }
}
