import { apiFetch } from './api'

/** Trust facts for a tour, derived from real bookings and verified reviews. */
export interface TourTrust {
  /** Approved reviews linked to an actual booking. Null below the sample size. */
  verifiedReviewCount: number | null
  totalReviewCount: number
  /** Placed in the last 7 days. Null below the sample size. */
  bookingsLast7Days: number | null
  averageRating: number | null
}

/**
 * Trust facts for a tour page. Returns null rather than throwing: this is
 * decoration next to the price, and a failed request must never break the page.
 */
export async function fetchTourTrust(tourId: string): Promise<TourTrust | null> {
  if (!tourId) return null
  try {
    return await apiFetch<TourTrust>(`/travioghana/tours/${encodeURIComponent(tourId)}/trust`)
  } catch {
    return null
  }
}
