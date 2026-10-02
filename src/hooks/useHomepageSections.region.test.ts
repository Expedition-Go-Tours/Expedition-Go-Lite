import { describe, it, expect } from 'vitest'
import { mapToTourCard, type HomepageTour } from './useHomepageSections'

/**
 * The homepage scopes itself to a clicked tour's region, so the card has to
 * carry that region out of the API response. `mapToTourCard` is the single
 * mapper every homepage section funnels through, which makes it the one place
 * worth guarding: if region is dropped here the feature is silently dead on
 * every section at once.
 *
 * Region is NOT derivable from `location`, which is built as `city, country`:
 * Tour.city is frequently a district or village (Bonwire, Dedenya, Kakumdo), so
 * the admin region has to travel as its own field.
 */

function homepageTour(overrides: Partial<HomepageTour> = {}): HomepageTour {
  return {
    id: 'tour-1',
    title: 'Cape Coast Castle Walking Tour',
    slug: 'cape-coast-castle-walking-tour',
    coverPhoto: null,
    photos: [],
    category: 'Culture',
    city: 'Cape Coast',
    country: 'Ghana',
    region: 'Central Region',
    averageRating: 4.8,
    reviewCount: 120,
    totalBookings: 40,
    startingPrice: 45,
    currency: 'USD',
    durationMinutes: 120,
    difficulty: 'Easy',
    tags: ['History'],
    supplier: null,
    ...overrides,
  }
}

describe('mapToTourCard region passthrough', () => {
  it('carries the region onto the card', () => {
    expect(mapToTourCard(homepageTour()).region).toBe('Central Region')
  })

  it('keeps city and region independent', () => {
    const card = mapToTourCard(homepageTour({ city: 'Kakumdo', region: 'Central Region' }))
    // `location` is the display string and stays city + country.
    expect(card.location).toBe('Kakumdo, Ghana')
    // The admin region is its own field, not derivable from that string.
    expect(card.region).toBe('Central Region')
  })

  it('normalizes a missing region to null', () => {
    // Cards without a region must not become `undefined`, so consumers can
    // test the field's presence rather than its value.
    const card = mapToTourCard(homepageTour({ region: null }))
    expect(card).toHaveProperty('region')
    expect(card.region).toBeNull()
  })

  it('leaves the other fields untouched', () => {
    const card = mapToTourCard(homepageTour())
    expect(card.id).toBe('tour-1')
    expect(card.slug).toBe('cape-coast-castle-walking-tour')
    expect(card.title).toBe('Cape Coast Castle Walking Tour')
    expect(card.price).toBe('$45')
  })

  it('preserves distinct regions for two different tours', () => {
    // Guards against a shared/hoisted value leaking between cards.
    expect(mapToTourCard(homepageTour({ region: 'Central Region' })).region).toBe('Central Region')
    expect(mapToTourCard(homepageTour({ region: 'Eastern Region' })).region).toBe('Eastern Region')
  })
})