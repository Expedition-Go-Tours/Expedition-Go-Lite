import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { destinations } from '../components/data'
import { getApiBaseUrl, getAuthToken } from '../lib/auth'
import { extractStartingPriceFromRaw, formatDuration } from './useExpeditionTours'

export interface SearchSuggestion {
  id: string
  type: 'destination' | 'tour'
  title: string
  subtitle: string
  image?: string
  price?: string
  slug?: string
}

interface BackendTourResult {
  id: string
  title: string
  slug: string
  coverPhoto: string | null
  photos: string[]
  city: string | null
  country: string | null
  category: string | null
  durationMinutes: number | null
  schedulesAndPricing: unknown
}

async function fetchBackendTourSuggestions(query: string): Promise<SearchSuggestion[]> {
  const base = getApiBaseUrl()
  const token = await getAuthToken()
  const params = new URLSearchParams({ search: query, limit: '8' })

  const res = await fetch(`${base}/tours?${params.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) return []

  const payload = await res.json().catch(() => ({}))
  const tours: BackendTourResult[] = payload.data?.tours ?? payload.tours ?? []

  return tours.map((t) => {
    const price = extractStartingPriceFromRaw(t.schedulesAndPricing)
    const location = [t.city, t.country].filter(Boolean).join(', ')
    const durationLabel = formatDuration(t.durationMinutes)

    return {
      id: `tour-${t.id}`,
      type: 'tour' as const,
      title: t.title,
      subtitle: [location, durationLabel].filter(Boolean).join(' • ') || t.category || '',
      image: t.coverPhoto || t.photos?.[0] || '',
      price: price != null ? `$${price}` : undefined,
      slug: t.slug,
    }
  })
}

export function useSearchAutocomplete(inputValue: string) {
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(inputValue), 250)
    return () => clearTimeout(t)
  }, [inputValue])

  const trimmed = debounced.trim()
  const isQueryLongEnough = trimmed.length >= 2

  const destinationSuggestions = useMemo<SearchSuggestion[]>(() => {
    if (!isQueryLongEnough) return []
    const lq = trimmed.toLowerCase()
    return destinations
      .filter((d) => d.title.toLowerCase().includes(lq))
      .map((d) => ({
        id: `dest-${d.title}`,
        type: 'destination' as const,
        title: d.title,
        subtitle: d.tours,
      }))
  }, [trimmed, isQueryLongEnough])

  const { data: tourSuggestions = [] } = useQuery({
    queryKey: ['search-autocomplete', 'tours', trimmed],
    queryFn: () => fetchBackendTourSuggestions(trimmed),
    enabled: isQueryLongEnough,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  })

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    if (!isQueryLongEnough) return []

    const lq = trimmed.toLowerCase()
    const seenTitles = new Set(destinationSuggestions.map((d) => d.title))
    const dedupedTours = tourSuggestions.filter((t) => {
      if (seenTitles.has(t.title)) return false
      seenTitles.add(t.title)
      return true
    })

    const results = [...destinationSuggestions, ...dedupedTours]

    results.sort((a, b) => {
      // Destinations first, then tours, matching prior UX ordering
      if (a.type !== b.type) return a.type === 'destination' ? -1 : 1
      const aStarts = a.title.toLowerCase().startsWith(lq) ? 0 : 1
      const bStarts = b.title.toLowerCase().startsWith(lq) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return a.title.length - b.title.length
    })

    return results.slice(0, 8)
  }, [destinationSuggestions, tourSuggestions, trimmed, isQueryLongEnough])

  return suggestions
}
