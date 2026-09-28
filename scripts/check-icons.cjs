#!/usr/bin/env node
/**
 * Build-time verification of the icon wiring. Runs from `prebuild`, so a
 * half-updated or broken icon set fails the build instead of shipping.
 *
 * Checks, in order of what has actually bitten this repo before:
 *   1. every icon URL declared in index.html, the generated story pages and
 *      site.webmanifest resolves to a real file in public/
 *   2. index.html and the story pages declare exactly the links that
 *      scripts/icon-links.cjs defines (no drift between the three heads)
 *   3. public/favicon.ico is a real multi-resolution ICO, not a PNG that was
 *      renamed (the file this replaced was byte-identical to favicon-32x32.png)
 *   4. the legacy root paths exist for every versioned file, so probes and old
 *      references never 404 after a rebrand
 *   5. apple-touch-icon.png and maskable-512x512.png are opaque, because iOS
 *      composites transparency against black and Android's maskable icon must
 *      reach the tile edges
 *   6. the tab icons keep their transparent corners (the badge is trimmed to
 *      its circle), so a regenerate can never quietly ship white squares again
 */
const { readFileSync, existsSync, readdirSync, statSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { ICON_LINKS, ICON_FILES, ICON_VERSION, MANIFEST_HREF } = require('./icon-links.cjs')

const ROOT = resolve(__dirname, '..')
const PUBLIC = join(ROOT, 'public')

const failures = []
const notes = []
const fail = (message) => failures.push(message)
const pass = (message) => notes.push(`  ok   ${message}`)

const publicPath = (urlPath) => join(PUBLIC, urlPath.replace(/^\//, '').split('?')[0])

/** Pull rel/href/sizes out of every relevant <link> in an HTML string. */
function readIconLinks(html) {
  const links = []
  const tagPattern = /<link\b[^>]*>/gi
  for (const tag of html.match(tagPattern) ?? []) {
    const rel = tag.match(/\brel="([^"]+)"/i)?.[1]
    if (!rel || !/^(icon|apple-touch-icon|shortcut icon|manifest)$/i.test(rel.trim())) continue
    const href = tag.match(/\bhref="([^"]+)"/i)?.[1]
    if (href) links.push({ rel: rel.trim().toLowerCase(), href })
  }
  return links
}

const expectedHrefs = new Set([
  ...ICON_LINKS.map((link) => link.href),
  MANIFEST_HREF,
])

function checkHtml(file, html) {
  const links = readIconLinks(html)
  const declared = new Set(links.map((link) => link.href))

  for (const href of declared) {
    if (!existsSync(publicPath(href))) fail(`${file} declares ${href}, which does not exist in public/`)
  }
  for (const href of expectedHrefs) {
    if (!declared.has(href)) fail(`${file} is missing the ${href} link that scripts/icon-links.cjs defines`)
  }
  for (const href of declared) {
    if (!expectedHrefs.has(href)) fail(`${file} declares ${href}, which script/icon-links.cjs does not define`)
  }
  if (declared.size === links.length) {
    pass(`${file}: ${links.length} icon links, all present and matching the shared block`)
  }
}

function checkIco(file) {
  // Guarded so a missing file is reported as one collected failure rather than
  // thrown, which is what every other check in this file already does.
  if (!existsSync(file)) {
    fail(`${file} is missing`)
    return 0
  }
  const buffer = readFileSync(file)
  if (buffer.length < 6 || buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1) {
    fail(`${file} is not a real ICO container (it is probably a renamed PNG)`)
    return 0
  }
  const count = buffer.readUInt16LE(4)
  if (count < 2) fail(`${file} holds ${count} image(s); a legacy .ico should carry several sizes`)
  for (let index = 0; index < count; index += 1) {
    const at = 6 + index * 16
    if (at + 16 > buffer.length) {
      fail(`${file} entry ${index} runs past the end of the file`)
      return count
    }
    const bytes = buffer.readUInt32LE(at + 8)
    const offset = buffer.readUInt32LE(at + 12)
    if (offset + bytes > buffer.length) {
      fail(`${file} entry ${index} points outside the file`)
      continue
    }
    const png = buffer.toString('ascii', offset + 1, offset + 4) === 'PNG'
    if (!png) fail(`${file} entry ${index} is not PNG-compressed`)
  }
  const sizes = Array.from({ length: count }, (_, index) => {
    const at = 6 + index * 16
    return buffer[at] || 256
  })
  pass(`${file}: real ICO, ${count} images (${sizes.join(', ')}px)`)
  return count
}

/** Alpha detection without a decoder: a PNG with a colour type that carries alpha. */
function pngHasAlpha(file) {
  if (!existsSync(file)) {
    fail(`${file} is missing`)
    return null
  }
  const buffer = readFileSync(file)
  const signature = buffer.subarray(0, 8).toString('hex')
  if (signature !== '89504e470d0a1a0a') return null
  // IHDR: 8-byte signature, 4-byte length, 4-byte type, then width/height/depth/colour
  const colourType = buffer[25]
  return colourType === 4 || colourType === 6
}

function main() {
  console.log('Icon wiring check\n')

  checkHtml('index.html', readFileSync(join(ROOT, 'index.html'), 'utf8'))

  const storiesDir = join(PUBLIC, 'stories')
  const storyPages = readdirSync(storiesDir).filter((name) => name.endsWith('.html'))
  for (const page of storyPages) {
    checkHtml(`public/stories/${page}`, readFileSync(join(storiesDir, page), 'utf8'))
  }

  const manifest = JSON.parse(readFileSync(publicPath(MANIFEST_HREF), 'utf8'))
  const purposes = new Set()
  for (const icon of manifest.icons ?? []) {
    if (!existsSync(publicPath(icon.src))) fail(`site.webmanifest declares ${icon.src}, which does not exist`)
    for (const purpose of String(icon.purpose ?? '').split(/\s+/)) {
      if (purpose) purposes.add(purpose)
    }
  }
  if (!purposes.has('any')) fail('site.webmanifest has no "any" purpose icon')
  if (!purposes.has('maskable')) fail('site.webmanifest has no padded "maskable" icon for Android')
  pass(`site.webmanifest: ${manifest.icons.length} icons, purposes ${[...purposes].join(' + ')}`)

  for (const name of ICON_FILES) {
    const versioned = join(PUBLIC, 'icons', ICON_VERSION, name)
    const legacy = join(PUBLIC, name)
    if (!existsSync(versioned)) fail(`public/icons/${ICON_VERSION}/${name} is missing`)
    if (!existsSync(legacy)) fail(`public/${name} is missing (legacy probes would 404)`)
  }
  pass(`all ${ICON_FILES.length} files present in both public/icons/${ICON_VERSION}/ and public/`)

  checkIco(join(PUBLIC, 'favicon.ico'))
  checkIco(join(PUBLIC, 'icons', ICON_VERSION, 'favicon.ico'))

  for (const file of [
    'public/apple-touch-icon.png',
    `public/icons/${ICON_VERSION}/apple-touch-icon.png`,
    'public/maskable-512x512.png',
    `public/icons/${ICON_VERSION}/maskable-512x512.png`,
  ]) {
    // The ICON_FILES loop above already reports a missing file by name; skipping
    // here keeps one problem from being announced twice with a misleading second
    // message.
    if (!existsSync(join(ROOT, file))) continue
    const alpha = pngHasAlpha(join(ROOT, file))
    if (alpha === null) fail(`${file} is not a PNG`)
    else if (alpha) fail(`${file} has an alpha channel; this icon must stay opaque`)
    else pass(`${file}: opaque`)
  }

  // The tab icons must keep their transparent corners: the badge is trimmed to
  // its circle, and a regenerate that flattens the set onto white again would
  // regress every browser tab to a white square.
  const ROUND_ICONS = [
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon-48x48.png',
    'favicon-64.png',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
  ]
  const flattened = []
  for (const name of ROUND_ICONS) {
    for (const dir of ['public', join('public', 'icons', ICON_VERSION)]) {
      const file = join(ROOT, dir, name)
      if (!existsSync(file)) continue // already reported by the ICON_FILES loop
      if (pngHasAlpha(file) !== true) flattened.push(`${dir}/${name}`)
    }
  }
  if (flattened.length) {
    fail(`tab icons lost their transparent corners: ${flattened.join(', ')}`)
  } else {
    pass(`all ${ROUND_ICONS.length * 2} tab icons have transparent corners`)
  }

  // Staleness hint only: checkout order makes mtimes unreliable, so this warns.
  // Compared against the newest file in the versioned set rather than one named
  // path, so it keeps working when ICON_VERSION moves and the old directory goes.
  const source = join(ROOT, 'src/assets/favicon-source.webp')
  const generated = ICON_FILES.map((name) => join(PUBLIC, 'icons', ICON_VERSION, name))
    .filter((file) => existsSync(file))
  if (existsSync(source) && generated.length) {
    const newest = Math.max(...generated.map((file) => statSync(file).mtimeMs))
    if (statSync(source).mtimeMs > newest) {
      console.log('\n  warn the badge source is newer than the generated icons')
      console.log('       run: npm run generate-favicons')
    }
  }

  console.log(`\n${notes.join('\n')}`)
  if (failures.length) {
    console.error(`\n${failures.length} problem(s):`)
    for (const problem of failures) console.error(`  ✗ ${problem}`)
    process.exit(1)
  }
  console.log('\nIcon wiring is consistent.')
}

main()
