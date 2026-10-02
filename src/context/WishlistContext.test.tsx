import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { useEffect } from 'react'
import {
  toWishlistItem,
  mergeWishlistItem,
  WishlistProvider,
  useWishlist,
  WISHLIST_STORAGE_KEY,
  type WishlistItem,
} from './WishlistContext'
import type { SpecialOfferData } from '../hooks/useExpeditionTours'
import { resetPendingWrites } from '../lib/consentGatedStorage'
import { GRANTED_STATE, clearConsent, writeConsent } from '../lib/cookieConsent'
import { FakeBroadcastChannel } from '../test/fakeBroadcastChannel'

/**
 * The wishlist item is the snapshot the wishlist page renders from, so it must
 * carry every field a card paints — including the promo state. The login sync
 * then merges a server item back in without dropping those captured fields.
 */

const offer = (over: Partial<SpecialOfferData> = {}): SpecialOfferData => ({
  id: 'offer-1',
  name: 'Summer Sale',
  offerType: 'LIMITED_TIME',
  discountType: 'PERCENTAGE',
  discountPercentage: 30,
  fixedDiscountValue: null,
  startDate: null,
  endDate: null,
  promoCode: null,
  timeSlotMode: 'ALL_DAYS',
  specificWeekdays: [],
  capacityType: 'UNLIMITED',
  maxSpots: null,
  spotsSold: null,
  minQuantity: null,
  minSpendAmount: null,
  maxRedemptionsPerCustomer: null,
  stackable: false,
  earlyBirdAdvanceDays: null,
  lastMinuteWindowHours: null,
  targets: [],
  ...over,
})

describe('toWishlistItem', () => {
  it('captures the full card payload, promo state included', () => {
    const offers = [offer()]
    const item = toWishlistItem({
      id: 'tour-1',
      title: 'Accra City Tour',
      category: 'Tour',
      duration: '8 hours',
      features: 'Guide included · Lunch included',
      price: '$120',
      priceValue: 120,
      rating: '4.8',
      reviews: 42,
      location: 'Accra, Ghana',
      image: 'https://example.com/a.jpg',
      photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      slug: 'accra-city-tour',
      supplierName: 'Expedition-Go Tours Ltd',
      source: 'expedition-go',
      languages: ['English'],
      difficulty: 'Easy',
      cancellationPolicy: 'Free cancellation up to 24 hours before start time',
      pickupIncluded: true,
      accommodationIncluded: true,
      meetingMode: 'pickup',
      discount: '-30%',
      specialOffers: offers,
    })

    expect(item).toMatchObject({
      id: 'tour-1',
      tourId: 'tour-1',
      slug: 'accra-city-tour',
      title: 'Accra City Tour',
      category: 'Tour',
      price: 120,
      duration: '8 hours',
      features: 'Guide included · Lunch included',
      photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      languages: ['English'],
      difficulty: 'Easy',
      cancellationPolicy: 'Free cancellation up to 24 hours before start time',
      pickupIncluded: true,
      accommodationIncluded: true,
      meetingMode: 'pickup',
      discount: '-30%',
      supplierName: 'Expedition-Go Tours Ltd',
    })
    expect(item.specialOffers).toEqual(offers)
  })

  it('falls back to highlights for multi-day content and parses the price string', () => {
    const item = toWishlistItem({
      title: '3 Day Safari',
      days: '3 Days',
      highlights: 'Park fees · Guide · Accommodation',
      price: '$1,250',
      rating: '4.9',
      reviews: 10,
      location: 'Accra, Ghana',
      image: 'https://example.com/safari.jpg',
    } as never)

    expect(item.features).toBe('Park fees · Guide · Accommodation')
    expect(item.duration).toBe('3 Days')
    expect(item.price).toBe(1250)
    // No backend id means the legacy synthetic id, and no server sync.
    expect(item.tourId).toBeUndefined()
  })

  it('stores empty arrays as absent rather than empty values', () => {
    const item = toWishlistItem({
      title: 'Accra City Tour',
      category: 'Tour',
      duration: '8 hours',
      features: '',
      price: '$120',
      rating: '4.8',
      reviews: 0,
      location: 'Accra, Ghana',
      image: 'https://example.com/a.jpg',
      photos: [],
      languages: [],
      specialOffers: [],
    })

    expect(item.photos).toBeUndefined()
    expect(item.languages).toBeUndefined()
    expect(item.specialOffers).toBeUndefined()
    expect(item.discount).toBeUndefined()
  })
})

describe('mergeWishlistItem', () => {
  const server: WishlistItem = {
    id: 'tour-1',
    tourId: 'tour-1',
    title: 'Accra City Tour',
    location: 'Accra, Ghana',
    price: 120,
    duration: '8 hours',
    imageUrl: 'https://example.com/a.jpg',
    rating: 4.8,
    reviewCount: 42,
    addedDate: '2026-01-01T00:00:00.000Z',
  }

  it('fills display fields the server copy lacks from the local snapshot', () => {
    const local: WishlistItem = {
      ...server,
      features: 'Guide included · Lunch included',
      photos: ['https://example.com/a.jpg'],
      languages: ['English'],
      specialOffers: [offer()],
    }

    const merged = mergeWishlistItem(server, local)

    expect(merged.features).toBe('Guide included · Lunch included')
    expect(merged.photos).toEqual(['https://example.com/a.jpg'])
    expect(merged.languages).toEqual(['English'])
    expect(merged.specialOffers).toEqual([offer()])
  })

  it('keeps server values when the server copy has them', () => {
    const merged = mergeWishlistItem(
      { ...server, features: 'Server highlights', price: 99 },
      { ...server, features: 'Local highlights' },
    )

    expect(merged.features).toBe('Server highlights')
    expect(merged.price).toBe(99)
  })

  it('treats empty server arrays as missing and returns the server item without a local copy', () => {
    const local: WishlistItem = { ...server, photos: ['https://example.com/a.jpg'] }

    expect(mergeWishlistItem({ ...server, photos: [] }, local).photos).toEqual(['https://example.com/a.jpg'])
    expect(mergeWishlistItem(server)).toEqual(server)
  })
})

/**
 * Cross-tab sync regression tests.
 *
 * A heart tapped on a tour opened in a new tab (or the wishlist page opened in
 * one) must show on the tab the visitor returns to. Adoption is state-only:
 * the tab that made the change already pushed/queued the backend op, so
 * receiving tabs must never fire a second request.
 */

let wishlistApi: ReturnType<typeof useWishlist> | null = null

function CaptureWishlist() {
  const value = useWishlist()
  useEffect(() => {
    wishlistApi = value
  }, [value])
  return null
}

function setupWishlist() {
  render(
    <WishlistProvider>
      <CaptureWishlist />
    </WishlistProvider>,
  )
}

const storedWishlistItem = (over: Partial<WishlistItem> = {}): WishlistItem => ({
  id: 'tour-x',
  tourId: 'tour-x',
  slug: 'x-tour',
  title: 'Alpha Tour',
  location: 'Accra, Ghana',
  price: 100,
  duration: '1 Day',
  imageUrl: '',
  rating: 4.7,
  reviewCount: 12,
  addedDate: new Date(0).toISOString(),
  ...over,
})

describe('WishlistProvider — cross-tab sync', () => {
  beforeEach(() => {
    clearConsent()
    window.localStorage.clear()
    window.sessionStorage.clear()
    resetPendingWrites()
    FakeBroadcastChannel.reset()
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
    wishlistApi = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const storedItem = storedWishlistItem()

  it('adopts a list another tab persisted (storage event)', () => {
    writeConsent(GRANTED_STATE, 'accept-all')
    setupWishlist()

    const payload = JSON.stringify([storedItem])
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, payload)
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: WISHLIST_STORAGE_KEY, newValue: payload }))
    })

    expect(wishlistApi!.wishlist.map((i) => i.id)).toEqual(['tour-x'])
  })

  it('adopts a channel message without consent and without a backend call', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    setupWishlist()

    act(() => {
      FakeBroadcastChannel.last()!.emit(JSON.stringify([storedItem]))
    })

    expect(wishlistApi!.wishlist.map((i) => i.id)).toEqual(['tour-x'])
    // Nothing persisted (no functional consent) and no duplicate sync op.
    expect(window.localStorage.getItem(WISHLIST_STORAGE_KEY)).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('re-reads storage when the tab regains focus (missed event)', () => {
    writeConsent(GRANTED_STATE, 'accept-all')
    setupWishlist()
    expect(wishlistApi!.wishlist).toHaveLength(0)

    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify([storedItem]))
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    expect(wishlistApi!.wishlist.map((i) => i.id)).toEqual(['tour-x'])
  })

  it('does not echo an adopted list back into storage', () => {
    writeConsent(GRANTED_STATE, 'accept-all')
    setupWishlist()

    const payload = JSON.stringify([storedItem])
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, payload)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: WISHLIST_STORAGE_KEY, newValue: payload }))
    })

    expect(wishlistApi!.wishlist).toHaveLength(1)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('never broadcasts the mount-time list and announces local additions', () => {
    setupWishlist()
    expect(FakeBroadcastChannel.last()!.posted).toEqual([])

    act(() => {
      wishlistApi!.addToWishlist(storedWishlistItem({ id: 'tour-a', tourId: 'tour-a', slug: 'a-tour' }))
    })

    const posted = FakeBroadcastChannel.last()!.posted
    expect(posted).toHaveLength(1)
    expect(posted[0]).toContain('tour-a')
  })

  it('ignores malformed payloads instead of wiping the list', () => {
    writeConsent(GRANTED_STATE, 'accept-all')
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify([storedItem]))
    setupWishlist()
    expect(wishlistApi!.wishlist).toHaveLength(1)

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: WISHLIST_STORAGE_KEY, newValue: 'not json' }))
    })

    expect(wishlistApi!.wishlist).toHaveLength(1)
  })
})
