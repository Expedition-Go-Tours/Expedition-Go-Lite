#!/usr/bin/env node
/**
 * Generates the Foundation page's optimized local image set.
 *
 * The page shipped 13 unique Wikimedia thumbnails (23 <img> tags) at
 * ?width=1100; every request 302-redirected to upload.wikimedia.org and took
 * seconds to download/render on first view. This script fetches each source
 * once, re-encodes it as AVIF sized to its real display footprint (2x DPR)
 * and writes it to src/assets/foundation/. Vite then hashes it under
 * /assets/*, which Vercel serves with a one-year immutable cache.
 *
 * Run with: node scripts/generate-foundation-images.cjs
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const sharp = require('sharp')

const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'foundation')
const WIKIMEDIA = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
const UA =
  'ExpeditionGoTours/1.0 (https://www.expeditiongotours.com; image optimization script)'

/** Width targets are the rendered CSS width x2 DPR (see FoundationPage.css). */
const JOBS = [
  // Hero gallery lane 1 — displayed ~283x268 (2x: 566px wide).
  { file: 'Ghana%20school%20children%20%288203372110%29.jpg', out: 'school-children.avif', width: 640 },
  { file: 'Tree%20planting%20in%20Ghana%209.jpg', out: 'tree-planting-9.avif', width: 640 },
  { file: 'Community%20clean-up.jpg', out: 'community-cleanup.avif', width: 640 },

  // Hero gallery lane 2 — displayed ~222x195 (2x: 444px wide).
  { file: 'Market%20women%20in%20Ghana.jpg', out: 'market-women.avif', width: 560 },
  {
    file: 'A%20village%20community%20development%20meeting%20in%20northern%20Ghana.jpg',
    out: 'village-meeting.avif',
    width: 560,
  },
  { file: 'A%20teacher%20assisting%20his%20student%20to%20read.jpg', out: 'teacher-reading.avif', width: 560 },

  // Help cards — displayed ~591x480 (2x: 1182px wide).
  { file: 'Students%20reading%20in%20a%20classroom.jpg', out: 'students-reading.avif', width: 1280 },
  { file: 'Wali_physical_meeting.jpg', out: 'wali-meeting.avif', width: 1280 },

  // Impact track — displayed ~376x390 (2x: 752px wide).
  { file: 'Cleanup%20exercise%20in%20Ghana%209.jpg', out: 'cleanup-9.avif', width: 800 },
  { file: 'Schoolgirl%20Ghana.jpg', out: 'schoolgirl.avif', width: 800 },
  { file: 'Ghana%20tree%20planting.jpg', out: 'tree-planting.avif', width: 800 },
  { file: 'Ghana%20young%20women%20%287250530402%29.jpg', out: 'young-women.avif', width: 800 },

  // Volunteer photo — displayed ~599x591 (2x: 1198px wide).
  { file: 'Cleanup%20exercise%20in%20Ghana%204.jpg', out: 'cleanup-4.avif', width: 1280 },
]

async function download(file, dest) {
  const url = `${WIKIMEDIA}${file}?width=1600`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${file}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buf)
  return buf.length
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fnd-images-'))
  let total = 0
  let downloaded = 0
  try {
    for (const job of JOBS) {
      const tmpFile = path.join(tmp, job.out.replace(/\.avif$/, '.jpg'))
      const srcBytes = await download(job.file, tmpFile)
      downloaded += srcBytes

      const outPath = path.join(OUT_DIR, job.out)
      const info = await sharp(tmpFile)
        .rotate()
        .resize({ width: job.width, withoutEnlargement: true, fit: 'inside' })
        .avif({ quality: 55, effort: 4 })
        .toFile(outPath)
      total += info.size
      console.log(
        `${job.out.padEnd(22)} ${String(Math.round(srcBytes / 1024)).padStart(5)}KB -> ` +
          `${String(Math.round(info.size / 1024)).padStart(4)}KB  ${info.width}x${info.height}`,
      )
    }
    console.log(
      `\nFoundation image set: ${JOBS.length} files, ${Math.round(total / 1024)}KB ` +
        `(downloaded ${Math.round(downloaded / 1024)}KB)`,
    )
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
