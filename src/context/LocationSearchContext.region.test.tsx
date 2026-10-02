import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import { LocationSearchProvider, useLocationSearch } from './LocationSearchContext'
import { CONSENT_VERSION } from '../lib/cookieConsent'
import { resetPendingWrites } from '../lib/consentGatedStorage'

/**
 * A tour click leaves this origin for Travio Ghana. The region it was clicked
 * from comes back in the URL fragment, and this provider is where that has to
 * land before anything reads the location.
 *
 * It is read into the provider's INITIAL state rather than applied in an
 * effect, so the homepage's first render is already scoped. An effect would
 * paint the global homepage, fire off every section request, and only then
 * swap — a flash and a wasted fetch on each return.
 *
 * Consent is withheld throughout: `hasConsent('functional')` is false until a
 * visitor answers the banner and stays false for anyone who rejects it, which
 * is exactly the population the fragment exists to serve.
 */

function Probe() {
  const { currentLocation, previousLocations } = useLocationSearch()
  return (
    <div>
      <span data-testid="current">{currentLocation ?? 'none'}</span>
      <span data-testid="previous">{previousLocations.join('|') || 'none'}</span>
    </div>
  )
}

function renderProvider() {
  return render(
    <LocationSearchProvider>
      <Probe />
    </LocationSearchProvider>,
  )
}

/**
 * Grant functional consent so `readGated` will actually read localStorage.
 * Without it the storage is unreadable BY DESIGN, and a test that seeded
 * localStorage would be asserting against a path that never runs in
 * production for these visitors.
 */
function grantFunctionalConsent() {
  document.cookie = `eg_consent=${encodeURIComponent(
    JSON.stringify({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      version: CONSENT_VERSION,
      updatedAt: Date.now(),
      source: 'banner',
    }),
  )}; path=/`
}

describe('LocationSearchProvider seeded from the URL fragment', () => {
  beforeEach(() => {
    // No consent, and no leftover storage, so the only channel in play is the URL.
    localStorage.clear()
    sessionStorage.clear()
    // Consent is a cookie, so it survives localStorage.clear() — clear it too,
    // or a test that granted it leaks into the next one.
    document.cookie = 'eg_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    // The provider's mount effect writes state through writeGated, which with no
    // consent parks it in a module-level Map rather than localStorage. That Map
    // outlives both localStorage.clear() and the cookie, and readGated falls
    // back to it, so without this every test inherits the previous one's region.
    resetPendingWrites()
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    cleanup()
    window.history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  })

  it('exposes the fragment region on the FIRST render', () => {
    // Not "eventually" — the region has to be there before the homepage reads it.
    window.history.replaceState(null, '', '/#region=Central%20Region')

    renderProvider()

    expect(screen.getByTestId('current').textContent).toBe('Central Region')
  })

  it('applies the region without any functional consent', () => {
    window.history.replaceState(null, '', '/#region=Central%20Region')

    renderProvider()

    // The whole point of the fragment: storage is a no-op here, and the region
    // still lands.
    expect(screen.getByTestId('current').textContent).toBe('Central Region')
  })

  it('stays unscoped when there is no fragment', () => {
    renderProvider()

    expect(screen.getByTestId('current').textContent).toBe('none')
  })

  it('ignores a fragment that carries only the sso ticket', () => {
    window.history.replaceState(null, '', '/#sso=tkt_123')

    renderProvider()

    expect(screen.getByTestId('current').textContent).toBe('none')
  })

  it('outranks a region left in storage by an earlier click', () => {
    grantFunctionalConsent()
    // Storage can hold a stale choice; the fragment was written by the click
    // that just happened, so it wins.
    window.history.replaceState(null, '', '/#region=Eastern%20Region')
    localStorage.setItem(
      'expedition_go_location_search',
      JSON.stringify({ currentLocation: 'Volta Region', previousLocations: [] }),
    )

    renderProvider()

    expect(screen.getByTestId('current').textContent).toBe('Eastern Region')
  })

  it('pushes the previously stored region into history', () => {
    grantFunctionalConsent()
    window.history.replaceState(null, '', '/#region=Eastern%20Region')
    localStorage.setItem(
      'expedition_go_location_search',
      JSON.stringify({ currentLocation: 'Volta Region', previousLocations: [] }),
    )

    renderProvider()

    expect(screen.getByTestId('previous').textContent).toBe('Volta Region')
  })

  it('does not duplicate a region already in storage', () => {
    grantFunctionalConsent()
    window.history.replaceState(null, '', '/#region=Central%20Region')
    localStorage.setItem(
      'expedition_go_location_search',
      JSON.stringify({ currentLocation: 'Central Region', previousLocations: [] }),
    )

    renderProvider()

    expect(screen.getByTestId('current').textContent).toBe('Central Region')
    expect(screen.getByTestId('previous').textContent).toBe('none')
  })

  it('caps the seeded history at the two most recent', () => {
    grantFunctionalConsent()
    window.history.replaceState(null, '', '/#region=Central%20Region')
    localStorage.setItem(
      'expedition_go_location_search',
      JSON.stringify({
        currentLocation: 'Volta Region',
        previousLocations: ['Greater Accra Region', 'Northern Region', 'Ashanti Region'],
      }),
    )

    renderProvider()

    // The seeded region must obey the same two-deep history cap as a live
    // setLocation(), or the search chip grows without bound the moment a
    // visitor keeps bouncing between the homepage and Ghana.
    expect(screen.getByTestId('previous').textContent).toBe('Volta Region|Greater Accra Region')
  })
})