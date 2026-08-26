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

export interface SpecialOfferData {
  id: string
  name: string
  offerType: 'LIMITED_TIME' | 'EARLY_BIRD' | 'LAST_MINUTE'
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountPercentage: number | null
  fixedDiscountValue: number | null
  startDate: string | null
  endDate: string | null
  promoCode: string | null
  timeSlotMode: 'ALL_DAYS' | 'SPECIFIC_WEEKDAYS'
  specificWeekdays: string[]
  capacityType: 'UNLIMITED' | 'CAPPED'
  maxSpots: number | null
  spotsSold: number | null
  minQuantity: number | null
  minSpendAmount: number | null
  maxRedemptionsPerCustomer: number | null
  stackable: boolean
  earlyBirdAdvanceDays: number | null
  lastMinuteWindowHours: number | null
  targets: { tourId: string; tourOptionKey: string | null; tourOptionLabel: string | null }[]
}

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
  heroImage: string | null
}

export interface HomepageAttraction {
  name: string
  tourCount: number
  heroImage: string | null
  avgRating: number | null
  totalBookings: number
  startingPrice: number | null
  lat: number | null
  lng: number | null
}

// ─── Unified Homepage Data ─────────────────────────────────────────────

export interface HomepageData {
  sellOut: HomepageTour[]
  topRated: HomepageTour[]
  trending: HomepageTour[]
  recommended: HomepageTour[]
  new: HomepageTour[]
  attractions: HomepageAttraction[]
  mood: MoodKeyword[]
  destinations: PopularDestination[]
  offers: HomepageOfferTour[]
}

/**
 * Single request that fetches all homepage sections.
 * Returns pre-computed data from Redis (0 DB queries) when available.
 */
export function useHomepage() {
  return useQuery({
    queryKey: ['homepage', 'all'],
    queryFn: () => fetchHomepageSection<HomepageData>(''),
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Fetcher ──────────────────────────────────────────────────────────

async function fetchHomepageSection<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(`/homepage${path}`)
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
 * Attractions — grouped by attraction name from tour data.
 */
export function useAttractions(limit = 12) {
  return useQuery({
    queryKey: ['homepage', 'attractions', limit],
    queryFn: () => fetchHomepageSection<{ attractions: HomepageAttraction[] }>(`/attractions?limit=${limit}`),
    staleTime: 10 * 60 * 1000,
    select: (data) => data.attractions,
  })
}

/**
 * Tours for a specific attraction — filtered by attraction name.
 * Only enabled when attractionName is provided.
 */
export function useAttractionTours(attractionName: string | null, limit = 12) {
  return useQuery({
    queryKey: ['homepage', 'attraction-tours', attractionName, limit],
    queryFn: () => fetchHomepageSection<{ tours: HomepageTour[] }>(
      `/attractions/tours?name=${encodeURIComponent(attractionName!)}&limit=${limit}`
    ),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.tours,
    enabled: !!attractionName,
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

/**
 * Returns tour IDs curated by a specific homepage section's algorithm.
 * Reads from pre-computed Redis cache on the backend (0 DB queries).
 * Used by AllToursPage to filter the tour list when ?section= is set.
 */
export function useSectionTourIds(section: string) {
  return useQuery({
    queryKey: ['homepage', 'section-tour-ids', section],
    queryFn: () => fetchHomepageSection<{ tourIds: string[] }>(
      `/section-tour-ids?section=${encodeURIComponent(section)}`
    ),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.tourIds,
    enabled: !!section,
  })
}

export interface HomepageOfferTour extends HomepageTour {
  offerId: string
  offerName: string
  offerType: string
  discountType: string
  discountPercentage: number | null
  fixedDiscountValue: number | null
  startDate: string | null
  endDate: string | null
  specialOffers: SpecialOfferData[]
}

/**
 * Tours with active special offers — single efficient query (no N+1).
 * Powers the "Special Offers" / "Last Minute Deals" homepage section.
 */
export function useHomepageOffers(limit = 12) {
  return useQuery({
    queryKey: ['homepage', 'offers', limit],
    queryFn: () => fetchHomepageSection<{ tours: HomepageOfferTour[] }>(`/offers?limit=${limit}`),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.tours,
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

  // Pick a random photo from the array for variety (reduces duplicate images)
  const allPhotos = [t.coverPhoto, ...(t.photos || [])].filter(Boolean)
  const uniquePhotos = [...new Set(allPhotos)]
  const image = uniquePhotos.length > 0
    ? uniquePhotos[Math.floor(Math.random() * uniquePhotos.length)]
    : t.coverPhoto || ''

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
    image,
    photos: t.photos,
    source: 'expedition-go',
    difficulty: t.difficulty || undefined,
  }
}
