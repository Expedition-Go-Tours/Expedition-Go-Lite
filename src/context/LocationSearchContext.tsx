import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react'
import { readGated, writeGated, removeGated } from '../lib/consentGatedStorage'
import { readRegionFromHash } from '../lib/tourRegionHandoff'

export interface LocationSearchData {
  currentLocation: string | null
  previousLocations: string[]
}

interface LocationSearchContextValue extends LocationSearchData {
  setLocation: (city: string) => void
  resetLocation: () => void
  hasActiveSearch: boolean
}

const LocationSearchContext = createContext<LocationSearchContextValue | null>(null)

const STORAGE_KEY = 'expedition_go_location_search'

function loadStorage(): LocationSearchData {
  try {
    const stored = readGated(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        currentLocation: parsed.currentLocation ?? null,
        previousLocations: Array.isArray(parsed.previousLocations) ? parsed.previousLocations.slice(0, 2) : [],
      }
    }
  } catch { /* corrupt storage */ }
  return { currentLocation: null, previousLocations: [] }
}

/**
 * The region the visitor just clicked through from, carried in this page's URL
 * fragment (see lib/tourRegionHandoff).
 *
 * Seeded into the provider's INITIAL state rather than applied in a mount
 * effect, so the very first render is already scoped. Applying it in an effect
 * would paint the global homepage, fetch all its sections, and only then swap
 * to the region — a flash plus a wasted request on every return.
 *
 * It outranks the stored region: it was written by the click that just
 * happened, whereas storage may hold an older choice.
 */
function loadRegionFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return readRegionFromHash(window.location.hash)
}

export function LocationSearchProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LocationSearchData>(() => {
    const stored = loadStorage()
    const fromUrl = loadRegionFromUrl()
    if (!fromUrl) return stored
    return {
      currentLocation: fromUrl,
      // The clicked region becomes the new current one; whatever was there
      // before becomes history, exactly as a live setLocation() would do.
      previousLocations: stored.currentLocation
        ? [stored.currentLocation, ...stored.previousLocations]
            .filter((p, i, arr) => p.toLowerCase() !== fromUrl.toLowerCase() && arr.indexOf(p) === i)
            .slice(0, 2)
        : stored.previousLocations,
    }
  })
  const dataRef = useRef(data)

  useEffect(() => {
    dataRef.current = data
    writeGated(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const setLocation = useCallback((city: string) => {
    setData(prev => {
      const normalized = city.trim()
      if (!normalized) return prev
      // No-op if same as current
      if (prev.currentLocation?.toLowerCase() === normalized.toLowerCase()) return prev

      // Shift current to history front, deduplicate
      const newPrevious = prev.currentLocation
        ? [
            prev.currentLocation,
            ...prev.previousLocations.filter(
              p => p.toLowerCase() !== normalized.toLowerCase() && p.toLowerCase() !== prev.currentLocation!.toLowerCase(),
            ),
          ].slice(0, 2)
        : prev.previousLocations

      return { currentLocation: normalized, previousLocations: newPrevious }
    })
  }, [])

  const resetLocation = useCallback(() => {
    setData({ currentLocation: null, previousLocations: [] })
    removeGated(STORAGE_KEY)
  }, [])

  // Memoize value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    currentLocation: data.currentLocation,
    previousLocations: data.previousLocations,
    setLocation,
    resetLocation,
    hasActiveSearch: data.currentLocation !== null,
  }), [data.currentLocation, data.previousLocations, setLocation, resetLocation])

  return (
    <LocationSearchContext.Provider value={value}>
      {children}
    </LocationSearchContext.Provider>
  )
}

export function useLocationSearch(): LocationSearchContextValue {
  const ctx = useContext(LocationSearchContext)
  if (!ctx) throw new Error('useLocationSearch must be used within a LocationSearchProvider')
  return ctx
}

/**
 * Same as useLocationSearch but returns null off-provider.
 *
 * TourCard is rendered in carousels, modals and isolated unit tests that don't
 * mount the provider. A tour click still has to record the region when the
 * context exists, so this lets the card opt in rather than crash — the
 * homepage scope is an enhancement, not a precondition for opening a tour.
 */
export function useOptionalLocationSearch(): LocationSearchContextValue | null {
  return useContext(LocationSearchContext)
}
