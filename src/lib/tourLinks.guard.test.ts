import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A tour's detail page lives on Travio Ghana, so a tour link is an absolute
 * cross-origin URL. Two ways of getting that wrong are silent:
 *
 *  1. Handing an absolute URL to React Router — `<Link to>` and `navigate()`
 *     parse it as a path and produce `/https:/www.travioghana.com/…`. The user
 *     sees a broken route, and nothing throws.
 *  2. Building `/tour/…` by hand instead of via `tourHref()` — which is how
 *     three call sites came to disagree with the helper in the first place
 *     (one even shadowed the helper's name with a local `tourPath`).
 *
 * This walks `src/` and fails on either. SEO and JSON-LD emit absolute tour
 * URLs on purpose — Expedition keeps indexing its own tour pages — so the scan
 * targets *navigation* constructs only: `navigate(`, `<Link`, `window.open(`
 * and anchors.
 *
 * Test files are excluded: they exist to assert these strings.
 */

const SRC = join(process.cwd(), 'src')
const SKIP_FILE = 'tourPath.ts'

/** Constructing an internal tour path anywhere but the helper itself. */
const RULES: Array<{ name: string; pattern: RegExp }> = [
  {
    name: 'absolute tour URL passed to navigate() — Router resolves it as a path',
    pattern: /navigate\s*\(\s*tourHref\s*\(/,
  },
  {
    name: 'absolute tour URL on a <Link to> — use <a href={tourHref(...)}> instead',
    pattern: /<Link[^>]*?\bto=\{[^}]*\btourHref\b/s,
  },
  {
    name: 'internal tour path on a <Link to> — tour links must be cross-origin',
    pattern: /<Link[^>]*?\bto=\{[^}]*\btourPath\b/s,
  },
  {
    name: 'navigate() to a hand-built /tour/ path — route it through tourHref()',
    pattern: /navigate\s*\(\s*`\/tour\//,
  },
  {
    name: 'window.open() on a hand-built /tour/ path — route it through tourHref()',
    pattern: /window\.open\s*\(\s*`\/tour\//,
  },
  {
    name: 'anchor href pointing at this origin’s /tour/ path — route it through tourHref()',
    pattern: /href=\{?["'`]\/tour\//,
  },
]

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full))
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue
    if (entry.name.includes('.test.')) continue
    if (entry.name === SKIP_FILE) continue
    out.push(full)
  }
  return out
}

describe('tour links stay cross-origin', () => {
  const files = sourceFiles(SRC)

  it('finds source files to check (the scan must not pass vacuously)', () => {
    // A silently-empty walk would make every rule below pass without reading
    // anything — the same trap as a filter that matches nothing.
    expect(files.length).toBeGreaterThan(150)
    expect(files.some((f) => f.endsWith('TourCard.tsx'))).toBe(true)
  })

  it.each(RULES)('$name', ({ pattern }) => {
    const offenders = files
      .filter((file) => pattern.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(`${process.cwd()}/`, ''))

    expect(offenders, `offending file(s): ${offenders.join(', ')}`).toEqual([])
  })

  it('keeps tourHref as the only way to build a tour destination', () => {
    // tourPath() is still legitimate for this app's own router (canonical tag,
    // post-review return path) but must not be reached from a component: every
    // component-facing link goes through tourHref().
    const inComponents = files.filter(
      (file) => /\/(components|pages)\//.test(file) && /\btourPath\s*\(/.test(readFileSync(file, 'utf8')),
    )
    expect(inComponents, `component(s) calling tourPath directly: ${inComponents.join(', ')}`).toEqual([])
  })
})
