import { describe, it, expect, afterEach } from 'vitest'
import { TILE_STYLE, DEFAULT_CENTER, warmMapResources } from '../mapUtils'

describe('mapUtils TILE_STYLE', () => {
  afterEach(() => {
    document.querySelectorAll('link[rel="preconnect"]').forEach((l) => l.remove())
  })

  it('is an OSM raster style (version 8)', () => {
    expect(TILE_STYLE.version).toBe(8)
  })

  it('sources point at tile.openstreetmap.org raster tiles', () => {
    const osm = TILE_STYLE.sources.osm as { type?: string; tiles?: string[] }
    expect(osm.type).toBe('raster')
    expect(osm.tiles?.[0]).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
  })

  it('has a single raster layer over the osm source', () => {
    expect(TILE_STYLE.layers).toEqual([{ id: 'osm', type: 'raster', source: 'osm' }])
  })

  it('carries the OSM attribution (license requirement)', () => {
    const osm = TILE_STYLE.sources.osm as { attribution?: string }
    expect(osm.attribution).toContain('OpenStreetMap')
  })

  it('does not reference the broken OpenFreeMap provider', () => {
    expect(JSON.stringify(TILE_STYLE)).not.toContain('openfreemap')
  })

  it('DEFAULT_CENTER is Accra', () => {
    expect(DEFAULT_CENTER).toEqual([-0.187, 5.6037])
  })

  it('warmMapResources preconnects to the OSM tile host', () => {
    warmMapResources()
    const links = Array.from(document.querySelectorAll('link[rel="preconnect"]'))
    expect(links.some((l) => l.getAttribute('href') === 'https://tile.openstreetmap.org')).toBe(true)
  })
})
