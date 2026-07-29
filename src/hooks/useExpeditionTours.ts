import { useQuery } from '@tanstack/react-query'
import { getApiBaseUrl, getAuthToken } from '../lib/auth'
import type { TourDetail } from '../lib/tourTypes'

async function expeditionFetchRaw(path: string) {
  const base = getApiBaseUrl()
  const token = await getAuthToken()
  const res = await fetch(`${base}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.message || `Request failed (${res.status})`)
  }
  return payload
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    return `${days} day${days > 1 ? 's' : ''}`
  }
  const hours = Math.round(minutes / 60)
  return `${hours} hour${hours > 1 ? 's' : ''}`
}

function formatPrice(price: number | null): string {
  if (price == null || price === 0) return ''
  return `$${price}`
}

interface ExpeditionTourRecord {
  id: string
  displayOrder: number
  isFeatured: boolean
  bookingFlow: 'DIRECT' | 'EXTERNAL'
  externalUrl: string | null
  tour: {
    id: string
    title: string
    slug: string
    description: string | null
    coverPhoto: string | null
    photos: string[]
    category: string | null
    durationMinutes: number | null
    startingPrice: number | null
    currency: string
    averageRating: number | null
    reviewCount: number
    viewCount: number
    city: string | null
    country: string | null
    supplierName: string | null
    supplierPhoto: string | null
    bookingFlow: 'DIRECT' | 'EXTERNAL'
    externalUrl: string | null
    features: string
    languages: string[]
  }
}

export interface TourCardData {
  title: string
  category: string
  duration: string
  features: string
  price: string
  rating: string
  reviews: number
  location: string
  image: string
  source: 'expedition-go' | 'travio-africa'
  externalUrl?: string
  slug: string
  languages?: string[]
}

type TourData = ExpeditionTourRecord['tour']

function mapToListing(tour: TourData): TourCardData {
  const location = [tour.city, tour.country].filter(Boolean).join(', ')
  const isExternal = tour.bookingFlow === 'EXTERNAL'
  return {
    title: tour.title,
    category: tour.category || '',
    duration: formatDuration(tour.durationMinutes),
    features: tour.features || '',
    price: formatPrice(tour.startingPrice),
    rating: tour.averageRating != null ? String(tour.averageRating) : '0',
    reviews: tour.reviewCount,
    location,
    image: tour.coverPhoto || tour.photos?.[0] || '',
    source: isExternal ? 'travio-africa' : 'expedition-go',
    externalUrl: isExternal ? (tour.externalUrl || undefined) : undefined,
    slug: tour.slug,
    languages: tour.languages?.length ? tour.languages : undefined,
  }
}

export interface ExpeditionToursFilters {
  page?: number
  limit?: number
  search?: string
  category?: string
  city?: string
  country?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular'
}

export function useExpeditionTours(filters: ExpeditionToursFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.category) params.set('category', filters.category)
  if (filters.city) params.set('city', filters.city)
  if (filters.country) params.set('country', filters.country)
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice))
  if (filters.minRating != null) params.set('minRating', String(filters.minRating))
  if (filters.sortBy) params.set('sortBy', filters.sortBy)

  const qs = params.toString()

  return useQuery({
    queryKey: ['expedition', 'tours', filters],
    queryFn: async () => {
      const payload = await expeditionFetchRaw(`/expedition/tours${qs ? `?${qs}` : ''}`)
      const records: ExpeditionTourRecord[] = payload.data?.tours ?? payload.tours ?? []
      const pagination = payload.pagination ?? null
      return {
        tours: records.map((r) => mapToListing(r.tour)),
        pagination,
      }
    },
  })
}

export function useExpeditionFeaturedTours() {
  return useQuery({
    queryKey: ['expedition', 'tours', 'featured'],
    queryFn: async () => {
      const payload = await expeditionFetchRaw('/expedition/tours/featured')
      const records: ExpeditionTourRecord[] = payload.data?.tours ?? []
      return records.map((r) => mapToListing(r.tour))
    },
  })
}

export interface TourDetailData extends Omit<TourDetail, 'guide' | 'contact'> {
  coverPhoto: string | null
  category: string
  city: string | null
  country: string | null
  tags: string[]
  whatToBring: string[]
  meetingPoint: string
  supplierName: string
  supplierPhoto: string | null
  bookingFlow: 'DIRECT' | 'EXTERNAL'
  externalUrl: string | null
  startingPrice: number | null
  guide?: TourDetail['guide']
  contact?: TourDetail['contact']
}

export function useExpeditionTour(slug: string | undefined) {
  return useQuery({
    queryKey: ['expedition', 'tour', slug],
    enabled: !!slug,
    queryFn: async () => {
      const payload = await expeditionFetchRaw(`/expedition/tours/${encodeURIComponent(slug!)}`)
      const wrapper = payload.data?.tour ?? {}
      const tour = wrapper.tour ?? {}
      const loc = [tour.city, tour.country].filter(Boolean).join(', ')

      const tourType = tour.durationMinutes && tour.durationMinutes >= 1440 ? 'multi-day' : 'day'

      const result: TourDetailData = {
        id: tour.id || '',
        title: tour.title || '',
        slug: tour.slug || '',
        description: tour.description || '',
        images: Array.isArray(tour.photos) ? tour.photos : [],
        coverPhoto: tour.coverPhoto || null,
        category: tour.category || '',
        duration: formatDuration(tour.durationMinutes),
        price: tour.startingPrice ?? 0,
        currency: tour.currency || 'USD',
        rating: tour.averageRating != null ? Number(tour.averageRating) : 0,
        reviewCount: tour.reviewCount || 0,
        location: loc,
        city: tour.city || null,
        country: tour.country || null,
        difficulty: undefined,
        tags: [],
        highlights: Array.isArray(tour.highlights) ? tour.highlights : [],
        included: Array.isArray(tour.included) ? tour.included : [],
        excluded: [],
        whatToBring: Array.isArray(tour.whatToBring) ? tour.whatToBring : [],
        itinerary: [],
        faqs: [],
        coordinates: { lat: 0, lng: 0 },
        cancellationPolicy: tour.cancellationPolicy || 'Free cancellation up to 24 hours before',
        meetingPoint: tour.meetingPoint || '',
        languages: [],
        supplierName: tour.supplierName || '',
        supplierPhoto: tour.supplierPhoto || null,
        bookingFlow: 'DIRECT',
        externalUrl: null,
        startingPrice: tour.startingPrice ?? null,
        groupSize: 15,
        tourType,
        availability: [],
        pickupIncluded: false,
      }
      return result
    },
  })
}

export function useSimilarTours(slug: string | undefined) {
  return useQuery({
    queryKey: ['expedition', 'tours', slug, 'similar'],
    enabled: !!slug,
    queryFn: async () => {
      const payload = await expeditionFetchRaw(
        `/expedition/tours/${encodeURIComponent(slug!)}/similar`
      )
      const records: ExpeditionTourRecord[] = payload.data?.tours ?? []
      return records.map((r) => mapToListing(r.tour))
    },
  })
}
