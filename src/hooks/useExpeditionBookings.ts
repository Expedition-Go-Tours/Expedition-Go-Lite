import { useQuery, useMutation } from '@tanstack/react-query'
import { getApiBaseUrl, getAuthToken } from '../lib/auth'

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

interface AvailabilityCalendarDay {
  date: string
  status: 'AVAILABLE' | 'LIMITED' | 'FULL' | 'BLOCKED'
  remainingSpots: number | null
  timeSlots?: { time: string; status: string; remaining: number }[]
}

export function useTourAvailability(
  slug: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: ['expedition', 'tours', slug, 'availability', startDate, endDate],
    enabled: !!slug && !!startDate && !!endDate,
    queryFn: async () => {
      const payload = await expeditionFetchRaw(
        `/expedition/tours/${encodeURIComponent(slug!)}/availability`
        + `?startDate=${startDate!}&endDate=${endDate!}`
      )
      const data = payload.data ?? payload
      return (data.calendar || []) as AvailabilityCalendarDay[]
    },
  })
}

interface CalculateCheckoutInput {
  tourId: string
  selectedDate: string
  travelers: {
    adults: number
    children?: number
    infants?: number
  }
}

interface CalculateCheckoutResponse {
  pricing: {
    subtotal: number
    fees: number
    discounts: number
    total: number
    currency: string
    breakdown: { label: string; quantity: number; unitPrice: number; total: number }[]
  }
  availability: {
    available: boolean
    remainingSpots: number
  }
}

export function useCalculateCheckout() {
  return useMutation({
    mutationFn: async (input: CalculateCheckoutInput) => {
      const base = getApiBaseUrl()
      const token = await getAuthToken()
      const res = await fetch(`${base}/expedition/checkout/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload.message || `Request failed (${res.status})`)
      }
      const result = (payload.data ?? payload) as CalculateCheckoutResponse
      return result
    },
  })
}

interface ConfirmBookingInput {
  tourId: string
  selectedDate: string
  travelers: {
    adults: number
    children?: number
    infants?: number
    phoneNumber: string
    location: string
    details?: { name: string; age: number; ageGroup: string; specialRequests?: string }[]
  }
  paymentMethodId: string
  specialRequests?: string
}

interface ConfirmBookingResponse {
  booking: {
    id: string
    bookingNumber: string
    status: string
    total: number
    currency: string
  }
  clientSecret: string
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (input: ConfirmBookingInput) => {
      const base = getApiBaseUrl()
      const token = await getAuthToken()
      const res = await fetch(`${base}/expedition/checkout/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.message || `Request failed (${res.status})`)
      return (payload.data ?? payload) as ConfirmBookingResponse
    },
  })
}

interface ExpeditionBookingSummary {
  id: string
  bookingNumber: string
  tourTitle: string
  tourSlug: string
  tourId: string
  tourImage: string | null
  tourLocation: string
  tourDurationMinutes: number | null
  selectedDate: string
  status: string
  total: number
  currency: string
  createdAt: string
}

interface RawBookingListRecord {
  id: string
  bookingNumber: string
  status: string
  total: number | string
  currency: string
  createdAt: string
  selectedDate: string
  tour: {
    id: string
    title: string
    slug: string
    coverPhoto: string | null
    photos: string[]
    city?: string | null
    country?: string | null
    durationMinutes?: number | null
  }
}

function mapBookingSummary(b: RawBookingListRecord): ExpeditionBookingSummary {
  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    tourTitle: b.tour?.title || '',
    tourSlug: b.tour?.slug || '',
    tourId: b.tour?.id || '',
    tourImage: b.tour?.coverPhoto || b.tour?.photos?.[0] || null,
    tourLocation: [b.tour?.city, b.tour?.country].filter(Boolean).join(', '),
    tourDurationMinutes: b.tour?.durationMinutes ?? null,
    selectedDate: b.selectedDate,
    status: b.status,
    total: Number(b.total),
    currency: b.currency,
    createdAt: b.createdAt,
  }
}

export function useMyExpeditionBookings(page: number = 1, status?: string, limit?: number) {
  const params = new URLSearchParams({ page: String(page) })
  if (status) params.set('status', status)
  if (limit) params.set('limit', String(limit))

  return useQuery({
    queryKey: ['expedition', 'bookings', page, status, limit],
    queryFn: async () => {
      const payload = await expeditionFetchRaw(`/expedition/bookings?${params.toString()}`)
      const data = payload.data ?? payload
      const records: RawBookingListRecord[] = data.bookings || []
      return records.map(mapBookingSummary)
    },
  })
}

interface RawBookingDetailRecord {
  id: string
  status: string
  tour: { id: string; slug: string; title: string }
  review?: { id: string } | null
}

/**
 * Finds the current customer's completed booking for a given tour that is
 * eligible for a review (status COMPLETED, no existing review). Used to
 * resolve a real bookingId before navigating to the "Write a Review" page —
 * the review submission endpoint requires an actual booking id, not a tour id.
 *
 * Returns `undefined` while loading, `null` if no eligible booking was found,
 * or the booking id string if one exists.
 */
export function useReviewableBookingForTour(tourSlugOrId: string | undefined) {
  return useQuery({
    queryKey: ['expedition', 'bookings', 'reviewable', tourSlugOrId],
    enabled: !!tourSlugOrId,
    queryFn: async (): Promise<string | null> => {
      // getMyBookings doesn't expose a tour filter or the review relation,
      // so pull completed bookings and match client-side against the tour,
      // then verify via the single-booking endpoint (which does include
      // `review`) whether it's still eligible.
      const payload = await expeditionFetchRaw('/expedition/bookings?status=COMPLETED&limit=100')
      const data = payload.data ?? payload
      const records: RawBookingListRecord[] = data.bookings || []
      const bookings = records.map(mapBookingSummary)

      const match = bookings.find(
        (b) => b.tourSlug === tourSlugOrId || b.tourId === tourSlugOrId
      )
      if (!match) return null

      try {
        const detailPayload = await expeditionFetchRaw(`/expedition/bookings/${encodeURIComponent(match.id)}`)
        const detail: RawBookingDetailRecord = (detailPayload.data ?? detailPayload)?.booking ?? {}
        if (detail.review) return null // already reviewed
        return match.id
      } catch {
        // If the detail fetch fails, fall back to the summary match — the
        // create-review call will still correctly reject it if a review
        // already exists (409 "already reviewed").
        return match.id
      }
    },
  })
}
