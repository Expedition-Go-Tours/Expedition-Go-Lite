import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Tour, MultiDayTour } from '../components/data'
import { getApiBaseUrl, getAuthToken, getStoredAuthUser, getAuthUserId, subscribeToAuthState } from '../lib/auth'
import { mapRawTourToListing } from '../hooks/useExpeditionTours'

export interface WishlistItem {
  id: string
  /**
   * Real backend tour ID. Present when the item was added from a tour
   * sourced from the API (any live tour card, or the tour detail page).
   * Absent for legacy/static mock content that has no corresponding
   * database record — those items can only ever be stored locally.
   * Used to sync adds/removes with the account wishlist on the backend.
   */
  tourId?: string
  title: string
  location: string
  price: number
  duration: string
  imageUrl: string
  rating: number
  reviewCount: number
  addedDate: string
  source?: 'expedition-go' | 'travio-africa'
  externalUrl?: string
}

interface WishlistContextValue {
  wishlist: WishlistItem[]
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (id: string) => void
  isInWishlist: (id: string) => boolean
  wishlistCount: number
  /** True while merging a guest wishlist into the account after login. */
  isSyncing: boolean
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

function generateId(title: string, location: string): string {
  return btoa(`${title}|${location}`).replace(/=/g, '')
}

export function toWishlistItem(tour: (Tour | MultiDayTour & { days?: string }) & { id?: string }): WishlistItem {
  const m = tour as MultiDayTour & { days?: string }
  const hasDuration = 'duration' in tour && typeof tour.duration === 'string'
  const hasDays = 'days' in m && typeof m.days === 'string'
  const realId = tour.id

  return {
    id: realId || generateId(tour.title, tour.location),
    tourId: realId,
    title: tour.title,
    location: tour.location,
    price: parseInt(tour.price.replace(/[$,]/g, '')) || 0,
    duration: hasDuration ? tour.duration : (hasDays ? m.days : '1 Day'),
    imageUrl: tour.image,
    rating: parseFloat(tour.rating) || 0,
    reviewCount: tour.reviews,
    addedDate: new Date().toISOString(),
    source: tour.source,
    externalUrl: tour.externalUrl,
  }
}

const STORAGE_KEY = 'expedition_go_wishlist'

function loadLocalWishlist(): WishlistItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveLocalWishlist(items: WishlistItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore (private browsing / storage full) */
  }
}

/**
 * Uses /api/users/wishlist rather than /api/expedition/wishlist — the
 * latter only returns tours curated onto the homepage (ExpeditionTour
 * table with isActive: true), which would silently drop any tour not
 * yet featured there. The /users/wishlist endpoint works for any active
 * tour by its real database ID.
 */
async function wishlistFetch(path: string, options?: RequestInit) {
  const base = getApiBaseUrl()
  const token = await getAuthToken()
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string>),
    },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.message || `Request failed (${res.status})`)
  }
  return payload
}

function mapBackendTourToItem(t: any): WishlistItem {
  const listing = mapRawTourToListing(t)
  const priceNum = parseInt(String(listing.price).replace(/[^0-9.]/g, ''), 10) || 0
  const ratingNum = parseFloat(listing.rating) || 0

  return {
    id: t.id,
    tourId: t.id,
    title: listing.title,
    location: listing.location,
    price: priceNum,
    // Note: /users/wishlist doesn't select durationMinutes/categorization,
    // so duration may come back empty for backend-sourced items. Consumers
    // should render this field conditionally.
    duration: listing.duration,
    imageUrl: listing.image,
    rating: ratingNum,
    reviewCount: listing.reviews,
    // The backend stores wishlist as a plain array of tour IDs with no
    // per-entry timestamp, so we can't know the real "added at" date —
    // this reflects the sync time, not the original add time.
    addedDate: new Date().toISOString(),
    source: listing.source,
    externalUrl: listing.externalUrl,
  }
}

async function fetchBackendWishlistItems(): Promise<WishlistItem[]> {
  const payload = await wishlistFetch('/users/wishlist')
  const tours: any[] = payload.data?.tours ?? payload.tours ?? []
  return tours.map(mapBackendTourToItem)
}

/** Returns the updated isWishlisted flag on success, or null on failure. */
async function toggleBackendWishlist(tourId: string): Promise<boolean | null> {
  try {
    const payload = await wishlistFetch(`/users/wishlist/${encodeURIComponent(tourId)}`, { method: 'PATCH' })
    const data = payload.data ?? payload
    return !!data?.isWishlisted
  } catch (e) {
    console.warn('[Wishlist] backend toggle failed:', e)
    return null
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(loadLocalWishlist)
  const [isSyncing, setIsSyncing] = useState(false)

  // Refs mirror state so the long-lived auth subscription (set up once on
  // mount) always reads current values instead of a stale closure.
  const wishlistRef = useRef(wishlist)
  const isLoggedInRef = useRef(!!getAuthUserId(getStoredAuthUser()))
  const mergedForUserRef = useRef<string | null>(null)

  useEffect(() => {
    wishlistRef.current = wishlist
    saveLocalWishlist(wishlist)
  }, [wishlist])

  useEffect(() => {
    const syncOnLogin = async () => {
      setIsSyncing(true)
      try {
        const backendItems = await fetchBackendWishlistItems()
        const backendTourIds = new Set(backendItems.map((i) => i.tourId).filter(Boolean) as string[])

        // Items added while browsing as a guest (real tourId, not yet on
        // the account) get pushed up so nothing saved before login is lost.
        const guestOnlyItems = wishlistRef.current.filter(
          (i) => i.tourId && !backendTourIds.has(i.tourId)
        )

        if (guestOnlyItems.length > 0) {
          await Promise.all(guestOnlyItems.map((i) => toggleBackendWishlist(i.tourId!)))
          const finalItems = await fetchBackendWishlistItems()
          setWishlist(finalItems)
        } else {
          setWishlist(backendItems)
        }
      } catch (e) {
        console.warn('[Wishlist] sync on login failed, keeping local state:', e)
      } finally {
        setIsSyncing(false)
      }
    }

    let unsubscribe: (() => void) | undefined
    subscribeToAuthState((user) => {
      const uid = getAuthUserId(user)
      isLoggedInRef.current = !!uid

      if (uid) {
        if (mergedForUserRef.current !== uid) {
          mergedForUserRef.current = uid
          syncOnLogin()
        }
      } else if (mergedForUserRef.current) {
        // Transitioned from logged-in to logged-out — the account's
        // wishlist is already persisted server-side, so clear the local
        // cache rather than risk leaking it to the next guest session.
        mergedForUserRef.current = null
        setWishlist([])
      }
    }).then((unsub) => { unsubscribe = unsub })

    return () => { unsubscribe?.() }
  }, [])

  const addToWishlist = (item: WishlistItem) => {
    setWishlist((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev
      return [item, ...prev]
    })

    if (isLoggedInRef.current && item.tourId) {
      toggleBackendWishlist(item.tourId).then((isWishlisted) => {
        if (isWishlisted === null) {
          // Backend call failed — roll back the optimistic update.
          setWishlist((prev) => prev.filter((i) => i.id !== item.id))
          toast.error('Could not save to your wishlist. Please try again.')
        }
      })
    }
  }

  const removeFromWishlist = (id: string) => {
    const item = wishlistRef.current.find((i) => i.id === id)

    setWishlist((prev) => {
      if (!prev.some((i) => i.id === id)) return prev
      return prev.filter((i) => i.id !== id)
    })

    if (isLoggedInRef.current && item?.tourId) {
      toggleBackendWishlist(item.tourId).then((isWishlisted) => {
        if (isWishlisted === null) {
          // Backend call failed — restore the item.
          setWishlist((prev) => (prev.some((i) => i.id === id) ? prev : [item, ...prev]))
          toast.error('Could not update your wishlist. Please try again.')
        }
      })
    }
  }

  const isInWishlist = (id: string) => wishlist.some((i) => i.id === id)

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, wishlistCount: wishlist.length, isSyncing }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider')
  return ctx
}
