import { useEffect, useState } from 'react'
import {
  BLOG_PLACEHOLDER_IMAGE,
  fetchPublishedArticles,
  type BlogArticleSummary,
} from './blogApi'

/**
 * One view model for an admin-published article, shared by the blog hub, the
 * stories list, the home carousel and the story page.
 *
 * The storefront used to be driven by `travelStories.json`, which the admin
 * could not touch: an article published in the dashboard appeared on
 * travioghana.com but never here. Everything now comes from `/blog/articles`.
 */
export type StoryCategory = 'nature' | 'culture' | 'food' | 'adventure' | 'heritage'

export interface BlogCard {
  id: string
  slug: string
  title: string
  excerpt: string
  image: string
  author: string
  date: string
  dateISO: string
  categories: StoryCategory[]
  /** Admin-authored category name — shown verbatim when there is one. */
  categoryLabel?: string
  readTime: number
  href: string
}

/**
 * Admin categories are free-form slugs ("adventure-travel", "cultural-tours",
 * …); the filter rail speaks five curated keys. Map what matches — an article
 * whose topic maps nowhere still lists (under "All"), it just doesn't claim a
 * topic it isn't.
 */
const CATEGORY_MATCHERS: [StoryCategory, RegExp][] = [
  ['nature', /nature|wildlife|park|safari|outdoor|eco/i],
  ['adventure', /adventure|hik|trek|kayak|climb|raft/i],
  ['food', /food|culin|cuisine|gastron|kitchen/i],
  ['heritage', /heritage|histor|castle|fort|unesco|traditional/i],
  ['culture', /culture|cultural|art|museu|music|festival/i],
]

const CURATED_KEYS: StoryCategory[] = ['nature', 'culture', 'food', 'adventure', 'heritage']

export function mapApiCategories(article: BlogArticleSummary): {
  categories: StoryCategory[]
  label: string | null
} {
  const label = article.category?.name ?? null
  const slug = article.category?.slug ?? ''
  if ((CURATED_KEYS as string[]).includes(slug)) {
    return { categories: [slug as StoryCategory], label }
  }
  const haystack = [slug, label ?? '', ...article.tags.map((tag) => `${tag.name} ${tag.slug}`)].join(' ')
  const categories = CATEGORY_MATCHERS.filter(([, pattern]) => pattern.test(haystack)).map(([key]) => key)
  return { categories: [...new Set(categories)], label }
}

export function formatArticleDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function articleToCard(article: BlogArticleSummary): BlogCard {
  const { categories, label } = mapApiCategories(article)
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    image: article.featuredImage || BLOG_PLACEHOLDER_IMAGE,
    author: article.author?.name || 'Expedition-Go Team',
    date: formatArticleDate(article.publishedAt) || formatArticleDate(article.createdAt),
    dateISO: article.publishedAt || article.createdAt,
    categories,
    categoryLabel: label ?? undefined,
    readTime: article.readTime ?? 4,
    href: `/stories/${article.slug}`,
  }
}

// One fetch per page load. The hub, the stories list, the home carousel and
// the autocomplete all read the same list.
let cachedCards: BlogCard[] | null = null
let inflight: Promise<BlogCard[]> | null = null

export function loadBlogCards(): Promise<BlogCard[]> {
  if (cachedCards) return Promise.resolve(cachedCards)
  if (!inflight) {
    inflight = fetchPublishedArticles()
      .then((articles) => {
        cachedCards = articles.map(articleToCard)
        return cachedCards
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Test seam: forget the cached list. */
export function resetBlogCardsCache() {
  cachedCards = null
  inflight = null
}

export function useBlogCards(): {
  cards: BlogCard[]
  loading: boolean
  failed: boolean
} {
  const [cards, setCards] = useState<BlogCard[]>(() => cachedCards ?? [])
  const [loading, setLoading] = useState(() => cachedCards == null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (cachedCards) return undefined
    let cancelled = false
    loadBlogCards()
      .then((next) => {
        if (cancelled) return
        setCards(next)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setCards([])
        setLoading(false)
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { cards, loading, failed }
}
