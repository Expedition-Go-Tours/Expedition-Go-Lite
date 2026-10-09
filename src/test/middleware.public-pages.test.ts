import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import middleware from '../../middleware'

const pages = ['careers', 'contact-us', 'cookies-policy', 'privacy-policy', 'supplier-terms', 'reviews']
const content = ['Send your CV', 'mailto:', 'Cookies Policy', 'Data Protection', '15%', 'TripAdvisor']

describe('complete public-page crawler rendering', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/generate-public-pages.mjs'], { stdio: 'pipe' })
  }, 30000)
  it('serves generated full content to both Googlebot and Search Console', async () => {
    for (const slug of pages) {
      for (const agent of ['Googlebot', 'Google-InspectionTool']) {
        for (const suffix of ['', '/', '?utm_source=test']) {
          const response = await middleware(new Request(`https://www.expeditiongotours.com/${slug}${suffix}`, { headers: { 'user-agent': agent } }))
          expect(response?.headers.get('x-middleware-rewrite')).toBe(`/__seo/${slug}.html`)
        }
      }
    }
  })

  it('keeps visitor routes on the interactive app', async () => {
    for (const slug of pages) {
      const response = await middleware(new Request(`https://www.expeditiongotours.com/${slug}`, { headers: { 'user-agent': 'Mozilla/5.0 Chrome/131.0' } }))
      expect(response?.headers.get('x-middleware-rewrite')).toBe('https://www.expeditiongotours.com/index.html')
    }
  })

  it('generates substantive visible content and one self-canonical per page', () => {
    for (const [index, slug] of pages.entries()) {
      const html = readFileSync(`public/__seo/${slug}.html`, 'utf8')
      expect(html).toContain(content[index])
      expect(html.match(/rel="canonical"/g)).toHaveLength(1)
      expect(html).toContain(`href="https://www.expeditiongotours.com/${slug}"`)
      expect(html).toContain('name="robots" content="index, follow"')
      expect(html).not.toContain('opacity:0')
      expect(html).not.toContain('src="/src/')
      expect(html.split('<body>')[1].replace(/<[^>]*>/g, '').length).toBeGreaterThan(1500)
    }
  })
})
