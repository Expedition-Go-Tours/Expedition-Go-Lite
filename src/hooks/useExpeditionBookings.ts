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
  tourImage: string | null
  selectedDate: string
  status: string
  total: number
  currency: string
  createdAt: string
}

export function useMyExpeditionBookings(page: number = 1, status?: string) {
  const params = new URLSearchParams({ page: String(page) })
  if (status) params.set('status', status)

  return useQuery({
    queryKey: ['expedition', 'bookings', page, status],
    queryFn: async () => {
      const payload = await expeditionFetchRaw(`/expedition/bookings?${params.toString()}`)
      const data = payload.data ?? payload
      return (data.bookings || []) as ExpeditionBookingSummary[]
    },
  })
}
