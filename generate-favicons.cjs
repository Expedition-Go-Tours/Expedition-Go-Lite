#!/usr/bin/env node
/**
 * Builds the whole favicon set from one source image.
 *
 *   npm run generate-favicons
 *
 * The output is verified by scripts/check-icons.cjs, which runs from `prebuild`,
 * so this script and that check are two halves of one contract: whatever this
 * writes is exactly what the check demands.
 *
 * SOURCE is a monochrome circular seal (a laurel wreath around a two-letter
 * monogram) drawn in near-black on an opaque white field. Two consequences
 * drive the whole file:
 *
 *   1. It has no alpha channel and must not be given one. A transparent
 *      background on a BLACK mark makes the favicon invisible on a dark tab
 *      strip, which is the one place a favicon is actually seen. Every PNG here
 *      is therefore flattened onto white and written without alpha. This is also
 *      what scripts/check-icons.cjs requires of apple-touch-icon.png, because
 *      iOS composites transparency against black.
 *   2. The seal is drawn edge to edge, so it can fill a square tile, but a
 *      masked Android icon can crop to well under the full width. The maskable
 *      variant is therefore inset to the 80% safe circle instead of scaled like
 *      the rest.
 *
 * The ICO is assembled by hand. sharp cannot write one, and an .ico whose
 * single entry is a renamed PNG is the exact failure check-icons.cjs is built to
 * catch, so the container is written here with three PNG-compressed entries.
 */
const sharp = require('sharp')
const { mkdirSync, writeFileSync, readFileSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { ICON_VERSION, ICON_FILES } = require('./scripts/icon-links.cjs')

const ROOT = resolve(__dirname)
const PUBLIC = join(ROOT, 'public')
const VERSIONED = join(PUBLIC, 'icons', ICON_VERSION)
const SOURCE = join(ROOT, 'src/assets/favicon-source.webp')

/** Page icons: the seal fills the tile, on white. */
const FILL = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'favicon-64.png', size: 64 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
]

/**
 * Maskable icons: the mark is inset so it survives a circular crop. The web
 * maskable convention is a safe circle of 80% of the icon's width; Android's
 * adaptive icon is stricter still at ~67%, so 80% is the number that keeps the
 * wreath whole on both without making the launcher icon look lost.
 */
const SAFE_ZONE = 0.8
const MASKABLE = [{ name: 'maskable-512x512.png', size: 512 }]

/** Resolutions packed into favicon.ico, smallest first as the format expects. */
const ICO_SIZES = [16, 32, 48]

const WHITE = { r: 255, g: 255, b: 255 }

/** The seal at `size`x`size`, flattened onto white with no alpha channel. */
function seal(size) {
  return sharp(SOURCE)
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: WHITE })
    .removeAlpha()
}

/** The seal inset to the safe circle, centred on an opaque white field. */
async function maskable(size) {
  const inner = Math.round(size * SAFE_ZONE)
  const mark = await sharp(SOURCE)
    .resize(inner, inner, { fit: 'cover' })
    .png()
    .toBuffer()
  const offset = Math.round((size - inner) / 2)
  return sharp({
    create: { width: size, height: size, channels: 3, background: WHITE },
  })
    .composite([{ input: mark, top: offset, left: offset }])
    .png()
    .toBuffer()
}

/**
 * A real ICO: 6-byte ICONDIR, one 16-byte ICONDIRENTRY per size, then the PNG
 * payloads. PNG-compressed entries are valid and every current browser reads
 * them; the alternative (BMP/DIB entries) is larger and buys nothing here.
 */
function buildIco(entries) {
  const header = 6 + entries.length * 16
  const dir = Buffer.alloc(header)
  dir.writeUInt16LE(0, 0) // reserved
  dir.writeUInt16LE(1, 2) // 1 = icon
  dir.writeUInt16LE(entries.length, 4)

  let offset = header
  entries.forEach(({ size, data }, index) => {
    const at = 6 + index * 16
    dir.writeUInt8(size >= 256 ? 0 : size, at) // width, 0 meaning 256
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1) // height
    dir.writeUInt8(0, at + 2) // palette size, 0 for truecolour
    dir.writeUInt8(0, at + 3) // reserved
    dir.writeUInt16LE(1, at + 4) // colour planes
    dir.writeUInt16LE(32, at + 6) // bits per pixel
    dir.writeUInt32LE(data.length, at + 8)
    dir.writeUInt32LE(offset, at + 12)
    offset += data.length
  })

  return Buffer.concat([dir, ...entries.map((entry) => entry.data)])
}

async function main() {
  const source = readFileSync(SOURCE)
  if (!source.length) throw new Error(`${SOURCE} is empty`)

  mkdirSync(VERSIONED, { recursive: true })

  const written = []
  const write = async (name, buffer) => {
    for (const dir of [VERSIONED, PUBLIC]) {
      writeFileSync(join(dir, name), buffer)
    }
    written.push({ name, bytes: buffer.length })
  }

  for (const { name, size } of FILL) {
    await write(name, await seal(size).png({ compressionLevel: 9 }).toBuffer())
  }

  for (const { name, size } of MASKABLE) {
    await write(name, await maskable(size))
  }

  const icoEntries = []
  for (const size of ICO_SIZES) {
    icoEntries.push({ size, data: await seal(size).png({ compressionLevel: 9 }).toBuffer() })
  }
  await write('favicon.ico', buildIco(icoEntries))

  const missing = ICON_FILES.filter((name) => !written.some((file) => file.name === name))
  if (missing.length) {
    throw new Error(`did not generate ${missing.join(', ')}; scripts/icon-links.cjs expects them`)
  }

  console.log(`Favicons from ${SOURCE.replace(`${ROOT}/`, '')} -> public/icons/${ICON_VERSION}/ and public/\n`)
  for (const { name, bytes } of written.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${name.padEnd(28)} ${String(bytes).padStart(7)} bytes`)
  }
  console.log(`\n${written.length} files written to both locations.`)
  console.log('Next: node scripts/check-icons.cjs')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
