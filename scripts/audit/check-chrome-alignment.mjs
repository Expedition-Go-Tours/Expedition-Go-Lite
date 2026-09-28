#!/usr/bin/env node
/**
 * Chrome alignment audit — navbar + footer vs each page's content column.
 *
 * Every route declares its content column through a body class (`page-*`,
 * applied in src/App.tsx) and Navbar.css / Footer.css mirror that column with
 * matching padding rules. Nothing stops a page from drifting off it: a route
 * added to the map without a rule, a page's own container changed, a missing
 * phone override. That drift is invisible to unit tests but obvious on screen.
 *
 * This walks each route at every breakpoint and fails when the navbar's or the
 * footer's content edge is more than TOLERANCE pixels from the page container's
 * content edge.
 *
 * Usage:
 *   node scripts/audit/check-chrome-alignment.mjs
 *   node scripts/audit/check-chrome-alignment.mjs --base http://localhost:4173
 *   node scripts/audit/check-chrome-alignment.mjs --routes /,/tours --verbose
 *
 * Flags:
 *   --base     http://127.0.0.1:5174   origin to audit
 *   --routes   comma-separated paths to check (subset of the route map)
 *   --widths   comma-separated viewport widths (default: the 8 key breakpoints)
 *   --verbose  print every route/width measurement, not just failures
 *   --json     print the result set as JSON
 *
 * Exit code: 1 when any measurement is off by more than 1px.
 */

import puppeteer from 'puppeteer'

const argv = process.argv.slice(2)
function getArg(name, fallback) {
  const i = argv.indexOf(`--${name}`)
  if (i === -1) return fallback
  const value = argv[i + 1]
  if (!value || value.startsWith('--')) return true
  return value
}

const BASE_URL = String(getArg('base', 'http://127.0.0.1:5174')).replace(/\/$/, '')
const ONLY_ROUTES = getArg('routes', null)
const WIDTHS = String(getArg('widths', '1920,1600,1440,1280,1024,900,768,600,412'))
  .split(',')
  .map((w) => Number(w.trim()))
  .filter((w) => Number.isFinite(w) && w > 0)
const VERBOSE = argv.includes('--verbose')
const AS_JSON = argv.includes('--json')
const TOLERANCE = 1

/**
 * Route → the element that carries the page's content column. Use a comma
 * separated fallback list where a page has more than one layout variant; the
 * first match in document order wins. `discover` entries are resolved from the
 * app itself before the run (tour ids and supplier slugs are data, not code).
 */
const ROUTES = [
  { name: 'home', path: '/', page: '.mood-viewport, .carousel-viewport' },
  { name: 'all tours (search landing)', path: '/tours', page: '.all-tours-container' },
  { name: 'search results page', path: '/search?q=accra', page: '.search-results-header' },
  { name: 'tour detail', path: null, discover: { from: '/tours', link: 'a[href^="/tour/"]' }, page: '.tour-detail-container' },
  { name: 'help centre', path: '/help-centre', page: '.support-container' },
  { name: 'contact us', path: '/contact-us', page: '.support-container' },
  { name: 'faq', path: '/faq', page: '.support-container' },
  { name: 'careers', path: '/careers', page: '.support-container' },
  { name: 'refund policy', path: '/refund-policy', page: '.support-container' },
  { name: 'about us', path: '/about-us', page: '.about-container' },
  { name: 'blog', path: '/blog', page: '.blog-container' },
  { name: 'foundation', path: '/foundation', page: '.fnd-page .container' },
  { name: 'partnerships', path: '/partnerships', page: '.ptn-page .wrap' },
  { name: 'content creators', path: '/content-creators', page: '.wrap' },
  { name: 'travel agents', path: '/travel-agents', page: '.container' },
  { name: 'hotels', path: '/hotels', page: '.wrap' },
  { name: 'transport providers', path: '/transport-providers', page: '.wrap' },
  { name: 'transport', path: '/transport', page: '.transport-container' },
  { name: 'partner apply', path: '/partners/hotels/apply', page: '.partner-apply-container' },
  { name: 'review form', path: '/review/Accra City Tour', page: '.review-container' },
  { name: 'terms', path: '/terms-and-conditions', page: '.leg-wrap' },
  { name: 'privacy', path: '/privacy-policy', page: '.leg-wrap' },
  { name: 'cookies', path: '/cookies-policy', page: '.cp-wrap' },
  { name: 'supplier terms', path: '/supplier-terms', page: '.stp-page .wrap' },
  { name: 'list experience', path: '/supplier/list-experience', page: '.le-page .wrap' },
  { name: 'stories', path: '/stories', page: '.all-stories-container' },
  { name: 'reviews', path: '/reviews', page: '.all-reviews-container' },
  { name: 'booking confirmation', path: '/booking/confirmation', page: '.confirmation-print-area' },
]

if (Array.isArray(ONLY_ROUTES)) {
  console.error('--routes expects a comma-separated value, e.g. --routes /,/tours')
  process.exit(2)
}

function contentLeft(el) {
  const cs = getComputedStyle(el)
  return el.getBoundingClientRect().left + parseFloat(cs.paddingLeft)
}

function contentRight(el) {
  const cs = getComputedStyle(el)
  return el.getBoundingClientRect().right - parseFloat(cs.paddingRight)
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const tab = await browser.newPage()
const results = []

async function goto(path, waitFor) {
  await tab.goto(BASE_URL + path, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {})
  await tab.waitForSelector('.navbar', { timeout: 15_000 }).catch(() => {})
  await tab.waitForSelector(waitFor, { timeout: 15_000 }).catch(() => {})
  // One frame for the lazy route chunk + the body-class layout effect to land.
  await tab.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}

async function resolveDiscovered() {
  for (const route of ROUTES) {
    if (!route.discover || route.path) continue
    await goto(route.discover.from, route.discover.link)
    const href = await tab.evaluate((sel) => document.querySelector(sel)?.getAttribute('href') ?? null, route.discover.link)
    route.path = href
    if (!href) console.log(`  ! could not discover ${route.discover.from} → ${route.discover.link} (skipping "${route.name}")`)
  }
}

const filter = ONLY_ROUTES ? String(ONLY_ROUTES).split(',').map((r) => r.trim()).filter(Boolean) : null

await resolveDiscovered()

for (const route of ROUTES) {
  if (!route.path) continue
  if (filter && !filter.includes(route.path)) continue

  for (const width of WIDTHS) {
    await tab.setViewport({ width, height: 900, deviceScaleFactor: 1 })
    await goto(route.path, route.page)

    const measured = await tab.evaluate((pageSel) => {
      const nav = document.querySelector('.navbar')
      const footer = document.querySelector('.footer-container')
      const pageEl = document.querySelector(pageSel)
      if (!pageEl || !nav) return null
      const cl = (el) => el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft)
      const cr = (el) => el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight)
      return {
        navL: cl(nav), navR: cr(nav),
        pageL: cl(pageEl), pageR: cr(pageEl),
        footL: footer ? cl(footer) : null,
        footR: footer ? cr(footer) : null,
      }
    }, route.page)

    if (!measured) {
      results.push({ route: route.path, name: route.name, width, skipped: 'no page container / navbar' })
      continue
    }

    const delta = (a, b) => Math.round(Math.abs(a - b) * 10) / 10
    results.push({
      route: route.path,
      name: route.name,
      width,
      ...measured,
      navDelta: Math.max(delta(measured.navL, measured.pageL), delta(measured.navR, measured.pageR)),
      footDelta: measured.footL == null
        ? 0
        : Math.max(delta(measured.footL, measured.pageL), delta(measured.footR, measured.pageR)),
      noFooter: measured.footL == null,
    })
  }
}

await browser.close()

if (AS_JSON) {
  console.log(JSON.stringify(results, null, 2))
} else {
  const failed = results.filter((r) => !r.skipped && (r.navDelta > TOLERANCE || r.footDelta > TOLERANCE))
  const skipped = results.filter((r) => r.skipped)

  for (const r of results) {
    if (r.skipped) continue
    const bad = r.navDelta > TOLERANCE || r.footDelta > TOLERANCE
    if (!bad && !VERBOSE) continue
    const tag = bad ? 'FAIL' : ' ok '
    const footerText = r.footL == null ? 'footer (none)' : `footer ${r.footL.toFixed(0)}/${r.footR.toFixed(0)}`
    console.log(
      `${tag} ${String(r.width).padStart(4)}px  ${r.route.padEnd(28)}` +
        `  nav ${r.navL.toFixed(0)}/${r.navR.toFixed(0)}` +
        `  page ${r.pageL.toFixed(0)}/${r.pageR.toFixed(0)}` +
        `  ${footerText}` +
        `  Δnav ${r.navDelta}px  Δfooter ${r.footDelta}px`,
    )
  }

  const checked = results.length - skipped.length
  console.log('')
  if (failed.length === 0) {
    console.log(`PASS — ${checked} measurements across ${new Set(results.map((r) => r.route)).size} routes, all within ${TOLERANCE}px.`)
  } else {
    console.log(`FAIL — ${failed.length} of ${checked} measurements are off by more than ${TOLERANCE}px:`)
    for (const r of failed) {
      const which = r.navDelta > TOLERANCE ? 'navbar' : 'footer'
      const value = r.navDelta > TOLERANCE ? r.navDelta : r.footDelta
      console.log(`  ${r.route} @ ${r.width}px — ${which} ${value}px off the page content`)
    }
  }
  if (skipped.length) {
    console.log(`\n${skipped.length} skipped (page container not found):`)
    for (const r of skipped) console.log(`  ${r.route} @ ${r.width}px`)
  }
}

process.exit(results.some((r) => !r.skipped && (r.navDelta > TOLERANCE || r.footDelta > TOLERANCE)) ? 1 : 0)
