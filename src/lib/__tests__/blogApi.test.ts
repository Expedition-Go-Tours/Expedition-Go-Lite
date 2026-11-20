import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  BLOG_API_BASE,
  fetchArticleBySlug,
  fetchPublishedArticles,
} from '../blogApi'
import type { BlogArticleSummary } from '../blogApi'

const article: BlogArticleSummary = {
  id: 'a1',
  title: 'Cape Coast and Elmina Castles Guide',
  slug: 'cape-coast-and-elmina-castles-guide',
  excerpt: 'Two forts, one coastline.',
  featuredImage: 'https://res.cloudinary.com/demo/cape-coast.jpg',
  category: { id: 'c1', name: 'History & Heritage', slug: 'history-heritage' },
  tags: [{ id: 't1', name: 'Castles', slug: 'castles' }],
  author: { id: 'u1', name: 'Ama Mensah', photoURL: null },
  status: 'PUBLISHED',
  publishedAt: '2026-11-01T00:00:00.000Z',
  readTime: 6,
  locale: 'en',
  viewCount: 12,
  createdAt: '2026-10-30T00:00:00.000Z',
}

describe('blogApi', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the published feed from the shared /blog routes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: { articles: [article] } }),
    })

    const rows = await fetchPublishedArticles()

    expect(rows).toEqual([article])
    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`${BLOG_API_BASE}/blog/articles?page=1&limit=50`)
  })

  it('returns an empty feed rather than throwing on a malformed envelope', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })

    await expect(fetchPublishedArticles()).resolves.toEqual([])
  })

  it('surfaces the server message when an article is missing', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Article not found' }),
    })

    await expect(fetchArticleBySlug('nope')).rejects.toThrow('Article not found')
  })

  it('fetches one article by its slug', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { article: { ...article, body: { type: 'doc' } } } }),
    })

    const detail = await fetchArticleBySlug(article.slug)

    expect(detail.body).toEqual({ type: 'doc' })
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      `/blog/articles/${article.slug}`,
    )
  })
})
