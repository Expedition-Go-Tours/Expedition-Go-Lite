import { describe, it, expect } from 'vitest'
import { buildTourLink, matchDestination, STATIC_DESTINATIONS } from './reviewTourLink'

const AVAILABLE = [
  'Accra',
  'Cape Coast',
  'Kumasi',
  'Eastern Region',
  'Greater Accra',
  'Volta Region',
  'Elmina',
  'Kakum',
  'Northern Region',
]

describe('matchDestination', () => {
  it('maps each real external review title to a local destination', () => {
    expect(matchDestination('Cape Coast Castle, Elmina Castle & Kakum National Park Day Tour', AVAILABLE)).toBe('Cape Coast')
    expect(matchDestination('Accra Guided City Tour: Cultural and Historical Experience', AVAILABLE)).toBe('Accra')
    expect(matchDestination('Shai Hills Safari & Akosombo Boat Cruise Day Tour', AVAILABLE)).toBe('Greater Accra')
    expect(matchDestination('From Accra: The Cape Coast Day Tour Guided Experience', AVAILABLE)).toBe('Cape Coast')
    expect(matchDestination('Accra Guided City Tour Experience', AVAILABLE)).toBe('Accra')
    expect(matchDestination('Accra Mini Safari, Rock Climbing, Museum & Boat Cruise Tour', AVAILABLE)).toBe('Accra')
    expect(matchDestination('Kotoka Domestic Airport Transfer with Mini Accra City Tour', AVAILABLE)).toBe('Accra')
    expect(matchDestination('Accra Sankofa Gallery Art Tour & Candle Making Workshop', AVAILABLE)).toBe('Accra')
  })

  it('prefers the specific attraction over the generic city in the title', () => {
    expect(matchDestination('From Accra: Waterfalls, Aburi Gardens & Cocoa Farm Day Tour', AVAILABLE)).toBe('Eastern Region')
    expect(matchDestination('Boti Falls, Umbrella Rock, Aburi Gardens & Cocoa Farm Tour', AVAILABLE)).toBe('Eastern Region')
  })

  it('falls through to a lower-priority destination when the best one is unavailable', () => {
    expect(matchDestination('From Accra: Waterfalls, Aburi Gardens & Cocoa Farm Day Tour', ['Accra'])).toBe('Accra')
  })

  it('matches destinations that carry a region/country suffix', () => {
    expect(matchDestination('Cape Coast Castle, Elmina Castle & Kakum National Park Day Tour', ['Cape Coast, Ghana'])).toBe('Cape Coast, Ghana')
  })

  it('returns null when nothing local applies', () => {
    expect(matchDestination('Boti Falls, Umbrella Rock, Aburi Gardens & Cocoa Farm Tour', ['Accra'])).toBeNull()
    expect(matchDestination('Expedition-Go Tours LTD', AVAILABLE)).toBeNull()
  })
})

describe('buildTourLink', () => {
  it('builds an encoded local tours link', () => {
    expect(buildTourLink('Cape Coast')).toBe('/tours?location=Cape%20Coast')
  })

  it('falls back to all local tours when no destination resolves', () => {
    expect(buildTourLink(null)).toBe('/tours')
  })
})

describe('STATIC_DESTINATIONS', () => {
  it('derives destination names without the Ghana suffix', () => {
    expect(STATIC_DESTINATIONS).toContain('Accra')
    expect(STATIC_DESTINATIONS).toContain('Cape Coast')
    expect(STATIC_DESTINATIONS).not.toContain('Accra, Ghana')
  })
})
