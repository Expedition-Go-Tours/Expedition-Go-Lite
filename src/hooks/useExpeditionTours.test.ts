import { describe, it, expect } from 'vitest'
import { extractItinerary, extractMeetingInfo } from './useExpeditionTours'

function tourWith(productContent: unknown): any {
  return {
    productContent:
      typeof productContent === 'string'
        ? productContent
        : JSON.stringify(productContent),
  }
}

describe('extractItinerary', () => {
  it('prefers modern productContent.locations over a stale legacy itinerary', () => {
    // The Kumasi Tour Experience shape: correct single-day `locations` plus a
    // leftover legacy free-form itinerary whose day structure ("Day 1"/"Day 2")
    // lives only in the title text.
    const kumasi = tourWith({
      locations: [
        { name: 'Manhyia Palace', city: 'Kumasi', country: 'Ghana', day: 1, timeSpent: 1, timeSpentUnit: 'hours', admissionIncluded: 'yes' },
        { name: 'Okomfo Anokye Sword Site', city: 'Kumasi', day: 1, timeSpent: 1, timeSpentUnit: 'hours' },
        { name: 'Kejetia Market', city: 'Kumasi', day: 1, timeSpent: 1, timeSpentUnit: 'hours', admissionIncluded: 'no' },
      ],
      itinerary: [
        { title: 'Day 1', description: 'Royal Heritage & Bustling City Markets' },
        { title: '9:00 AM - Okomfo Anokye Sword Site', description: 'Visit the sacred sword' },
        { title: 'Day 2', description: 'Artisanal Craft Villages & Nature' },
        { title: '9:00 AM - Bonwire Kente Village', description: 'Weaving demonstrations' },
      ],
    })

    const stops = extractItinerary(kumasi)
    expect(stops).toHaveLength(3)
    expect(stops.map((s) => s.title)).toEqual(['Manhyia Palace', 'Okomfo Anokye Sword Site', 'Kejetia Market'])
    expect(stops.every((s) => s.day === 1)).toBe(true)
    expect(stops.some((s) => /^Day \d/.test(s.title))).toBe(false)
    expect(stops[0].locationCity).toBe('Kumasi')
    expect(stops[0].locationCountry).toBe('Ghana')
    expect(stops[0].durationUnit).toBe('hour')
    expect(stops[0].admissionIncluded).toBe('yes')
    expect(stops[2].admissionIncluded).toBe('no')
  })

  it('falls back to the legacy itinerary for tours without locations', () => {
    const legacyOnly = tourWith({
      locations: [],
      itinerary: [
        { title: 'Day 1', description: 'Old free-form day' },
        { title: '9:00 AM - Some Place', description: 'Description' },
      ],
    })

    const stops = extractItinerary(legacyOnly)
    expect(stops.map((s) => s.title)).toEqual(['Day 1', '9:00 AM - Some Place'])
  })

  it('falls through to the legacy itinerary when locations carry no identifiable stops', () => {
    const blankLocations = tourWith({
      locations: [{ city: '' }, {}],
      itinerary: [{ title: 'Day 1', description: 'legacy' }],
    })

    const stops = extractItinerary(blankLocations)
    expect(stops).toHaveLength(1)
    expect(stops[0].title).toBe('Day 1')
  })

  it('returns an empty array when there is no itinerary data at all', () => {
    expect(extractItinerary(tourWith({}))).toEqual([])
    expect(extractItinerary(null)).toEqual([])
  })
})

describe('extractMeetingInfo pickup precedence', () => {
  const AREA = { name: 'Oasis Park Residences, 15', lat: 5.626746, lng: -0.169995, radiusKm: 15 }
  const LOCATIONS = [
    { name: 'Accra Mall, Airport Bypass', lat: 5.6221843, lng: -0.1729361 },
    { name: 'China Mall, Spintex Road', lat: 5.6391942, lng: -0.1244027 },
    { name: 'Embassy Gardens, Ghana', lat: 5.5850113, lng: -0.1675345 },
  ]

  it('pickupType address keeps the multiple locations and drops the stale area', () => {
    // Real cape-coast / accra-full-day shape: the supplier's Step-13 toggle is
    // 'address' (specific pickup points), but a leftover area lingers in the
    // saved blob. The locations must win or the multi-point flow never shows.
    const info = extractMeetingInfo({
      productContent: JSON.stringify({
        pickupType: 'address',
        meetingMode: 'pickup',
        pickupAreas: [AREA],
        pickupLocations: LOCATIONS,
      }),
    })
    expect(info.pickupType).toBe('address')
    expect(info.pickupAreas).toEqual([])
    expect(info.pickupLocations).toHaveLength(3)
  })

  it('pickupType area keeps the areas and drops leftover locations', () => {
    const info = extractMeetingInfo({
      productContent: JSON.stringify({
        pickupType: 'area',
        meetingMode: 'pickup',
        pickupAreas: [AREA],
        pickupLocations: LOCATIONS,
      }),
    })
    expect(info.pickupType).toBe('area')
    expect(info.pickupAreas).toEqual([AREA])
    expect(info.pickupLocations).toEqual([])
  })

  it('legacy tours without pickupType default to areas when present', () => {
    const info = extractMeetingInfo({
      productContent: JSON.stringify({
        meetingMode: 'pickup',
        pickupAreas: [AREA],
        pickupLocations: LOCATIONS,
      }),
    })
    expect(info.pickupType).toBe('area')
    expect(info.pickupAreas).toHaveLength(1)
    expect(info.pickupLocations).toEqual([])
  })

  it('legacy tours with only locations report address mode', () => {
    const info = extractMeetingInfo({
      productContent: JSON.stringify({
        meetingMode: 'pickup',
        pickupLocations: LOCATIONS,
      }),
    })
    expect(info.pickupType).toBe('address')
    expect(info.pickupAreas).toEqual([])
    expect(info.pickupLocations).toHaveLength(3)
  })

  it('bookingAndTickets wins over productContent when both blobs exist', () => {
    const info = extractMeetingInfo({
      productContent: JSON.stringify({
        pickupType: 'area',
        pickupAreas: [AREA],
        pickupLocations: [],
      }),
      bookingAndTickets: JSON.stringify({
        pickupType: 'address',
        pickupAreas: [AREA],
        pickupLocations: LOCATIONS,
      }),
    })
    expect(info.pickupType).toBe('address')
    expect(info.pickupAreas).toEqual([])
    expect(info.pickupLocations).toHaveLength(3)
  })
})