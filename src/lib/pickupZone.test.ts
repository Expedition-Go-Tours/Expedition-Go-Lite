import { describe, it, expect } from 'vitest'
import {
  pointInPolygon,
  distanceMeters,
  findPickupAreaForAddress,
  pickupZoneStatus,
  hasDrawnShape,
  type PickupAreaShape,
} from './pickupZone'

// A simple square zone around Accra's Osu neighbourhood.
const OSU_SQUARE: [number, number][] = [
  [5.55, -0.2],
  [5.57, -0.2],
  [5.57, -0.17],
  [5.55, -0.17],
]

const AREA_OSU: PickupAreaShape = {
  name: 'Osu',
  time: '0-30',
  polygon: OSU_SQUARE,
}

const EXCLUDED_INSIDE: [number, number][] = [
  [5.555, -0.19],
  [5.565, -0.19],
  [5.565, -0.18],
  [5.555, -0.18],
]

const AREA_OSU_WITH_EXCLUSION: PickupAreaShape = {
  name: 'Osu',
  time: '0-30',
  polygon: OSU_SQUARE,
  exclusions: [EXCLUDED_INSIDE],
}

describe('pointInPolygon', () => {
  it('returns true inside the polygon', () => {
    expect(pointInPolygon(5.56, -0.185, OSU_SQUARE)).toBe(true)
  })

  it('returns false outside the polygon', () => {
    expect(pointInPolygon(5.60, -0.185, OSU_SQUARE)).toBe(false)
  })

  it('returns false for degenerate polygons', () => {
    expect(pointInPolygon(5.56, -0.185, [])).toBe(false)
    expect(pointInPolygon(5.56, -0.185, [[5.55, -0.2], [5.57, -0.2]])).toBe(false)
    expect(pointInPolygon(5.56, -0.185, null as unknown as [number, number][])).toBe(false)
  })
})

describe('distanceMeters', () => {
  it('is ~0 for identical points', () => {
    expect(distanceMeters(5.56, -0.185, 5.56, -0.185)).toBeLessThan(0.001)
  })

  it('matches the known Accra-to-Kumasi distance (~199 km)', () => {
    const d = distanceMeters(5.6037, -0.187, 6.6871, -1.6219)
    expect(d).toBeGreaterThan(198_000)
    expect(d).toBeLessThan(201_000)
  })
})

describe('findPickupAreaForAddress', () => {
  it('matches an address inside the zone', () => {
    const match = findPickupAreaForAddress({ lat: 5.56, lng: -0.185 }, [AREA_OSU])
    expect(match).not.toBeNull()
    expect(match?.name).toBe('Osu')
    expect(match?._excluded).toBeUndefined()
  })

  it('returns null for an address outside every zone', () => {
    expect(findPickupAreaForAddress({ lat: 5.60, lng: -0.185 }, [AREA_OSU])).toBeNull()
  })

  it('flags the area when the address sits in an exclusion zone', () => {
    const match = findPickupAreaForAddress({ lat: 5.56, lng: -0.185 }, [AREA_OSU_WITH_EXCLUSION])
    expect(match?._excluded).toBe(true)
  })

  it('returns null when the address has no coordinates', () => {
    expect(findPickupAreaForAddress({ lat: NaN, lng: 0 }, [AREA_OSU])).toBeNull()
    expect(findPickupAreaForAddress(null as unknown as { lat: number; lng: number }, [AREA_OSU])).toBeNull()
  })

  it('first matching area in array order wins on overlap', () => {
    const second: PickupAreaShape = { name: 'Later', polygon: OSU_SQUARE }
    const first: PickupAreaShape = { name: 'First', polygon: OSU_SQUARE }
    const match = findPickupAreaForAddress({ lat: 5.56, lng: -0.185 }, [first, second])
    expect(match?.name).toBe('First')
  })

  it('falls back to legacy name matching for areas without a drawn shape', () => {
    const legacy: PickupAreaShape = { name: 'Cantonments', time: '0-15' }
    const match = findPickupAreaForAddress({ lat: 5.56, lng: -0.185, name: 'Cantonments' }, [legacy])
    expect(match?.name).toBe('Cantonments')
  })

  it('matches a location-only area by proximity to its saved point', () => {
    const pointArea: PickupAreaShape = { name: 'Kumasi', lat: 6.6871, lng: -1.6219 }
    const match = findPickupAreaForAddress({ lat: 6.6971, lng: -1.6219, name: 'Some Rd' }, [pointArea])
    expect(match?.name).toBe('Kumasi')
  })

  it('does not match a location-only area beyond the radius', () => {
    const pointArea: PickupAreaShape = { name: 'Kumasi', lat: 6.6871, lng: -1.6219 }
    expect(findPickupAreaForAddress({ lat: 6.0, lng: -1.6219, name: 'Some Rd' }, [pointArea])).toBeNull()
  })

  it('exact name still matches a location-only area beyond the radius', () => {
    const pointArea: PickupAreaShape = { name: 'Kumasi', lat: 6.6871, lng: -1.6219 }
    const match = findPickupAreaForAddress({ lat: 6.0, lng: -1.6219, name: 'Kumasi' }, [pointArea])
    expect(match?.name).toBe('Kumasi')
  })

  it('legacy name fallback never matches a name inside a drawn shape', () => {
    const match = findPickupAreaForAddress({ lat: 5.56, lng: -0.185, name: 'Osu' }, [AREA_OSU])
    expect(match?.name).toBe('Osu')
    const outside = findPickupAreaForAddress({ lat: 5.60, lng: -0.19, name: 'Osu' }, [AREA_OSU])
    expect(outside).toBeNull()
  })
})

describe('pickupZoneStatus', () => {
  it('is in_area for a covered address', () => {
    expect(pickupZoneStatus({ lat: 5.56, lng: -0.185 }, [AREA_OSU])).toBe('in_area')
  })

  it('is excluded for an excluded address', () => {
    expect(pickupZoneStatus({ lat: 5.56, lng: -0.185 }, [AREA_OSU_WITH_EXCLUSION])).toBe('excluded')
  })

  it('is outside for an uncovered address', () => {
    expect(pickupZoneStatus({ lat: 5.60, lng: -0.185 }, [AREA_OSU])).toBe('outside')
  })

  it('is no_coords when coordinates are missing', () => {
    expect(pickupZoneStatus({ lat: null, lng: null }, [AREA_OSU])).toBe('no_coords')
    expect(pickupZoneStatus(null, [AREA_OSU])).toBe('no_coords')
    expect(pickupZoneStatus(undefined, [AREA_OSU])).toBe('no_coords')
  })

  it('is no_zones when there are no pickup areas at all', () => {
    expect(pickupZoneStatus({ lat: 5.56, lng: -0.185 }, [])).toBe('no_zones')
  })

  it('is in_area for a location-only area within the radius', () => {
    const pointArea: PickupAreaShape = { name: 'Kumasi', lat: 6.6871, lng: -1.6219 }
    expect(pickupZoneStatus({ lat: 6.6971, lng: -1.6219 }, [pointArea])).toBe('in_area')
  })

  it('is outside for a location-only area beyond the radius', () => {
    const pointArea: PickupAreaShape = { name: 'Kumasi', lat: 6.6871, lng: -1.6219 }
    expect(pickupZoneStatus({ lat: 6.0, lng: -1.6219 }, [pointArea])).toBe('outside')
  })
})

describe('hasDrawnShape', () => {
  it('requires at least 3 vertices', () => {
    expect(hasDrawnShape(AREA_OSU)).toBe(true)
    expect(hasDrawnShape({ name: 'x' })).toBe(false)
    expect(hasDrawnShape({ polygon: [[1, 1], [2, 2]] })).toBe(false)
    expect(hasDrawnShape({ polygon: null })).toBe(false)
  })
})