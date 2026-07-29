import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

interface ExpeditionReviewsResponse {
  reviews: ExpeditionReview[]
  averageRating: number | null
  totalCount: number
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPrevPage: boolean
    limit: number
  }
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

export function useExpeditionTourReviews(
  slug: string | undefined,
  page: number = 1,
  limit: number = 10
) {
  return useQuery({
    queryKey: ['expedition', 'tours', slug, 'reviews', page],
    enabled: !!slug,
    queryFn: async () => {
      const payload = await expeditionFetchRaw(
        `/expedition/tours/${encodeURIComponent(slug!)}/reviews?page=${page}&limit=${limit}`
      )
      const data = payload.data ?? payload
      const reviews: ExpeditionReview[] = data.reviews ?? []
      return {
        reviews: reviews.map((r): ReviewCardData => ({
          id: r.id,
          author: r.customer?.name || 'Anonymous',
          authorId: r.customerId,
          avatar: r.customer?.photoURL || undefined,
          rating: r.rating,
          date: r.createdAt,
          title: r.title || '',
          content: r.comment,
        })),
        averageRating: data.averageRating ?? null,
        totalCount: data.totalCount ?? 0,
        pagination: payload.pagination ?? null,
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
      const data = await apiFetch('/expedition/reviews', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expedition', 'tours'] })
    },
  })
}
