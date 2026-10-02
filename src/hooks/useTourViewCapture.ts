import { useCallback } from 'react'
import {
  useContinuePlanning,
  toContinuePlanningItem,
} from '../context/ContinuePlanningContext'
import type { Tour, MultiDayTour } from '../components/data'

/** Card props accepted here — `toContinuePlanningItem` reads `slug` too. */
export type TourViewSnapshot = (Tour | (MultiDayTour & { days?: string })) & { slug?: string }

/**
 * Record a tour view into Continue Planning at click time.
 *
 * Tour cards hand off to the Travio Ghana detail page — a different origin
 * (`TOUR_SITE`) — so nothing on this site would otherwise learn that the tour
 * was opened: that page cannot write this origin's storage, and no storage or
 * BroadcastChannel message can cross the origin boundary. Capturing on click
 * puts the tour on the homepage rail even if the visitor closes the new tab
 * immediately, and still dedupes by slug/id if the same tour is later viewed
 * through an Expedition detail route.
 */
export function useTourViewCapture() {
  const { addToContinuePlanning } = useContinuePlanning()

  return useCallback(
    (tour: TourViewSnapshot) => {
      addToContinuePlanning(toContinuePlanningItem(tour))
    },
    [addToContinuePlanning],
  )
}
