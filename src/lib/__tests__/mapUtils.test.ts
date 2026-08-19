import { describe, it, expect, afterEach } from 'vitest'
import {
  TILE_PROVIDERS, buildTileStyle, isSolidTile, probeTileProvider, resetTileProviderCache,
  resolveTileProvider, tileVariance, DEFAULT_CENTER, warmMapResources, toNumber,
} from '../mapUtils'

describe('mapUtils tile providers', () => {
  afterEach(() => {
    resetTileProviderCache()
    document.querySelectorAll('link[rel="preconnect"]').forEach((l) => l.remove())
  })

  it('builds a version-8 raster style with a single layer', () => {
    const style = buildTileStyle(TILE_PROVIDERS[0])
    expect(style.version).toBe(8)
    expect(style.layers).toEqual([{ id: 'tiles', type: 'raster', source: 'tiles' }])
  })

  it('points the style at the provider tile template with attribution', () => {
    const style = buildTileStyle(TILE_PROVIDERS[0])
    const src = style.sources.tiles as { type?: string; tiles?: string[]; attribution?: string }
    expect(src.type).toBe('raster')
    expect(src.tiles?.[0]).toBe('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png')
    expect(src.attribution).toContain('CARTO')
    expect(src.attribution).toContain('OpenStreetMap')
  })

  it('keeps the OSM provider as a fallback option', () => {
    const osm = TILE_PROVIDERS.find((p) => p.id === 'osm')
    expect(osm?.tiles?.[0]).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
  })

  it('uses the Esri {z}/{y}/{x} tile order', () => {
    const esri = TILE_PROVIDERS.find((p) => p.id === 'esri')
    expect(esri?.tiles?.[0]).toContain('/MapServer/tile/{z}/{y}/{x}')
  })

  it('does not reference the broken OpenFreeMap provider', () => {
    expect(JSON.stringify(TILE_PROVIDERS)).not.toContain('openfreemap')
  })
})

describe('mapUtils tile probe', () => {
  afterEach(() => resetTileProviderCache())

  it('treats a flat-colour tile as solid (blocked placeholder)', () => {
    expect(isSolidTile([128, 128, 128, 128, 128])).toBe(true)
  })

  it('treats a varied tile as real map content', () => {
    expect(isSolidTile([10, 60, 120, 200, 240])).toBe(false)
    expect(tileVariance([10, 60, 120, 200, 240])).toBeGreaterThan(1)
  })

  it('treats an unsampleable tile as solid', () => {
    expect(isSolidTile([])).toBe(true)
  })

  it('fails the probe when the image cannot be loaded', async () => {
    const ok = await probeTileProvider(TILE_PROVIDERS[0], {
      loadImage: async () => null,
      sample: () => [1, 2, 3],
    })
    expect(ok).toBe(false)
  })

  it('passes the probe for real tile pixels', async () => {
    const ok = await probeTileProvider(TILE_PROVIDERS[0], {
      loadImage: async () => ({ naturalWidth: 256 }) as HTMLImageElement,
      sample: () => [10, 60, 120, 200, 240],
    })
    expect(ok).toBe(true)
  })

  it('fails the probe for solid placeholder pixels', async () => {
    const ok = await probeTileProvider(TILE_PROVIDERS[0], {
      loadImage: async () => ({ naturalWidth: 256 }) as HTMLImageElement,
      sample: () => [128, 128, 128, 128],
    })
    expect(ok).toBe(false)
  })
})

describe('mapUtils resolveTileProvider', () => {
  afterEach(() => resetTileProviderCache())

  it('picks the first healthy provider (early exit)', async () => {
    const probe = async (p: { id: string }) => p.id === 'carto'
    const provider = await resolveTileProvider(TILE_PROVIDERS, { probe })
    expect(provider.id).toBe('carto')
  })

  it('falls through to the next provider when the first is blocked', async () => {
    const probe = async (p: { id: string }) => p.id === 'esri'
    const provider = await resolveTileProvider(TILE_PROVIDERS, { probe })
    expect(provider.id).toBe('esri')
  })

  it('falls back to the first provider when every probe fails', async () => {
    const probe = async () => false
    const provider = await resolveTileProvider(TILE_PROVIDERS, { probe })
    expect(provider.id).toBe(TILE_PROVIDERS[0].id)
  })

  it('memoizes the probe across calls', async () => {
    let calls = 0
    const probe = async (p: { id: string }) => {
      calls += 1
      return p.id === 'carto'
    }
    await resolveTileProvider(TILE_PROVIDERS, { probe })
    await resolveTileProvider(TILE_PROVIDERS, { probe })
    expect(calls).toBe(1)
  })
})

describe('mapUtils misc', () => {
  it('DEFAULT_CENTER is Accra', () => {
    expect(DEFAULT_CENTER).toEqual([-0.187, 5.6037])
  })

  it('warmMapResources preconnects to every tile host', () => {
    warmMapResources()
    const links = Array.from(document.querySelectorAll('link[rel="preconnect"]'))
    const hosts = links.map((l) => l.getAttribute('href'))
    expect(hosts).toContain('https://basemaps.cartocdn.com')
    expect(hosts).toContain('https://tile.openstreetmap.org')
    expect(hosts).toContain('https://server.arcgisonline.com')
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
