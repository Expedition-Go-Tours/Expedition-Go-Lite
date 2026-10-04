export const config = { runtime: 'nodejs' }

const BOT_AGENTS = [
  'googlebot', 'google-inspectiontool', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'sogou', 'facebot', 'facebookexternalhit', 'twitterbot',
  'linkedinbot', 'slackbot', 'whatsapp', 'telegrambot', 'applebot',
  'discordbot', 'pinterest', 'redditbot', 'quora', 'viber', 'skype',
  'ia_archiver', 'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot',
  'rogerbot', 'exabot', 'zoominfobot',
]

const SKIP_PATHS = [
  '/dashboard', '/booking', '/auth', '/login', '/api/',
  '/payment-methods', '/supplier/register', '/supplier/list-experience',
]

const STATIC_EXTS = [
  '.xml', '.txt', '.json', '.png', '.jpg', '.jpeg', '.svg', '.gif',
  '.webp', '.ico', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot',
]

// Generated from the same React components and data visitors see.
const PUBLIC_HTML_PAGES = new Set([
  '/careers', '/contact-us', '/cookies-policy', '/privacy-policy', '/supplier-terms', '/reviews',
])

function isBot(ua: string): boolean {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return BOT_AGENTS.some((b) => lower.includes(b))
}

function shouldSkip(pathname: string): boolean {
  return SKIP_PATHS.some((p) => pathname.startsWith(p))
}

function isStatic(pathname: string): boolean {
  return STATIC_EXTS.some((ext) => pathname.endsWith(ext))
}

export default function middleware(request: Request): Response | undefined {
  const url = new URL(request.url)
  const pathname = url.pathname
  const ua = request.headers.get('user-agent') || ''

  // Vercel's Image Optimization endpoint carries every parameter in the query
  // string, so `/_vercel/image` has no file extension. `isStatic()` matches on
  // known extensions, so this clears it, clears the bot prerouter (no dot in
  // the path) and lands on the SPA rewrite at the bottom, which answers with
  // index.html instead of an optimized image. Hand it straight to the platform.
  if (pathname.startsWith('/_vercel/')) return

  // Let static files pass through
  if (isStatic(pathname)) return

  // Bot detection: rewrite to prerender endpoint
  if (request.method === 'GET' && isBot(ua) && !shouldSkip(pathname)) {
    const publicPath = pathname.replace(/\/$/, '')
    if (PUBLIC_HTML_PAGES.has(publicPath)) {
      return new Response(null, {
        status: 200,
        headers: {
          'x-middleware-rewrite': `/__seo${publicPath}.html`,
          'X-Prerender-Bot': 'true',
        },
      })
    }
    // Stories are client-side data the backend cannot read, so the prerenderer
    // can only answer them with a hub that links to none of them (detail pages
    // with 404/noindex). They are rendered to static HTML at build time
    // (scripts/generate-story-pages.cjs) and served straight from the
    // filesystem instead: /stories for the hub, /stories/<slug> for the page.
    // Without this the six story URLs in the sitemap all answered 404 to
    // crawlers while the files sat deployed and reachable by hand.
    if (pathname === '/stories' || pathname === '/stories/') {
      return new Response(null, {
        status: 200,
        headers: {
          'x-middleware-rewrite': '/stories/index.html',
          'X-Prerender-Bot': 'true',
        },
      })
    }
    const storySlug = pathname.match(/^\/stories\/([^/]+)\/?$/)?.[1]
    // Already-suffixed paths (/stories/x.html) must fall through to the
    // prerenderer, which answers them with a real 404 instead of x.html.html.
    // The rewrite itself is not re-entered here, so the platform serves the
    // static file directly.
    if (storySlug && !storySlug.endsWith('.html')) {
      return new Response(null, {
        status: 200,
        headers: {
          'x-middleware-rewrite': `/stories/${encodeURIComponent(storySlug)}.html`,
          'X-Prerender-Bot': 'true',
        },
      })
    }

    const target = `${pathname}${url.search}`
    const prerenderUrl = `https://api.expeditiongotours.com/api/prerender?url=${encodeURIComponent(target)}`
    return new Response(null, {
      status: 200,
      headers: {
        'x-middleware-rewrite': prerenderUrl,
        'X-Prerender-Bot': 'true',
      },
    })
  }

  // SPA routing: rewrite non-file requests to index.html
  if (request.method === 'GET' && !pathname.includes('.')) {
    const indexUrl = new URL('/index.html', request.url)
    return new Response(null, {
      status: 200,
      headers: {
        'x-middleware-rewrite': indexUrl.toString(),
      },
    })
  }
}
