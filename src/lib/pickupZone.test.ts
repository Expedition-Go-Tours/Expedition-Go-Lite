import { describe, it, expect } from 'vitest'
import {
  pointInPolygon,
  distanceMeters,
  findPickupAreaForAddress,
  pickupZoneStatus,
  hasDrawnShape,
  hasLocationOnlyAreas,
  isPickupLocationSatisfied,
  circleRing,
  pickupZoneRings,
  LOCATION_AREA_RADIUS_M,
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

describe('circleRing', () => {
  const CENTER = { lat: 5.55, lng: -0.2 }
  const ring = circleRing(CENTER.lat, CENTER.lng, LOCATION_AREA_RADIUS_M)

  it('returns a closed ring with the requested number of segments', () => {
    expect(ring).toHaveLength(65)
    expect(ring[0]).toEqual(ring[ring.length - 1])
    expect(ring.every((v) => v.length === 2 && v.every((n) => Number.isFinite(n)))).toBe(true)
  })

  it('keeps the centre inside the ring and points near the edge on the correct side', () => {
    expect(pointInPolygon(CENTER.lat, CENTER.lng, ring)).toBe(true)
    // ~4.5 km north of the centre — inside the 5 km radius.
    expect(pointInPolygon(CENTER.lat + 4500 / 6371000 * (180 / Math.PI), CENTER.lng, ring)).toBe(true)
    // ~5.5 km north of the centre — outside the 5 km radius.
    expect(pointInPolygon(CENTER.lat + 5500 / 6371000 * (180 / Math.PI), CENTER.lng, ring)).toBe(false)
  })

  it('places every vertex at the haversine radius from the centre', () => {
    for (const [lat, lng] of ring) {
      const d = distanceMeters(CENTER.lat, CENTER.lng, lat, lng)
      expect(d).toBeGreaterThan(LOCATION_AREA_RADIUS_M - 100)
      expect(d).toBeLessThan(LOCATION_AREA_RADIUS_M + 100)
    }
  })
})

describe('pickupZoneRings', () => {
  it('returns drawn polygons unchanged', () => {
    const rings = pickupZoneRings([AREA_OSU])
    expect(rings).toHaveLength(1)
    expect(rings[0]).toEqual(OSU_SQUARE)
  })

  it('adds a radius circle when a location-only area is the only pickup location', () => {
    const rings = pickupZoneRings([{ name: 'Kumasi', lat: 6.6871, lng: -1.6219 }])
    expect(rings).toHaveLength(1)
    expect(rings[0]).toHaveLength(65)
    expect(pointInPolygon(6.6871, -1.6219, rings[0])).toBe(true)
  })

  it('skips the circle when the tour has more than one pickup location', () => {
    // Two location-only areas → the green pins represent each spot, no blobs.
    const rings = pickupZoneRings([
      { name: 'Kumasi', lat: 6.6871, lng: -1.6219 },
      { name: 'Accra', lat: 5.6037, lng: -0.187 },
    ])
    expect(rings).toHaveLength(0)
    // A drawn zone plus a location-only area → only the drawn polygon renders.
    const mixed = pickupZoneRings([AREA_OSU, { name: 'Kumasi', lat: 6.6871, lng: -1.6219 }])
    expect(mixed).toHaveLength(1)
    expect(mixed[0]).toEqual(OSU_SQUARE)
  })

  it('skips the circle when separate pickup locations exist alongside the area', () => {
    // E.g. the Accra Full Day Tour: one location-only area + one pickup
    // location → two pickup spots total, so no geofence blob.
    const rings = pickupZoneRings([{ name: 'Accra Mall, Tetteh Quarshie Road', lat: 5.6221843, lng: -0.1729361 }], 1)
    expect(rings).toHaveLength(0)
    // Same area with NO separate locations → the single-spot circle stays.
    const single = pickupZoneRings([{ name: 'Accra Mall, Tetteh Quarshie Road', lat: 5.6221843, lng: -0.1729361 }], 0)
    expect(single).toHaveLength(1)
  })

  it('skips areas without coordinates or a drawn shape, and null entries', () => {
    expect(pickupZoneRings([{ name: 'Legacy' }])).toHaveLength(0)
    expect(pickupZoneRings([null, undefined])).toHaveLength(0)
    expect(pickupZoneRings([{ name: 'NoCoords', lat: null, lng: null }])).toHaveLength(0)
    expect(pickupZoneRings([])).toHaveLength(0)
    expect(pickupZoneRings(undefined)).toHaveLength(0)
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

describe('hasLocationOnlyAreas', () => {
  it('is true when an area has no drawn shape but finite coordinates', () => {
    expect(hasLocationOnlyAreas([{ name: 'Kumasi', lat: 6.6871, lng: -1.6219 }])).toBe(true)
  })

  it('is false for drawn-zone areas, name-only areas, and empty lists', () => {
    expect(hasLocationOnlyAreas([AREA_OSU])).toBe(false)
    expect(hasLocationOnlyAreas([{ name: 'Legacy' }])).toBe(false)
    expect(hasLocationOnlyAreas([{ name: 'NoCoords', lat: null, lng: null }])).toBe(false)
    expect(hasLocationOnlyAreas([])).toBe(false)
  })
})

describe('isPickupLocationSatisfied', () => {
  const satisfied = (over: Partial<Parameters<typeof isPickupLocationSatisfied>[0]> = {}) =>
    isPickupLocationSatisfied({
      pickupLater: false,
      pickedArea: '',
      typed: '',
      status: 'no_coords',
      zonesDrawn: false,
      hasLocationOnlyAreas: false,
      ...over,
    })

  it('is satisfied when the traveller defers pickup or picks a zone', () => {
    expect(satisfied({ pickupLater: true })).toBe(true)
    expect(satisfied({ pickedArea: 'Osu' })).toBe(true)
  })

  it('is satisfied when the address resolves inside an area', () => {
    expect(satisfied({ status: 'in_area' })).toBe(true)
  })

  it('blocks a typed address outside the area when location-only areas exist', () => {
    expect(satisfied({ typed: 'Ejisu', status: 'outside', hasLocationOnlyAreas: true })).toBe(false)
  })

  it('accepts a typed address in a location-only area by proximity or exact name', () => {
    expect(satisfied({ typed: 'Kumasi', status: 'in_area', hasLocationOnlyAreas: true })).toBe(true)
  })

  it('keeps the legacy 3-character rule when the tour has no geographic data', () => {
    expect(satisfied({ typed: 'xyz', status: 'outside' })).toBe(true)
    expect(satisfied({ typed: 'xy', status: 'outside' })).toBe(false)
  })

  it('never accepts short typed text when geofenced', () => {
    expect(satisfied({ typed: 'xy', status: 'outside', zonesDrawn: true })).toBe(false)
    expect(satisfied({ typed: 'xy', status: 'outside', hasLocationOnlyAreas: true })).toBe(false)
  })
})