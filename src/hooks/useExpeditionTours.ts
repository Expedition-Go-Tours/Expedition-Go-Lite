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

function extractStartingPriceFromRaw(sp: unknown): number | null {
  if (!sp) return null;
  try {
    const data = typeof sp === 'string' ? JSON.parse(sp) : sp as Record<string, any>;

    // Path 1: pricingSchedules -> schedules[].prices/ pricingCategories
    const schedules = (data as any)?.pricingSchedules?.schedules;
    if (Array.isArray(schedules) && schedules.length > 0) {
      for (const s of schedules) {
        const prices = Array.isArray(s?.prices) ? s.prices : [];
        for (const p of prices) {
          const ag = (p?.ageGroup || '').toLowerCase();
          if ((ag === 'adult' || ag === 'adults') && p?.retailPrice != null) {
            return Number(p.retailPrice);
          }
        }
        const cats = Array.isArray(s?.pricingCategories) ? s.pricingCategories : [];
        for (const c of cats) {
          const name = (c?.name || '').toLowerCase();
          if ((name === 'adult' || name === 'adults') && c?.price != null) {
            return Number(c.price);
          }
        }
        if (s?.uniformPrice != null) return Number(s.uniformPrice);
        if (prices.length > 0 && prices[0]?.retailPrice != null) return Number(prices[0].retailPrice);
        if (cats.length > 0 && cats[0]?.price != null) return Number(cats[0].price);
      }
    }

    // Path 2: travelerDetails.pricingCategories (no schedules case)
    const td = (data as any)?.travelerDetails;
    if (td) {
      if (td.uniformPrice != null) return Number(td.uniformPrice);
      const cats = Array.isArray(td.pricingCategories) ? td.pricingCategories : [];
      for (const c of cats) {
        const name = (c?.name || '').toLowerCase();
        if ((name === 'adult' || name === 'adults') && c?.price != null) {
          return Number(c.price);
        }
      }
      if (cats.length > 0 && cats[0]?.price != null) return Number(cats[0].price);
    }

    return null;
  } catch {
    return null;
  }
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    if (days === 1) return 'Full Day'
    return `${days} days`
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
    categorization?: any
    bookingAndTickets?: any
    difficulty?: string | null
    cancellationPolicy?: string | null
    pickupIncluded?: boolean | null
    supplierName: string | null
    supplierPhoto: string | null
    bookingFlow: 'DIRECT' | 'EXTERNAL'
    externalUrl: string | null
    features: string
    languages: string[]
    schedulesAndPricing?: any
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
  difficulty?: string
  cancellationPolicy?: string
  pickupIncluded?: boolean
}
function extractDurationFromTour(tour: any): number | null {
  try {
    const cat = typeof tour.categorization === 'string' ? JSON.parse(tour.categorization) : tour.categorization
    const d = cat?.duration
    if (!d || d.value == null) return null
    const val = Number(d.value)
    if (!Number.isFinite(val) || val <= 0) return null
    const unit = (d.unit || '').toLowerCase()
    if (unit === 'minutes') return val
    if (unit === 'hours') return val * 60
    if (unit === 'days') return val * 1440
    if (unit === 'weeks') return val * 10080
    return val * 60
  } catch {
    return null
  }
}

function extractCityFromTour(tour: any): string | null {
  try {
    const pc = typeof tour.productContent === 'string' ? JSON.parse(tour.productContent) : tour.productContent
    const loc = Array.isArray(pc?.locations) ? pc.locations[0] : null
    if (!loc) return null
    const addr = (loc.address || loc.name || '').trim()
    const parts = addr.split(',').map((s: string) => s.trim()).filter(Boolean)
    if (parts.length < 2) return null

    const country = parts[parts.length - 1]
    const nonCityKeywords = ['region', 'district', 'municipal', 'municipality', 'area', 'highway',
      'road', 'street', 'avenue', 'lane', 'drive', 'boulevard', 'circle', 'close', 'way',
      'junction', 'interchange', 'estate', 'park', 'gardens', 'heights', 'village', 'town']

    for (let i = parts.length - 2; i >= 0; i--) {
      const p = parts[i]
      if (p === country) continue
      const lower = p.toLowerCase()
      if (nonCityKeywords.some(k => lower.includes(k))) continue
      if (/[\d]/.test(p) && /-/.test(p)) continue
      if (lower.length < 2 || lower.length > 40) continue
      return p
    }

    return parts.length >= 3 ? parts[parts.length - 3] : parts[0]
  } catch {
    return null
  }
}

function extractCountryFromTour(tour: any): string | null {
  try {
    const pc = typeof tour.productContent === 'string' ? JSON.parse(tour.productContent) : tour.productContent
    const loc = Array.isArray(pc?.locations) ? pc.locations[0] : null
    if (!loc) return null
    const addr = (loc.address || loc.name || '').trim()
    const parts = addr.split(',').map((s: string) => s.trim()).filter(Boolean)
    return parts.length > 0 ? parts[parts.length - 1] : null
  } catch {
    return null
  }
}

function extractDifficultyFromTour(tour: any): string | null {
  try {
    if (tour?.difficulty) return String(tour.difficulty)
    const cat = typeof tour?.categorization === 'string' ? JSON.parse(tour.categorization) : tour?.categorization
    return cat?.difficulty ? String(cat.difficulty) : null
  } catch {
    return null
  }
}

function extractCancellationFromTour(tour: any): string | null {
  try {
    if (tour?.cancellationPolicy && typeof tour.cancellationPolicy === 'string') return tour.cancellationPolicy
    const bt = typeof tour?.bookingAndTickets === 'string' ? JSON.parse(tour.bookingAndTickets) : tour?.bookingAndTickets
    const policy = bt?.cancellationPolicy
    if (!policy) return null
    if (typeof policy === 'string') return policy
    const hours = policy.cancellationWindowHours ?? policy.freeCancellationHours ?? policy.cutoffHours
    if (hours != null) return `Free cancellation up to ${hours} hours before start time`
    if (policy.type === 'flexible') return 'Free cancellation'
    if (policy.type === 'non_refundable') return 'Non-refundable'
    return null
  } catch {
    return null
  }
}


function mapToListing(tour: ExpeditionTourRecord['tour']): TourCardData {
  const location = [tour.city, tour.country].filter(Boolean).join(', ')
  const isExternal = tour.bookingFlow === 'EXTERNAL'
  const effectivePrice = tour.startingPrice ?? extractStartingPriceFromRaw(tour.schedulesAndPricing)

  let effectiveDuration = tour.durationMinutes
  if (!effectiveDuration && tour.categorization) {
    const cat = typeof tour.categorization === 'string' ? JSON.parse(tour.categorization) : tour.categorization
    const d = cat?.duration
    if (d && d.value != null) {
      const val = Number(d.value)
      if (Number.isFinite(val) && val > 0) {
        const unit = (d.unit || '').toLowerCase()
        if (unit === 'minutes') effectiveDuration = val
        else if (unit === 'hours') effectiveDuration = val * 60
        else if (unit === 'days') effectiveDuration = val * 1440
        else effectiveDuration = val * 60
      }
    }
  }

  return {
    title: tour.title,
    category: tour.category || '',
    duration: formatDuration(effectiveDuration),
    features: tour.features || '',
    price: formatPrice(effectivePrice),
    rating: tour.averageRating != null ? String(tour.averageRating) : '0',
    reviews: tour.reviewCount,
    location,
    image: tour.coverPhoto || tour.photos?.[0] || '',
    source: isExternal ? 'travio-africa' : 'expedition-go',
    externalUrl: isExternal ? (tour.externalUrl || undefined) : undefined,
    slug: tour.slug,
    languages: tour.languages?.length ? tour.languages : undefined,
    difficulty: extractDifficultyFromTour(tour) || undefined,
    cancellationPolicy: extractCancellationFromTour(tour) || undefined,
    pickupIncluded: tour.pickupIncluded ?? (tour.bookingAndTickets?.pickupAvailable ?? tour.bookingAndTickets?.pickupProvided) ?? undefined,
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

      // If any tour is missing listing fields, batch-fetch from main tour endpoint
      const needsBatch = records.some((r) =>
        r.tour.startingPrice == null || !r.tour.city || !r.tour.durationMinutes ||
        !extractDifficultyFromTour(r.tour) || !extractCancellationFromTour(r.tour)
      )
      if (needsBatch) {
        try {
          const allPayload = await expeditionFetchRaw('/tours?limit=500')
          const allTours: any[] = allPayload.data?.tours ?? []
          const priceMap = new Map<string, number>()
          const cityMap = new Map<string, string | null>()
          const countryMap = new Map<string, string | null>()
          const durationMap = new Map<string, number | null>()
          const difficultyMap = new Map<string, string | null>()
          const cancellationMap = new Map<string, string | null>()
          for (const t of allTours) {
            const p = extractStartingPriceFromRaw(t.schedulesAndPricing)
            if (p != null) priceMap.set(t.id, p)
            cityMap.set(t.id, extractCityFromTour(t))
            countryMap.set(t.id, extractCountryFromTour(t))
            durationMap.set(t.id, extractDurationFromTour(t))
            difficultyMap.set(t.id, extractDifficultyFromTour(t))
            cancellationMap.set(t.id, extractCancellationFromTour(t))
          }
          for (const r of records) {
            if (r.tour.startingPrice == null) {
              const fallbackPrice = priceMap.get(r.tour.id)
              if (fallbackPrice != null) r.tour.startingPrice = fallbackPrice
            }
            if (!r.tour.city) {
              r.tour.city = cityMap.get(r.tour.id) ?? null
            }
            if (!r.tour.country) {
              r.tour.country = countryMap.get(r.tour.id) ?? null
            }
            if (!r.tour.durationMinutes) {
              const fallbackDuration = durationMap.get(r.tour.id)
              if (fallbackDuration != null) r.tour.durationMinutes = fallbackDuration
            }
            if (!extractDifficultyFromTour(r.tour)) {
              r.tour.difficulty = difficultyMap.get(r.tour.id) ?? null
            }
            if (!extractCancellationFromTour(r.tour)) {
              r.tour.cancellationPolicy = cancellationMap.get(r.tour.id) ?? null
            }
          }
        } catch (e) {
          console.warn('[useExpeditionTours] batch fallback failed:', e)
        }
      }

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

      const tourType = tour.durationMinutes && tour.durationMinutes >= 1440 ? 'multi-day' : 'day'

      let resolvedPrice = tour.startingPrice ?? extractStartingPriceFromRaw(tour.schedulesAndPricing)

      // Fallback: fetch raw tour data from public endpoint if price, location, or duration missing
      if ((resolvedPrice == null || !tour.city || !tour.durationMinutes) && tour.id) {
        try {
          const base = getApiBaseUrl()
          const token = await getAuthToken()
          const rawRes = await fetch(`${base}/tours/${tour.id}`, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
          if (rawRes.ok) {
            const rawPayload = await rawRes.json()
            const rawTour = rawPayload.data?.tour ?? rawPayload.tour ?? rawPayload
            if (resolvedPrice == null) {
              resolvedPrice = extractStartingPriceFromRaw(rawTour?.schedulesAndPricing)
            }
            if (!tour.city) {
              tour.city = extractCityFromTour(rawTour)
            }
            if (!tour.country) {
              tour.country = extractCountryFromTour(rawTour)
            }
            if (!tour.durationMinutes) {
              const fallbackDuration = extractDurationFromTour(rawTour)
              if (fallbackDuration != null) tour.durationMinutes = fallbackDuration
            }
          }
        } catch (e) {
          console.warn('[useExpeditionTour] fallback fetch failed:', e)
        }
      }

      resolvedPrice = resolvedPrice ?? 0
      const loc = [tour.city, tour.country].filter(Boolean).join(', ')

      const result: TourDetailData = {
        id: tour.id || '',
        title: tour.title || '',
        slug: tour.slug || '',
        description: tour.description || '',
        images: Array.isArray(tour.photos) ? tour.photos : [],
        coverPhoto: tour.coverPhoto || null,
        category: tour.category || '',
        duration: formatDuration(tour.durationMinutes),
        price: resolvedPrice,
        currency: tour.currency || 'USD',
        startingPrice: resolvedPrice,
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
