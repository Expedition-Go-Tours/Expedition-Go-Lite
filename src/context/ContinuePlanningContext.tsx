import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { Tour, MultiDayTour } from '../components/data'

export interface ContinuePlanningItem {
  id: string
  title: string
  location: string
  price: number
  duration: string
  features: string
  imageUrl: string
  rating: number
  reviewCount: number
  viewedAt: string
}

interface ContinuePlanningContextValue {
  continuePlanning: ContinuePlanningItem[]
  addToContinuePlanning: (item: ContinuePlanningItem) => void
  removeFromContinuePlanning: (id: string) => void
  clearContinuePlanning: () => void
  isInContinuePlanning: (id: string) => boolean
  continuePlanningCount: number
}

const ContinuePlanningContext = createContext<ContinuePlanningContextValue | null>(null)

function generateId(title: string, location: string): string {
  return btoa(`${title}|${location}`).replace(/=/g, '')
}

export function toContinuePlanningItem(tour: Tour | (MultiDayTour & { days?: string })): ContinuePlanningItem {
  const m = tour as MultiDayTour & { days?: string }
  const hasDuration = 'duration' in tour && typeof tour.duration === 'string'
  const hasDays = 'days' in m && typeof m.days === 'string'

  const tourFeatures = 'features' in tour && typeof (tour as Tour).features === 'string'
    ? (tour as Tour).features
    : ('highlights' in m && typeof m.highlights === 'string' ? m.highlights : '')

  return {
    id: generateId(tour.title, tour.location),
    title: tour.title,
    location: tour.location,
    price: parseInt(tour.price.replace(/[$,]/g, '')) || 0,
    duration: hasDuration ? (tour as Tour).duration : (hasDays ? m.days : '1 Day'),
    features: tourFeatures,
    imageUrl: tour.image,
    rating: parseFloat(tour.rating) || 0,
    reviewCount: tour.reviews,
    viewedAt: new Date().toISOString(),
  }
}

const STORAGE_KEY = 'expedition_go_continue_planning'
const MAX_ITEMS = 12

function loadStorage(): ContinuePlanningItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function ContinuePlanningProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ContinuePlanningItem[]>(loadStorage)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addToContinuePlanning = useCallback((item: ContinuePlanningItem) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== item.id)
      return [{ ...item, viewedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_ITEMS)
    })
  }, [])

  const removeFromContinuePlanning = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const clearContinuePlanning = useCallback(() => {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const isInContinuePlanning = useCallback((id: string) => {
    return itemsRef.current.some(i => i.id === id)
  }, [])

  return (
    <ContinuePlanningContext.Provider
      value={{
        continuePlanning: items,
        addToContinuePlanning,
        removeFromContinuePlanning,
        clearContinuePlanning,
        isInContinuePlanning,
        continuePlanningCount: items.length,
      }}
    >
      {children}
    </ContinuePlanningContext.Provider>
  )
}

export function useContinuePlanning(): ContinuePlanningContextValue {
  const ctx = useContext(ContinuePlanningContext)
  if (!ctx) throw new Error('useContinuePlanning must be used within a ContinuePlanningProvider')
  return ctx
}
