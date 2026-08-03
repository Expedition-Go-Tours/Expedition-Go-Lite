import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiBaseUrl, getAuthToken } from '../lib/auth'
import { useMyExpeditionBookings } from './useExpeditionBookings'

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

interface ExpeditionReview {
  id: string
  bookingId?: string
  customerId?: string
  customer?: { id: string; name: string; photoURL?: string | null }
  rating: number
  title?: string | null
  comment: string
  createdAt: string
}

export interface ReviewCardData {
  id: string
  author: string
  authorId?: string
  avatar?: string
  rating: number
  date: string
  title: string
  content: string
}

/**
 * Fetches reviews directly from the public /reviews/tours/:tourId endpoint.
 * Works for any tour by its real database id, regardless of whether it has
 * been curated onto the Expedition-Go homepage (ExpeditionTour table).
 * Used as a fallback so reviews for newly created / uncurated tours still load.
 */
async function fetchRawTourReviews(tourId: string, page: number, limit: number) {
  const base = getApiBaseUrl()
  const token = await getAuthToken()
  const res = await fetch(
    `${base}/reviews/tours/${encodeURIComponent(tourId)}?page=${page}&limit=${limit}&sortBy=createdAt&sortOrder=desc`,
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  )
  if (!res.ok) return null
  const payload = await res.json().catch(() => ({}))
  return payload.data ?? payload ?? null
}

function mapReviewRecords(reviews: ExpeditionReview[]): ReviewCardData[] {
  return reviews.map((r): ReviewCardData => ({
    id: r.id,
    author: r.customer?.name || 'Anonymous',
    authorId: r.customerId,
    avatar: r.customer?.photoURL || undefined,
    rating: r.rating,
    date: r.createdAt,
    title: r.title || '',
    content: r.comment,
  }))
}

/**
 * @param tourId Prefer passing the tour's real database id when available
 * (e.g. from useExpeditionTour's returned `id` field) — this lets the
 * fallback endpoint resolve reviews even when the curated lookup 404s.
 * Falls back to using `slug` for the fallback lookup if no id is provided.
 */
export function useExpeditionTourReviews(
  slug: string | undefined,
  page: number = 1,
  limit: number = 10,
  tourId?: string | undefined
) {
  return useQuery({
    queryKey: ['expedition', 'tours', slug, 'reviews', page, tourId],
    enabled: !!slug,
    queryFn: async () => {
      try {
        const payload = await expeditionFetchRaw(
          `/expedition/tours/${encodeURIComponent(slug!)}/reviews?page=${page}&limit=${limit}`
        )
        const data = payload.data ?? payload
        const reviews: ExpeditionReview[] = data.reviews ?? []
        return {
          reviews: mapReviewRecords(reviews),
          averageRating: data.averageRating ?? null,
          totalCount: data.totalCount ?? 0,
          pagination: payload.pagination ?? null,
        }
      } catch (e) {
        // Curated lookup failed (tour not in ExpeditionTour, i.e. not yet
        // curated onto the homepage) — fall back to the general public
        // reviews endpoint, which works for any tour by its real id.
        const idToUse = tourId || slug!
        const fallback = await fetchRawTourReviews(idToUse, page, limit)
        if (!fallback) throw e

        const reviews: ExpeditionReview[] = fallback.reviews ?? []
        const distribution = fallback.ratingDistribution as { rating: number; _count: number }[] | undefined
        let averageRating: number | null = null
        if (Array.isArray(distribution) && distribution.length > 0) {
          const totalCount = distribution.reduce((sum, d) => sum + d._count, 0)
          const weightedSum = distribution.reduce((sum, d) => sum + d.rating * d._count, 0)
          averageRating = totalCount > 0 ? Math.round((weightedSum / totalCount) * 10) / 10 : null
        }

        return {
          reviews: mapReviewRecords(reviews),
          averageRating,
          totalCount: fallback.pagination?.totalCount ?? reviews.length,
          pagination: fallback.pagination ?? null,
        }
      }
    },
  })
}

interface CreateReviewInput {
  bookingId: string
  rating: number
  title?: string
  comment: string
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      const base = getApiBaseUrl()
      const token = await getAuthToken()
      const res = await fetch(`${base}/expedition/reviews`, {
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
      return payload.data ?? payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expedition', 'tours'] })
      queryClient.invalidateQueries({ queryKey: ['expedition', 'bookings'] })
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
    },
  })
}

export interface MyReviewData {
  id: string
  bookingId: string
  tourId: string
  tourTitle: string
  tourSlug: string
  tourImage: string | null
  tourLocation: string
  rating: number
  title: string | null
  comment: string
  createdAt: string
  status: string
}

/**
 * Aggregates the current customer's own submitted reviews. There is no
 * dedicated "my reviews" listing endpoint on the backend, so this walks the
 * customer's bookings (which do carry a `review` relation on the detail
 * endpoint) and resolves the review for each one that has one.
 */
export function useMyReviews() {
  const bookingsQuery = useMyExpeditionBookings(1, undefined, 100)

  return useQuery({
    queryKey: ['my-reviews', bookingsQuery.data?.map((b) => b.id).join(',')],
    enabled: !!bookingsQuery.data,
    queryFn: async (): Promise<MyReviewData[]> => {
      const bookings = bookingsQuery.data || []
      const results = await Promise.all(
        bookings.map(async (b) => {
          try {
            const detailPayload = await expeditionFetchRaw(`/expedition/bookings/${encodeURIComponent(b.id)}`)
            const detail = (detailPayload.data ?? detailPayload)?.booking
            const review = detail?.review
            if (!review) return null
            return {
              id: review.id,
              bookingId: b.id,
              tourId: b.tourId,
              tourTitle: b.tourTitle,
              tourSlug: b.tourSlug,
              tourImage: b.tourImage,
              tourLocation: b.tourLocation,
              rating: review.rating,
              title: review.title || null,
              comment: review.comment || '',
              createdAt: review.createdAt,
              status: review.status,
            } as MyReviewData
          } catch {
            return null
          }
        })
      )
      return results.filter((r): r is MyReviewData => r !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },
  })
}

interface UpdateReviewInput {
  id: string
  rating?: number
  title?: string
  comment?: string
}

export function useUpdateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateReviewInput) => {
      const base = getApiBaseUrl()
      const token = await getAuthToken()
      const formData = new FormData()
      if (input.rating != null) formData.append('rating', String(input.rating))
      if (input.title != null) formData.append('title', input.title)
      if (input.comment != null) formData.append('comment', input.comment)

      const res = await fetch(`${base}/reviews/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.message || `Request failed (${res.status})`)
      return payload.data ?? payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
    },
  })
}

export function useDeleteReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const base = getApiBaseUrl()
      const token = await getAuthToken()
      const res = await fetch(`${base}/reviews/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok && res.status !== 204) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.message || `Request failed (${res.status})`)
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
    },
  })
}
