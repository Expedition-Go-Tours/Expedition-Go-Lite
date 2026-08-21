import { describe, it, expect, afterEach } from 'vitest'
import {
  DEFAULT_CENTER, TILE_STYLE, toNumber, warmMapResources,
} from '../mapUtils'

describe('mapUtils tile style', () => {
  it('uses the OpenFreeMap Liberty style (keyless, matches the supplier platform)', () => {
    expect(TILE_STYLE).toBe('https://tiles.openfreemap.org/styles/liberty')
  })

  it('warmMapResources preconnects to the OpenFreeMap tile host', () => {
    warmMapResources()
    const links = Array.from(document.querySelectorAll('link[rel="preconnect"]'))
    const hosts = links.map((l) => l.getAttribute('href'))
    expect(hosts).toContain('https://tiles.openfreemap.org')
  })
})

describe('mapUtils misc', () => {
  afterEach(() => {
    document.querySelectorAll('link[rel="preconnect"]').forEach((l) => l.remove())
  })

  it('DEFAULT_CENTER is Accra', () => {
    expect(DEFAULT_CENTER).toEqual([-0.187, 5.6037])
  })
})

describe('mapUtils toNumber', () => {
  it('parses numeric values', () => {
    expect(toNumber(5.62)).toBe(5.62)
    expect(toNumber('5.62')).toBe(5.62)
    expect(toNumber(0)).toBe(0)
  })

  it('rejects nullish/empty inputs instead of coercing to 0', () => {
    // Number(null) === 0 — a phantom (0, 0) pin used to break the maps.
    expect(toNumber(null)).toBeNull()
    expect(toNumber(undefined)).toBeNull()
    expect(toNumber('')).toBeNull()
  })

  it('rejects non-finite values', () => {
    expect(toNumber('abc')).toBeNull()
    expect(toNumber(NaN)).toBeNull()
    expect(toNumber(Infinity)).toBeNull()
  })
})
