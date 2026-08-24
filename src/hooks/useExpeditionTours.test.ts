import { describe, it, expect } from 'vitest'
import { extractItinerary, extractMeetingInfo, extractStartingPriceFromRaw } from './useExpeditionTours'

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

describe('extractStartingPriceFromRaw', () => {
  const natureEscape = {
    travelerDetails: {
      pricingModel: 'perPerson',
      pricingApproach: 'dependsOnAge',
      pricingCategories: [
        { name: 'Child', price: 200, tiers: [] },
        { name: 'Adult', price: 300, tiers: [] },
        { name: 'Senior', price: 350, tiers: [] },
      ],
    },
    pricingSchedules: {
      currency: 'USD',
      schedules: [
        {
          name: 'Time',
          type: 'operatingHours',
          prices: [
            { ageGroup: 'Child', retailPrice: 200 },
            { ageGroup: 'Adult', retailPrice: 300 },
            { ageGroup: 'Senior', retailPrice: 350 },
          ],
          pricingCategories: [
            { name: 'Child', price: 200 },
            { name: 'Adult', price: 300 },
            { name: 'Senior', price: 350 },
          ],
        },
      ],
    },
  }

  it('returns the adult price when it is not the first schedule entry', () => {
    expect(extractStartingPriceFromRaw(natureEscape)).toBe(300)
  })

  it('returns the adult price even when the schedule rows lack an adult entry (senior first)', () => {
    // A supplier mid-edit can leave the schedule without the adult row while
    // travelerDetails.pricingCategories (authoritative) still carries it. The
    // extractor must not fall back to the first schedule row (Senior 350).
    const seniorFirst = {
      ...natureEscape,
      pricingSchedules: {
        currency: 'USD',
        schedules: [
          {
            name: 'Time',
            type: 'operatingHours',
            prices: [
              { ageGroup: 'Senior', retailPrice: 350 },
              { ageGroup: 'Child', retailPrice: 200 },
            ],
            pricingCategories: [],
          },
        ],
      },
    }
    expect(extractStartingPriceFromRaw(seniorFirst)).toBe(300)
  })

  it('falls back to the adult category price when the adult retailPrice is null', () => {
    const nullAdultRetail = {
      ...natureEscape,
      pricingSchedules: {
        currency: 'USD',
        schedules: [
          {
            name: 'Time',
            type: 'operatingHours',
            prices: [
              { ageGroup: 'Child', retailPrice: 200 },
              { ageGroup: 'Adult', retailPrice: null },
              { ageGroup: 'Senior', retailPrice: 350 },
            ],
            pricingCategories: [
              { name: 'Child', price: 200 },
              { name: 'Adult', price: 300 },
              { name: 'Senior', price: 350 },
            ],
          },
        ],
      },
    }
    expect(extractStartingPriceFromRaw(nullAdultRetail)).toBe(300)
  })

  it('matches adult labels regardless of case or surrounding whitespace', () => {
    const messyLabels = {
      ...natureEscape,
      pricingSchedules: {
        currency: 'USD',
        schedules: [
          {
            name: 'Time',
            type: 'operatingHours',
            prices: [
              { ageGroup: ' Child ', retailPrice: 200 },
              { ageGroup: ' ADULT ', retailPrice: 300 },
              { ageGroup: 'Senior', retailPrice: 350 },
            ],
            pricingCategories: [],
          },
        ],
      },
    }
    expect(extractStartingPriceFromRaw(messyLabels)).toBe(300)
  })

  it('keeps the first-entry fallback when no adult category exists anywhere', () => {
    const noAdult = {
      travelerDetails: {
        pricingModel: 'perPerson',
        pricingApproach: 'dependsOnAge',
        pricingCategories: [
          { name: 'Senior', price: 350 },
          { name: 'Child', price: 200 },
        ],
      },
      pricingSchedules: {
        currency: 'USD',
        schedules: [
          {
            name: 'Time',
            type: 'operatingHours',
            prices: [
              { ageGroup: 'Senior', retailPrice: 350 },
              { ageGroup: 'Child', retailPrice: 200 },
            ],
            pricingCategories: [],
          },
        ],
      },
    }
    expect(extractStartingPriceFromRaw(noAdult)).toBe(350)
  })

  it('returns the uniform price for sameForEveryone tours', () => {
    const uniform = {
      travelerDetails: { pricingModel: 'perPerson', pricingApproach: 'sameForEveryone', uniformPrice: 120 },
      pricingSchedules: {
        currency: 'USD',
        schedules: [{ name: 'Time', type: 'operatingHours', prices: [], pricingCategories: [] }],
      },
    }
    expect(extractStartingPriceFromRaw(uniform)).toBe(120)
  })

  it('accepts a JSON-string payload and returns null for empty input', () => {
    expect(extractStartingPriceFromRaw(JSON.stringify(natureEscape))).toBe(300)
    expect(extractStartingPriceFromRaw(null)).toBeNull()
    expect(extractStartingPriceFromRaw({})).toBeNull()
  })
})