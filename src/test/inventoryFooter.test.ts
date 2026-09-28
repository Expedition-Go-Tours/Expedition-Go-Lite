import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * `/tours` and `/reviews` are this site's only two inventory pages that render
 * no footer, so they are also the only two pages with no internal links out of
 * them at all. Both were confirmed live: `document.querySelector('footer')` is
 * null on each, while `/` and `/about-us` return one with 26 links.
 *
 * Asserted against source rather than rendered output. Rendering these pages
 * needs the router, i18n and a mocked API, which would test far more than the
 * one thing that broke. The cost of that choice, stated plainly: this proves
 * the component renders a Footer, not that the Footer is visible.
 *
 * Comments are stripped before matching, so the note beside each <Footer />
 * cannot satisfy the assertion on its own.
 */
function pageSource(file: string): string {
  const raw = readFileSync(resolve(__dirname, '..', 'pages', file), 'utf8')
  return stripComments(raw)
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/^\s*\/\/.*$/gm, '') // whole-line comments
    .replace(/(^|[^:])\/\/.*$/gm, '$1') // trailing comments
}

const INVENTORY_PAGES = ['AllToursPage.tsx', 'AllReviewsPage.tsx']

describe('inventory pages render a footer', () => {
  it.each(INVENTORY_PAGES)('%s imports Footer', (file) => {
    expect(pageSource(file)).toMatch(/import\s+Footer\s+from\s+['"][^'"]*Footer['"]/)
  })

  it.each(INVENTORY_PAGES)('%s renders <Footer />', (file) => {
    expect(pageSource(file)).toMatch(/<Footer\s*\/>/)
  })

  it.each(INVENTORY_PAGES)('%s renders it inside the page, not at module scope', (file) => {
    // A stray <Footer /> outside the component would never reach the DOM.
    const src = pageSource(file)
    const rendered = src.indexOf('<Footer />')
    expect(rendered).toBeGreaterThan(-1)
    const componentStart = src.indexOf('export default function')
    expect(componentStart).toBeGreaterThan(-1)
    expect(rendered).toBeGreaterThan(componentStart)
  })
})

describe('the footer check cannot be satisfied by prose', () => {
  it('a file that only mentions the footer in a comment does not pass', () => {
    const fake = `
      import { useState } from 'react'
      // this page should render <Footer /> but does not
      /* nor here: <Footer /> */
      export default function Page() { return <div /> }
    `
    expect(stripComments(fake)).not.toMatch(/<Footer\s*\/>/)
  })
})
