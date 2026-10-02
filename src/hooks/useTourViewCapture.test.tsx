import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { useEffect } from 'react'
import {
  ContinuePlanningProvider,
  useContinuePlanning,
} from '../context/ContinuePlanningContext'
import { resetPendingWrites } from '../lib/consentGatedStorage'
import { clearConsent } from '../lib/cookieConsent'
import { useTourViewCapture } from './useTourViewCapture'
import type { Tour, MultiDayTour } from '../components/data'

/**
 * Tour detail pages live on Travio Ghana, a different origin, so the click
 * that hands off is the only chance this site has to record the view. These
 * tests pin the snapshot → Continue Planning item mapping at that moment.
 */

let api: ReturnType<typeof useContinuePlanning> | null = null
let capture: ReturnType<typeof useTourViewCapture> | null = null

function Capture() {
  const value = useContinuePlanning()
  const remember = useTourViewCapture()
  useEffect(() => {
    api = value
    capture = remember
  }, [value, remember])
  return null
}

function setup() {
  render(
    <ContinuePlanningProvider>
      <Capture />
    </ContinuePlanningProvider>,
  )
}

const dayTour: Tour & { slug?: string } = {
  id: 'tour-a',
  title: 'Accra City Tour',
  category: 'Day Tour',
  duration: '8 hours',
  features: 'Guide included · Lunch included',
  price: '$120',
  rating: '4.8',
  reviews: 42,
  location: 'Accra, Ghana',
  image: 'https://example.com/a.jpg',
  photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  slug: 'accra-city-tour',
  source: 'expedition-go',
}

beforeEach(() => {
  clearConsent()
  window.localStorage.clear()
  resetPendingWrites()
  api = null
  capture = null
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useTourViewCapture', () => {
  it('records the clicked tour as a Continue Planning item', () => {
    setup()

    act(() => {
      capture!(dayTour)
    })

    expect(api!.continuePlanning).toHaveLength(1)
    expect(api!.continuePlanning[0]).toMatchObject({
      id: 'tour-a',
      tourId: 'tour-a',
      slug: 'accra-city-tour',
      title: 'Accra City Tour',
      location: 'Accra, Ghana',
      price: 120,
      duration: '8 hours',
      imageUrl: 'https://example.com/a.jpg',
      photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      rating: 4.8,
      reviewCount: 42,
    })
  })

  it('accepts multi-day tours (days become the duration)', () => {
    setup()

    act(() => {
      capture!({
        id: 'tour-multi',
        title: 'Northern Ghana Safari',
        days: '5 days',
        accommodation: 'Lodge & Camping',
        highlights: 'Mole Park · Larabanga Mosque',
        price: '$520',
        rating: '4.9',
        reviews: 28,
        location: 'Northern Region, Ghana',
        image: 'https://example.com/safari.jpg',
      } as MultiDayTour)
    })

    expect(api!.continuePlanning).toHaveLength(1)
    expect(api!.continuePlanning[0]).toMatchObject({
      id: 'tour-multi',
      tourId: 'tour-multi',
      duration: '5 days',
      features: 'Mole Park · Larabanga Mosque',
      price: 520,
    })
  })

  it('moves a re-clicked tour to the front without duplicating it', () => {
    setup()

    act(() => {
      capture!(dayTour)
    })
    act(() => {
      capture!({ ...dayTour, id: 'tour-b', slug: 'beta-tour', title: 'Beta Tour' })
    })
    act(() => {
      capture!(dayTour)
    })

    expect(api!.continuePlanning.map((i) => i.tourId)).toEqual(['tour-a', 'tour-b'])
  })
})
