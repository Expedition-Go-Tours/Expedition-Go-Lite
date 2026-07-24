import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Tour, MultiDayTour } from '../components/data'

export interface WishlistItem {
  id: string
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
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

function generateId(title: string, location: string): string {
  return btoa(`${title}|${location}`).replace(/=/g, '')
}

export function toWishlistItem(tour: Tour | MultiDayTour & { days?: string }): WishlistItem {
  const m = tour as MultiDayTour & { days?: string }
  const hasDuration = 'duration' in tour && typeof tour.duration === 'string'
  const hasDays = 'days' in m && typeof m.days === 'string'
  
  return {
    id: generateId(tour.title, tour.location),
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

function loadWishlist(): WishlistItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(loadWishlist)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  const addToWishlist = (item: WishlistItem) => {
    setWishlist(prev => {
      if (prev.some(i => i.id === item.id)) return prev
      return [item, ...prev]
    })
  }

  const removeFromWishlist = (id: string) => {
    setWishlist(prev => {
      if (!prev.some(i => i.id === id)) return prev
      return prev.filter(i => i.id !== id)
    })
  }

  const isInWishlist = (id: string) => wishlist.some(i => i.id === id)

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, wishlistCount: wishlist.length }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider')
  return ctx
}
