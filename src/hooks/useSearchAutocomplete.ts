import { useMemo, useState, useEffect } from 'react'
import {
  recommendedTours, dayTours, topRatedTours, sellOutTours,
  lastMinuteDeals, multiDayTours, destinations,
  type Tour, type MultiDayTour,
} from '../components/data'

export interface SearchSuggestion {
  id: string
  type: 'destination' | 'tour'
  title: string
  subtitle: string
  image?: string
  price?: string
  slug?: string
}

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function useSearchAutocomplete(inputValue: string) {
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(inputValue), 200)
    return () => clearTimeout(t)
  }, [inputValue])

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const q = debounced.trim()
    if (q.length < 2) return []

    const lq = q.toLowerCase()
    const results: SearchSuggestion[] = []
    const seen = new Set<string>()

    for (const d of destinations) {
      if (d.title.toLowerCase().includes(lq)) {
        results.push({
          id: `dest-${d.title}`,
          type: 'destination',
          title: d.title,
          subtitle: d.tours,
        })
        seen.add(d.title)
      }
    }

    const allTours: (Tour & { duration?: string })[] = [
      ...recommendedTours, ...dayTours, ...topRatedTours,
      ...sellOutTours, ...lastMinuteDeals,
      ...multiDayTours.map((m: MultiDayTour) => ({
        title: m.title, category: '', duration: m.days,
        features: m.highlights, price: m.price, rating: m.rating,
        reviews: m.reviews, location: m.location, image: m.image,
      })),
    ]

    for (const t of allTours) {
      if (seen.has(t.title)) continue
      const match = t.title.toLowerCase().includes(lq) ||
        t.location.toLowerCase().includes(lq) ||
        (t.category && t.category.toLowerCase().includes(lq))
      if (!match) continue
      results.push({
        id: `tour-${t.title}`,
        type: 'tour',
        title: t.title,
        subtitle: t.location,
        image: t.image,
        price: t.price,
        slug: toSlug(t.title),
      })
      seen.add(t.title)
    }

    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().startsWith(lq) ? 0 : 1
      const bTitle = b.title.toLowerCase().startsWith(lq) ? 0 : 1
      if (aTitle !== bTitle) return aTitle - bTitle
      const aLoc = a.subtitle.toLowerCase().startsWith(lq) ? 0 : 1
      const bLoc = b.subtitle.toLowerCase().startsWith(lq) ? 0 : 1
      if (aLoc !== bLoc) return aLoc - bLoc
      return a.title.length - b.title.length
    })

    return results.slice(0, 8)
  }, [debounced])

  return suggestions
}
