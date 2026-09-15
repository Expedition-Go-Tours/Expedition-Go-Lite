#!/usr/bin/env node
/**
 * Generate sitemap.xml for Expedition-Go Tours.
 *
 * Fetches all active tours from the API and generates a sitemap with:
 * - Homepage (priority 1.0)
 * - Tour detail pages (priority 0.8)
 * - Destination pages (priority 0.7)
 * - Static pages (priority 0.5)
 * - Stories (priority 0.6)
 *
 * Usage:
 *   API_URL=https://your-api.example.com node scripts/generate-sitemap.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SITE_URL = process.env.SITE_URL || 'https://expeditiongotours.com';
const API_URL = process.env.API_URL;
const OUTPUT = path.resolve(__dirname, '../public/sitemap.xml');

if (!API_URL) {
  console.error('ERROR: API_URL environment variable is required.');
  console.error('Usage: API_URL=https://your-api.example.com node scripts/generate-sitemap.cjs');
  process.exit(1);
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

function xmlEscape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, { priority = 0.5, changefreq = 'weekly', lastmod } = {}) {
  const mod = lastmod ? `\n  <lastmod>${lastmod}</lastmod>` : '';
  return `<url>
  <loc>${xmlEscape(loc)}</loc>${mod}
  <changefreq>${changefreq}</changefreq>
  <priority>${priority}</priority>
</url>`;
}

async function main() {
  console.log('Generating sitemap...');
  console.log(`API: ${API_URL}`);
  console.log(`Output: ${OUTPUT}`);

  const urls = [];

  // Homepage
  urls.push(urlEntry(`${SITE_URL}/`, { priority: 1.0, changefreq: 'daily' }));

  // Static pages
  const staticPages = [
    { path: '/tours', priority: 0.9, changefreq: 'daily' },
    { path: '/about-us', priority: 0.5, changefreq: 'monthly' },
    { path: '/faq', priority: 0.5, changefreq: 'monthly' },
    { path: '/help-centre', priority: 0.4, changefreq: 'monthly' },
    { path: '/contact-us', priority: 0.4, changefreq: 'monthly' },
    { path: '/stories', priority: 0.6, changefreq: 'weekly' },
    { path: '/reviews', priority: 0.5, changefreq: 'weekly' },
    { path: '/blog', priority: 0.6, changefreq: 'weekly' },
    { path: '/careers', priority: 0.3, changefreq: 'monthly' },
    { path: '/partnerships', priority: 0.3, changefreq: 'monthly' },
    { path: '/terms-and-conditions', priority: 0.2, changefreq: 'yearly' },
    { path: '/privacy-policy', priority: 0.2, changefreq: 'yearly' },
    { path: '/cookies-policy', priority: 0.2, changefreq: 'yearly' },
    { path: '/refund-policy', priority: 0.2, changefreq: 'yearly' },
    { path: '/foundation', priority: 0.3, changefreq: 'monthly' },
    { path: '/transport', priority: 0.4, changefreq: 'monthly' },
  ];

  for (const p of staticPages) {
    urls.push(urlEntry(`${SITE_URL}${p.path}`, { priority: p.priority, changefreq: p.changefreq }));
  }

  // Fetch tours from API (paginated, max 50 per page)
  try {
    console.log('Fetching tours...');
    const tours = [];
    let page = 1;
    const perPage = 50;

    while (true) {
      const data = await fetch(`${API_URL}/api/expedition/tours?limit=${perPage}&page=${page}`);
      const batch = data?.data?.tours || [];
      tours.push(...batch);
      if (batch.length < perPage) break;
      page++;
      if (page > 100) break; // safety limit
    }

    console.log(`Found ${tours.length} tours`);

    const places = new Set();

    for (const listing of tours) {
      // API response is nested: tours[].tour.slug (listing -> tour)
      const tour = listing.tour || listing;
      const slug = tour.slug || listing.slug || listing.id;
      if (!slug) continue;

      const lastmod = tour.updatedAt || listing.updatedAt || tour.createdAt || listing.createdAt;
      const dateStr = lastmod ? new Date(lastmod).toISOString().split('T')[0] : undefined;

      urls.push(urlEntry(`${SITE_URL}/tour/${encodeURIComponent(slug)}`, {
        priority: 0.8,
        changefreq: 'weekly',
        lastmod: dateStr,
      }));

      // Collect unique places for destination pages
      const city = tour.city || listing.city;
      const region = tour.region || listing.region;
      if (city) places.add(city);
      if (region) places.add(region);
    }

    // Destination pages
    for (const place of places) {
      urls.push(urlEntry(`${SITE_URL}/tours?place=${encodeURIComponent(place)}`, {
        priority: 0.7,
        changefreq: 'weekly',
      }));
    }

    console.log(`Generated ${urls.length} URLs (${tours.length} tours, ${places.size} destinations)`);
  } catch (err) {
    console.error('Warning: Could not fetch tours:', err.message);
    console.log('Generating sitemap with static pages only.');
  }

  // Write sitemap
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join('\n')}
</urlset>`;

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, xml, 'utf8');
  console.log(`Sitemap written to ${OUTPUT} (${(Buffer.byteLength(xml) / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
