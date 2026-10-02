import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  readRegionFromHash,
  stampRegionOnCurrentUrl,
  consumeRegionFromUrl,
} from './tourRegionHandoff'

/**
 * The region a clicked tour leaves behind has to survive the round trip to
 * Travio Ghana, which unloads this page.
 *
 * Consent-gated storage covers visitors who accepted functional cookies.
 * `hasConsent('functional')` is false until they answer, and stays false for
 * anyone who rejects — in both cases setLocation only writes an in-memory map
 * that dies on unload. The URL fragment is the channel that always survives,
 * so these tests pin its format and its round trip.
 */

describe('readRegionFromHash', () => {
  it('reads a plain region', () => {
    expect(readRegionFromHash('#region=Central%20Region')).toBe('Central Region')
  })

  it('accepts the hash with or without the leading #', () => {
    expect(readRegionFromHash('region=Accra')).toBe('Accra')
    expect(readRegionFromHash('#region=Accra')).toBe('Accra')
  })

  it('finds region alongside another fragment param (the sso ticket)', () => {
    // lib/ssoHandoff uses the same part of the URL for the inbound direction,
    // so both can legitimately be present at once.
    expect(readRegionFromHash('#sso=tkt_123&region=Central%20Region')).toBe('Central Region')
    expect(readRegionFromHash('#region=Central%20Region&sso=tkt_123')).toBe('Central Region')
  })

  it('decodes + as space and percent escapes', () => {
    expect(readRegionFromHash('#region=Greater+Accra+Region')).toBe('Greater Accra Region')
    expect(readRegionFromHash('#region=Oti%20Region')).toBe('Oti Region')
  })

  it('returns null when absent or empty', () => {
    expect(readRegionFromHash('')).toBeNull()
    expect(readRegionFromHash('#')).toBeNull()
    expect(readRegionFromHash('#sso=tkt_123')).toBeNull()
    expect(readRegionFromHash('#region=')).toBeNull()
    expect(readRegionFromHash('#region=%20%20')).toBeNull()
  })

  it('does not match a key that merely starts with "region"', () => {
    expect(readRegionFromHash('#regional=Accra')).toBeNull()
    expect(readRegionFromHash('#myregion=Accra')).toBeNull()
  })

  it('survives malformed percent-encoding instead of throwing', () => {
    expect(readRegionFromHash('#region=100%')).toBe('100%')
  })
})

describe('stampRegionOnCurrentUrl', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/tours?place=Accra')
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('adds the region to the current URL', () => {
    stampRegionOnCurrentUrl('Central Region')
    expect(window.location.hash).toBe('#region=Central%20Region')
  })

  it('preserves the path and existing query — back must not lose the listing', () => {
    // Replaces the entry rather than navigating home, so a visitor who clicked
    // from /tours?place=Accra still returns to that listing.
    stampRegionOnCurrentUrl('Central Region')
    expect(window.location.pathname).toBe('/tours')
    expect(window.location.search).toBe('?place=Accra')
  })

  it('replaces a region already on the URL rather than appending a second', () => {
    stampRegionOnCurrentUrl('Central Region')
    stampRegionOnCurrentUrl('Eastern Region')
    expect(window.location.hash).toBe('#region=Eastern%20Region')
    expect(window.location.hash.match(/region=/g)).toHaveLength(1)
  })

  it('keeps an unrelated fragment param', () => {
    window.history.replaceState(null, '', '/#sso=tkt_123')
    stampRegionOnCurrentUrl('Central Region')
    expect(readRegionFromHash(window.location.hash)).toBe('Central Region')
    expect(window.location.hash).toContain('sso=tkt_123')
  })

  it('does nothing without a usable region', () => {
    const before = window.location.href
    stampRegionOnCurrentUrl(null)
    stampRegionOnCurrentUrl(undefined)
    stampRegionOnCurrentUrl('')
    stampRegionOnCurrentUrl('   ')
    expect(window.location.href).toBe(before)
  })
})

describe('consumeRegionFromUrl', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('returns the region and strips it from the URL', () => {
    window.history.replaceState(null, '', '/#region=Central%20Region')

    expect(consumeRegionFromUrl()).toBe('Central Region')
    expect(window.location.hash).toBe('')
  })

  it('round-trips with the stamp, preserving the path and query', () => {
    window.history.replaceState(null, '', '/tours?place=Accra')
    stampRegionOnCurrentUrl('Eastern Region')

    expect(consumeRegionFromUrl()).toBe('Eastern Region')
    expect(window.location.pathname).toBe('/tours')
    expect(window.location.search).toBe('?place=Accra')
    expect(window.location.hash).toBe('')
  })

  it('strips only region, leaving other fragment params intact', () => {
    window.history.replaceState(null, '', '/#sso=tkt_123&region=Central%20Region')

    expect(consumeRegionFromUrl()).toBe('Central Region')
    expect(window.location.hash).toBe('#sso=tkt_123')
  })

  it('is a no-op when no region is present', () => {
    const before = window.location.href

    expect(consumeRegionFromUrl()).toBeNull()
    expect(window.location.href).toBe(before)
  })

  it('consumes only once — a second call does nothing', () => {
    window.history.replaceState(null, '', '/#region=Central%20Region')

    expect(consumeRegionFromUrl()).toBe('Central Region')
    expect(consumeRegionFromUrl()).toBeNull()
  })
})
