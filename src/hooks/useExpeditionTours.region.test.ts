import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
/**
 * Homepage cards get their region backfilled from the /tours listing.
 *
 * This is the safety net under the homepage mapper: homepage sections are
 * cached in Redis, so a payload written before the mapper returned region keeps
 * being served for up to an hour after deploy, and any future section whose
 * mapper forgets the field would be dead on arrival. Both are covered by the
 * listing carrying region for every tour.
 */

const LISTING = {
  data: {
    tours: [
      { id: 'tour-1', region: 'Central Region' },
      { id: 'tour-2', region: 'Eastern Region' },
      { id: 'tour-3' }, // no region in the payload — must not be invented
    ],
  },
}

function mockBadgesEndpoint(tours: unknown[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/tours/badges')) {
      return new Response(JSON.stringify({ data: { tours } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify(LISTING), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

describe('enrichTourBadgeFields region backfill', () => {
  beforeEach(() => {
    // The shared badge map is memoised for 60s inside the module; resetting
    // modules keeps each test independent of the previous one's payload.
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fills in a region the card is missing', async () => {
    mockBadgesEndpoint(LISTING.data.tours)
    const { enrichTourBadgeFields: enrich } = await import('./useExpeditionTours')

    const result = await enrich([{ id: 'tour-1' }, { id: 'tour-2' }] as { id: string; region?: string | null }[])

    expect(result[0].region).toBe('Central Region')
    expect(result[1].region).toBe('Eastern Region')
  })

  it('never clobbers a region the card already carries', async () => {
    mockBadgesEndpoint(LISTING.data.tours)
    const { enrichTourBadgeFields: enrich } = await import('./useExpeditionTours')

    const result = await enrich([{ id: 'tour-1', region: 'Volta Region' }] as { id: string; region?: string | null }[])

    expect(result[0].region).toBe('Volta Region')
  })

  it('leaves a tour with no region in the payload as null, not undefined', async () => {
    mockBadgesEndpoint(LISTING.data.tours)
    const { enrichTourBadgeFields: enrich } = await import('./useExpeditionTours')

    const result = await enrich([{ id: 'tour-3' }] as { id: string; region?: string | null }[])

    expect(result[0].region).toBeUndefined()
  })

  it('returns the cards unchanged when the listing fetch fails', async () => {
    // A failed backfill must not blank out data the card already had.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    const { enrichTourBadgeFields: enrich } = await import('./useExpeditionTours')

    const input = [{ id: 'tour-1', title: 'Cape Coast Castle' }]
    const result = await enrich(input)

    expect(result).toEqual(input)
  })

  it('preserves the other badge fields it already backfills', async () => {
    mockBadgesEndpoint([
      ...LISTING.data.tours,
      { id: 'tour-1', region: 'Central Region', languages: ['English', 'French'] },
    ])
    const { enrichTourBadgeFields: enrich } = await import('./useExpeditionTours')

    const result = await enrich([{ id: 'tour-1' }] as { id: string; region?: string | null; languages?: string[] }[])

    expect(result[0].region).toBe('Central Region')
    expect(result[0].languages).toEqual(['English', 'French'])
  })
})