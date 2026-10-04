// Render the actual React pages, so crawler content cannot drift from the site.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({ root, configFile: false, plugins: [react()], resolve: { alias: { '@': path.join(root, 'src') } }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, watch: null }, appType: 'custom' })
try {
  const { renderPages } = await server.ssrLoadModule('/scripts/render-public-pages.tsx')
  const data = JSON.parse(await readFile(path.join(root, 'public/data/externalReviews.json'), 'utf8'))
  const stats = JSON.parse(await readFile(path.join(root, 'public/data/externalReviewStats.json'), 'utf8'))
  const pages = await renderPages(data, stats)
  const out = path.join(root, 'public/__seo')
  await mkdir(out, { recursive: true })
  for (const [slug, html] of Object.entries(pages)) {
    await writeFile(path.join(out, `${slug}.html`), html)
    console.log(`Rendered /${slug}: ${html.length} bytes`)
  }
} finally {
  await server.close()
}
