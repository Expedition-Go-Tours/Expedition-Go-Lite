import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/auth', () => ({
  googleOneTapSupported: () => true,
  getGoogleClientId: () => 'test-client-id',
  signInWithGoogleOneTap: vi.fn(async () => ({ id: 'u-test', email: 'a@b.com' })),
  subscribeToAuthState: () => Promise.resolve(() => {}),
  getStoredAuthUser: () => null,
  getAuthProvider: () => 'backend',
}))

vi.mock('../hooks/useAuthUser', () => ({
  useAuthUser: () => null,
}))

// The reported failure: the lazy One Tap chunk cannot be fetched (dev-server
// re-optimization reload, network loss, stale chunk). Throwing from the module
// factory makes the dynamic import reject exactly like the browser does.
vi.mock('./GoogleOneTapLazy', () => {
  throw new Error(
    'Failed to fetch dynamically imported module: http://localhost:5174/src/components/GoogleOneTapLazy.tsx',
  )
})

import GoogleOneTapPrompt, {
  shouldPromptHomeOneTap,
  markHomeOneTapShown,
  clearHomeOneTapCaps,
} from './GoogleOneTapPrompt'

const SESSION_KEY = 'expedition.googleOnetap.dismissedSession'
const DAILY_KEY = 'expedition.googleOnetap.lastShownDay'

describe('GoogleOneTapPrompt caps', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('allows the first prompt of a clean session', () => {
    expect(shouldPromptHomeOneTap()).toBe(true)
  })

  it('suppresses after it has been shown once', () => {
    markHomeOneTapShown()
    expect(shouldPromptHomeOneTap()).toBe(false)
  })

  it('re-enables after sign-out clears the caps', () => {
    markHomeOneTapShown()
    expect(shouldPromptHomeOneTap()).toBe(false)
    clearHomeOneTapCaps()
    expect(shouldPromptHomeOneTap()).toBe(true)
  })

  it('respects the once-per-calendar-day rule', () => {
    localStorage.setItem(DAILY_KEY, '2000-01-01')
    expect(shouldPromptHomeOneTap()).toBe(true)

    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(DAILY_KEY, today)
    expect(shouldPromptHomeOneTap()).toBe(false)
  })

  it('a new session can prompt again the next day', () => {
    markHomeOneTapShown()
    expect(shouldPromptHomeOneTap()).toBe(false)

    // New session next day: session flag gone, daily key belongs to yesterday.
    sessionStorage.removeItem(SESSION_KEY)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    localStorage.setItem(DAILY_KEY, yesterday)
    expect(shouldPromptHomeOneTap()).toBe(true)
  })
})

describe('GoogleOneTapPrompt chunk-failure resilience', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
    localStorage.clear()
    // React logs boundary-caught render errors via console.error — silence it
    // so the suite stays clean while the boundary's own warning is asserted.
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('is skipped silently when its lazy module cannot be fetched — the page does not crash', async () => {
    const { container } = render(<GoogleOneTapPrompt />)

    // The prompt arms 3s after mount (signed out, within caps). Importing the
    // module rejects; the boundary must contain it.
    await act(async () => {
      vi.advanceTimersByTime(3000)
      await Promise.resolve()
    })

    expect(container).toBeEmptyDOMElement()
    expect(console.warn).toHaveBeenCalledWith(
      '[GoogleOneTapPrompt] prompt skipped — module failed to load:',
      expect.any(Error),
      expect.anything(),
    )
  })
})
