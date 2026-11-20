import { useMemo, useState, useEffect } from 'react'
import { useBlogCards } from '../lib/blogArticles'

export interface StorySuggestion {
  id: string
  title: string
  subtitle: string
  image: string
  slug: string
}

/**
 * Search suggestions come from the same admin-published articles the lists
 * show. They used to come from the static stories JSON, so a published
 * article could never be found and a retired one kept appearing.
 */
export function useStorySearchAutocomplete(inputValue: string) {
  const [debounced, setDebounced] = useState('')
  const { cards } = useBlogCards()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(inputValue), 200)
    return () => clearTimeout(t)
  }, [inputValue])

  const suggestions = useMemo<StorySuggestion[]>(() => {
    const q = debounced.trim()
    if (q.length < 2) return []

    const lq = q.toLowerCase()
    const results: StorySuggestion[] = []

    for (const card of cards) {
      const match =
        card.title.toLowerCase().includes(lq) ||
        card.author.toLowerCase().includes(lq)
      if (!match) continue
      results.push({
        id: `article-${card.id}`,
        title: card.title,
        subtitle: card.author,
        image: card.image,
        slug: card.slug,
      })
    }

    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().startsWith(lq) ? 0 : 1
      const bTitle = b.title.toLowerCase().startsWith(lq) ? 0 : 1
      if (aTitle !== bTitle) return aTitle - bTitle
      return a.title.length - b.title.length
    })

    return results.slice(0, 5)
  }, [cards, debounced])

  return suggestions
}
