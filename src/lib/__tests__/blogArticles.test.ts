import { describe, expect, it } from 'vitest'
import { articleToCard, mapApiCategories } from '../blogArticles'
import type { BlogArticleSummary } from '../blogApi'

const base: BlogArticleSummary = {
  id: 'a1',
  title: 'Kakum National Park Canopy Walkway',
  slug: 'kakum-national-park-canopy-walkway',
  excerpt: 'Walk above the rainforest.',
  featuredImage: 'https://res.cloudinary.com/demo/kakum.jpg',
  category: { id: 'c1', name: 'Nature & Wildlife', slug: 'nature-wildlife' },
  tags: [],
  author: { id: 'u1', name: 'Kwesi Boateng', photoURL: null },
  status: 'PUBLISHED',
  publishedAt: '2026-11-02T00:00:00.000Z',
  readTime: 5,
  locale: 'en',
  viewCount: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
}

describe('articleToCard', () => {
  it('links to the story page and keeps the admin category label', () => {
    const card = articleToCard(base)

    expect(card.href).toBe('/stories/kakum-national-park-canopy-walkway')
    expect(card.title).toBe('Kakum National Park Canopy Walkway')
    expect(card.categoryLabel).toBe('Nature & Wildlife')
    expect(card.author).toBe('Kwesi Boateng')
    expect(card.readTime).toBe(5)
    expect(card.image).toBe('https://res.cloudinary.com/demo/kakum.jpg')
  })

  it('falls back to the placeholder image so a card never renders broken', () => {
    const card = articleToCard({ ...base, featuredImage: null })

    expect(card.image).toBe('/og-default.png')
  })

  it('maps a free-form admin category onto the curated filter keys', () => {
    const { categories } = mapApiCategories({
      ...base,
      category: { id: 'c2', name: 'Adventure Travel', slug: 'adventure-travel' },
    })

    expect(categories).toContain('adventure')
  })

  it('keeps an article in the feed when its topic maps nowhere', () => {
    const { categories, label } = mapApiCategories({
      ...base,
      category: { id: 'c3', name: 'Company News', slug: 'company-news' },
    })

    expect(categories).toEqual([])
    expect(label).toBe('Company News')
    // It still lists under "All".
    expect(articleToCard({ ...base, category: { id: 'c3', name: 'Company News', slug: 'company-news' } }).href)
      .toContain('/stories/')
  })
})
