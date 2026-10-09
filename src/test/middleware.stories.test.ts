import { describe, it, expect } from 'vitest'
import middleware from '../../middleware'

/**
 * The six story pages are listed in sitemap.xml but hold no server-readable
 * data: they are rendered to static HTML by scripts/generate-story-pages.cjs
 * and served from public/stories/. The prerender endpoint cannot build them,
 * so a crawler whose request reaches it gets a 404 for a page that exists.
 *
 * This happened silently because nothing asserted the middleware's choice of
 * destination — it is visible only at the HTTP layer, under a crawler
 * user-agent, on a path with no file extension.
 */

const CRAWLER = 'Googlebot/2.1 (+http://www.google.com/bot.html)'
const HUMAN =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

const req = (path: string, userAgent: string) =>
  new Request(`https://www.expeditiongotours.com${path}`, {
    headers: { 'user-agent': userAgent },
  })

const rewriteTo = async (res: Response | Promise<Response | undefined> | undefined | void) =>
  (await res)?.headers.get('x-middleware-rewrite') ?? null

describe('middleware — story pages reach the static files, not the prerenderer', () => {
  it('gives Search Console the same prerendered public pages as Googlebot', async () => {
    const inspectionTool = 'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)'
    for (const path of ['/privacy-policy', '/travel-agents', '/transport-providers',
      '/refund-policy', '/terms-and-conditions', '/content-creators', '/partnerships']) {
      const target = await rewriteTo(middleware(req(path, inspectionTool)))
      expect(target).toBe(await rewriteTo(middleware(req(path, CRAWLER))))
      if (path === '/privacy-policy') expect(target).toBe('/__seo/privacy-policy.html')
      else expect(target).toContain('/api/prerender')
    }
    expect(await rewriteTo(middleware(req('/stories', inspectionTool)))).toBe('/stories/index.html')
    expect(await rewriteTo(middleware(req('/booking', inspectionTool)))).toBe(
      'https://www.expeditiongotours.com/index.html',
    )
  })

  it('sends a crawler to the generated story page', async () => {
    expect(await rewriteTo(middleware(req('/stories/a-food-lovers-guide-to-accra', CRAWLER)))).toBe(
      '/stories/a-food-lovers-guide-to-accra.html',
    )
  })

  it('sends a crawler to the story hub', async () => {
    expect(await rewriteTo(middleware(req('/stories', CRAWLER)))).toBe('/stories/index.html')
    expect(await rewriteTo(middleware(req('/stories/', CRAWLER)))).toBe('/stories/index.html')
  })

  it('leaves already-suffixed paths for the prerenderer, which 404s them', async () => {
    // Rewriting /stories/x.html to /stories/x.html.html would serve nothing.
    const target = await rewriteTo(middleware(req('/stories/a-food-lovers-guide-to-accra.html', CRAWLER)))
    expect(target).toContain('/api/prerender')
    expect(target).not.toContain('.html.html')
  })

  it('keeps every other crawler path on the backend prerenderer', async () => {
    const target = await rewriteTo(middleware(req('/tour/cmta3gpsb004kf1ed0ftvhand/accra-flying-dress-experience', CRAWLER)))
    expect(target).toContain('/api/prerender')
    expect(target).toContain(encodeURIComponent('/tour/'))
  })

  it('does not change what a human gets — the SPA still renders stories client-side', async () => {
    // The bot branch is the only thing touched, so a browser keeps taking the
    // index.html rewrite that mounts /stories/:slug.
    for (const path of ['/stories', '/stories/a-food-lovers-guide-to-accra']) {
      const target = await rewriteTo(middleware(req(path, HUMAN)))
      expect(target).toBe('https://www.expeditiongotours.com/index.html')
    }
  })

  it('still passes real static files straight through', async () => {
    // A known extension short-circuits before the bot branch entirely.
    expect(await middleware(req('/stories/index.png', CRAWLER))).toBeUndefined()
    expect(await middleware(req('/assets/index.css', CRAWLER))).toBeUndefined()
  })
})
