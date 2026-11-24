import { ApiError } from './api'
import { getApiBaseUrl } from './auth'

/**
 * Public blog API — the same admin-published articles the Ghana storefront
 * reads.
 *
 * Blog routes live at `/api/blog/...` on the shared backend, not under a brand
 * prefix, so the base is used as-is. Plain `fetch` on purpose: these are public
 * reads, so no Bearer token (which would turn them into CORS preflights) and no
 * 401 refresh dance.
 */
export const BLOG_API_BASE = getApiBaseUrl().replace(/\/+$/, '')

/**
 * Stand-in for articles published without a featured image, so cards never
 * render a broken <img>.
 */
export const BLOG_PLACEHOLDER_IMAGE = '/og-default.png'

export interface BlogCategory {
  id: string
  name: string
  slug: string
}

export interface BlogAuthor {
  id: string
  name: string
  photoURL: string | null
}

export interface BlogTag {
  id: string
  name: string
  slug: string
}

/** List-shape article (no body). */
export interface BlogArticleSummary {
  id: string
  title: string
  slug: string
  excerpt: string
  featuredImage: string | null
  category: BlogCategory | null
  tags: BlogTag[]
  author: BlogAuthor | null
  status: string
  publishedAt: string | null
  readTime: number | null
  locale: string
  viewCount: number
  createdAt: string
}

export interface BlogRelatedTour {
  id: string
  title: string
  slug: string
  coverPhoto: string | null
  category: string | null
  city: string | null
  country: string | null
  startingPrice: number | null
  currency: string | null
  averageRating: number | null
  reviewCount: number
}

/** Detail-shape article (`transformArticleDetail` + SEO fields). */
export interface BlogArticleDetail extends BlogArticleSummary {
  body: unknown
  images: string[]
  metaTitle: string | null
  metaDescription: string | null
  canonicalUrl: string | null
  relatedTours?: BlogRelatedTour[]
}

interface ListEnvelope {
  data?: { articles?: BlogArticleSummary[] }
}

interface DetailEnvelope {
  data?: { article?: BlogArticleDetail }
}

/** Abort hung API calls so a page cannot spin forever. */
function requestSignal(): AbortSignal | undefined {
  try {
    return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(10_000)
      : undefined
  } catch {
    return undefined
  }
}

async function blogFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BLOG_API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    signal: requestSignal(),
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Non-JSON error body (proxy page, truncated response) — status decides.
  }

  if (!response.ok) {
    const message = (payload as { message?: string } | null)?.message
    throw new ApiError(message || `Blog request failed (${response.status})`, response.status)
  }

  return payload as T
}

/** Published articles, newest first. */
export async function fetchPublishedArticles(limit = 50): Promise<BlogArticleSummary[]> {
  const params = new URLSearchParams({ page: '1', limit: String(Math.max(1, Math.min(limit, 50))) })
  const payload = await blogFetch<ListEnvelope>(`/blog/articles?${params}`)
  return payload?.data?.articles ?? []
}

export async function fetchArticleBySlug(slug: string): Promise<BlogArticleDetail> {
  const payload = await blogFetch<DetailEnvelope>(`/blog/articles/${encodeURIComponent(slug)}`)
  const article = payload?.data?.article
  if (!article?.slug) {
    throw new ApiError('Article not found', 404)
  }
  return article
}

export async function fetchRelatedArticles(id: string, limit = 3): Promise<BlogArticleSummary[]> {
  const params = new URLSearchParams({ limit: String(Math.max(1, Math.min(limit, 10))) })
  const payload = await blogFetch<ListEnvelope>(
    `/blog/articles/${encodeURIComponent(id)}/related?${params}`,
  )
  return payload?.data?.articles ?? []
}
