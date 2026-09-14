import { NextResponse, type NextRequest } from 'next/server'

// Bot user-agents that need pre-rendered HTML
const BOT_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp',           // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'facebot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'whatsapp',
  'telegrambot',
  'applebot',
  'discordbot',
  'pinterest',
  'redditbot',
  'quora',
  'viber',
  'skype',
  'ia_archiver',     // Alexa
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'rogerbot',
  'exabot',
  'zoominfobot',
]

// Paths that should NOT be proxied to prerender (auth, dashboard, booking, API)
const SKIP_PATHS = [
  '/dashboard',
  '/booking',
  '/auth',
  '/login',
  '/api/',
  '/payment-methods',
  '/supplier/register',
  '/supplier/list-experience',
]

function isBot(userAgent: string): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return BOT_AGENTS.some((bot) => ua.includes(bot))
}

function shouldSkipPath(pathname: string): boolean {
  return SKIP_PATHS.some((p) => pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''

  // Only proxy GET requests from bots on non-skipped paths
  if (
    request.method === 'GET' &&
    isBot(userAgent) &&
    !shouldSkipPath(pathname)
  ) {
    // Build the target URL for the prerender endpoint
    const targetUrl = `${pathname}${search}`
    const prerenderUrl = new URL('/api/prerender', 'https://apiv1.travioafrica.com')
    prerenderUrl.searchParams.set('url', targetUrl)

    // Rewrite the response to the prerender endpoint
    const response = NextResponse.rewrite(prerenderUrl)
    response.headers.set('X-Prerender-Bot', 'true')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (robots.txt, sitemap.xml, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.css$|.*\\.js$).*)',
  ],
}
