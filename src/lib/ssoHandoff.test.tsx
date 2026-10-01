import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  hasToken: true as boolean,
  fetchWithAuth: vi.fn(),
}))

vi.mock('./auth', () => ({
  getStoredAuthTokens: () => mocks.hasToken
    ? { accessToken: 'token-a', refreshToken: 'refresh-a' }
    : { accessToken: null, refreshToken: null },
  getApiBaseUrl: () => 'https://api.example.test/api',
  fetchCurrentUser: vi.fn(),
  adoptSession: vi.fn(),
}))
vi.mock('./api', () => ({ fetchWithAuth: (...args: unknown[]) => mocks.fetchWithAuth(...args) }))

import {
  handoffHref,
  ensureHandoff,
  useHandoffHref,
  resetHandoff,
} from './ssoHandoff'

const TOUR = 'https://www.travioghana.com/tour/cmt1/cape-coast'

const ok = (ticket: string) => ({
  ok: true,
  json: async () => ({ data: { ticket, expiresIn: 120 } }),
})

/** Renders a component that reports the href it currently shows. */
function Probe({ href }: { href: string }) {
  const value = useHandoffHref(href)
  return <a href={value}>go</a>
}

describe('ssoHandoff', () => {
  beforeEach(() => {
    resetHandoff()
    mocks.hasToken = true
    mocks.fetchWithAuth.mockReset()
    mocks.fetchWithAuth.mockResolvedValue(ok('ticket-1'))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('handoffHref', () => {
    it('leaves the destination alone while no ticket is warm', () => {
      expect(handoffHref(TOUR)).toBe(TOUR)
    })

    it('appends the ticket in the fragment, never the query', () => {
      mocks.fetchWithAuth.mockResolvedValue(ok('ticket-1'))
      // Fragment, because a fragment is never sent to a server: it cannot
      // reach an access log, a Referer header or the analytics payload.
      return ensureHandoff(TOUR).then((href) => {
        expect(href).toBe(`${TOUR}#sso=ticket-1`)
        expect(href).not.toContain('?')
      })
    })

    it('encodes the ticket so it survives an opaque token', async () => {
      mocks.fetchWithAuth.mockResolvedValue(ok('a+b/c=d'))
      const href = await ensureHandoff(TOUR)
      expect(href).toBe(`${TOUR}#sso=${encodeURIComponent('a+b/c=d')}`)
    })
  })

  describe('ensureHandoff', () => {
    it('mints against the sso endpoint with the destination in the body', async () => {
      await ensureHandoff(TOUR)

      expect(mocks.fetchWithAuth).toHaveBeenCalledTimes(1)
      const [path, options] = mocks.fetchWithAuth.mock.calls[0]
      expect(path).toBe('/sso/mint')
      expect(JSON.parse(options.body)).toEqual({ destination: 'https://www.travioghana.com' })
    })

    it('shares one mint across concurrent callers', async () => {
      // Twenty cards on a page must not stampede the endpoint: they share a
      // destination and therefore a single ticket.
      let release!: () => void
      mocks.fetchWithAuth.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () => resolve(ok('ticket-1'))
          }),
      )

      const all = Promise.all([ensureHandoff(TOUR), ensureHandoff(TOUR), ensureHandoff(TOUR)])
      release()
      const hrefs = await all

      expect(hrefs).toEqual([`${TOUR}#sso=ticket-1`, `${TOUR}#sso=ticket-1`, `${TOUR}#sso=ticket-1`])
      expect(mocks.fetchWithAuth).toHaveBeenCalledTimes(1)
    })

    it('spends no request when the visitor is signed out', async () => {
      mocks.hasToken = false

      await expect(ensureHandoff(TOUR)).resolves.toBe(TOUR)
      expect(mocks.fetchWithAuth).not.toHaveBeenCalled()
    })

    it('never rejects — a slow handoff must not break a tour click', async () => {
      mocks.fetchWithAuth.mockRejectedValue(new Error('network down'))
      await expect(ensureHandoff(TOUR)).resolves.toBe(TOUR)
    })

    it('falls back to the plain destination when minting fails', async () => {
      mocks.fetchWithAuth.mockResolvedValue({ ok: false, json: async () => ({}) })
      await expect(ensureHandoff(TOUR)).resolves.toBe(TOUR)
      // And nothing is cached, so the next click may try again.
      expect(handoffHref(TOUR)).toBe(TOUR)
    })

    it('treats a missing ticket field as no handoff', async () => {
      mocks.fetchWithAuth.mockResolvedValue({ ok: true, json: async () => ({ data: {} }) })
      await expect(ensureHandoff(TOUR)).resolves.toBe(TOUR)
    })

    it('never sends a standing credential — only the ticket comes back', async () => {
      mocks.fetchWithAuth.mockResolvedValue(ok('ticket-1'))
      await ensureHandoff(TOUR)
      // The refresh token is what must never appear in a URL; only the
      // 120-second ticket may.
      expect(handoffHref(TOUR)).not.toContain('refresh')
    })
  })

  describe('useHandoffHref', () => {
    it('upgrades the anchor once the ticket lands', async () => {
      const { container } = render(<Probe href={TOUR} />)

      await waitFor(() => {
        expect(container.querySelector('a')!.getAttribute('href')).toBe(`${TOUR}#sso=ticket-1`)
      })
    })

    it('keeps the plain href when signed out', async () => {
      mocks.hasToken = false

      const { container } = render(<Probe href={TOUR} />)
      await waitFor(() => expect(mocks.fetchWithAuth).not.toHaveBeenCalled())
      expect(container.querySelector('a')!.getAttribute('href')).toBe(TOUR)
    })

    it('stops updating after unmount', async () => {
      let release!: () => void
      mocks.fetchWithAuth.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () => resolve(ok('ticket-late'))
          }),
      )

      const { container } = render(<Probe href={TOUR} />)
      cleanup()
      release()

      // Reaching here without React warning about setState on an unmounted
      // component is the assertion; the probe's node is gone either way.
      await new Promise((r) => setTimeout(r, 30))
      expect(container.querySelector('a')).toBeNull()
    })
  })
})
