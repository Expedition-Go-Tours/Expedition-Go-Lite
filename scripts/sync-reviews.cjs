#!/usr/bin/env node
/**
 * sync-reviews.cjs — Standalone scraper for TripAdvisor + GetYourGuide reviews.
 *
 * Usage:
 *   npm install puppeteer   # one-time
 *   node scripts/sync-reviews.cjs
 *
 * Writes src/data/externalReviews.json consumed by the frontend.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────────

const TRIPADVISOR_TOURS = [
  {
    url: 'https://www.tripadvisor.com/AttractionProductReview-g293797-d24189724-Cape_Coast_Castle_Elmina_Castle_Kakum_National_Park_Day_Tour-Accra_Greater_Accra.html',
    title: 'Cape Coast Castle, Elmina Castle & Kakum National Park Day Tour',
  },
  {
    url: 'https://www.tripadvisor.com/AttractionProductReview-g293797-d25225851-From_Accra_Waterfalls_Aburi_Gardens_Cocoa_Farm_Day_Tour-Accra_Greater_Accra.html',
    title: 'From Accra: Waterfalls, Aburi Gardens & Cocoa Farm Day Tour',
  },
  {
    url: 'https://www.tripadvisor.com/AttractionProductReview-g293797-d25217516-Accra_Guided_City_Tour_Cultural_and_Historical_Experience-Accra_Greater_Accra.html',
    title: 'Accra Guided City Tour: Cultural and Historical Experience',
  },
  {
    url: 'https://www.tripadvisor.com/AttractionProductReview-g293797-d25275033-Shia_Hills_Safari_Akosombo_Boat_Cruise_Day_Tour-Accra_Greater_Accra.html',
    title: 'Shai Hills Safari & Akosombo Boat Cruise Day Tour',
  },
  {
    url: 'https://www.tripadvisor.com/AttractionProductReview-g293797-d25225556-From_Accra_Private_Airport_Transfer_Pickup_Drop_off_Services-Accra_Greater_Accra.html',
    title: 'From Accra: Private Airport Transfer Pickup & Drop off Services',
  },
  {
    url: 'https://www.tripadvisor.com/AttractionProductReview-g293797-d25225555-The_Kumasi_Cultural_and_Heritage_Day_Tour-Accra_Greater_Accra.html',
    title: 'The Kumasi Cultural and Heritage Day Tour',
  },
  {
    url: 'https://www.tripadvisor.com/AttractionProductReview-g293797-d34552807-Ghanaian_Cultural_Art_Tour_and_Scented_Candle_Making_Experience-Accra_Greater_Accr.html',
    title: 'Ghanaian Cultural Art Tour and Scented Candle Making Experience',
  },
  {
    url: 'https://www.tripadvisor.com/AttractionProductReview-g293797-d34552809-Waterfalls_Massage_with_Aburi_Gardens_and_Cocoa_Farm_Tour-Accra_Greater_Accra.html',
    title: 'Waterfalls Massage with Aburi Gardens and Cocoa Farm Tour',
  },
];

const GETYOURGUIDE_TOURS = [
  {
    url: 'https://www.getyourguide.com/accra-l506/from-accra-the-cape-coast-day-tour-guided-experience-t834942/',
    title: 'From Accra: The Cape Coast Day Tour Guided Experience',
  },
  {
    url: 'https://www.getyourguide.com/accra-l506/accra-guided-city-tour-experience-t839108/',
    title: 'Accra Guided City Tour Experience',
  },
  {
    url: 'https://www.getyourguide.com/accra-l506/boti-falls-umbrella-rock-aburi-gardens-cocoa-farm-tour-t866545/',
    title: 'Boti Falls, Umbrella Rock, Aburi Gardens & Cocoa Farm Tour',
  },
  {
    url: 'https://www.getyourguide.com/ghana-eastern-region-l147826/accra-mini-safari-rock-climbing-museum-boat-cruise-tour-t1170966/',
    title: 'Accra Mini Safari, Rock Climbing, Museum & Boat Cruise Tour',
  },
  {
    url: 'https://www.getyourguide.com/accra-l506/kotoka-domestic-airport-transfer-with-mini-accra-city-tour-t1243777/',
    title: 'Kotoka Domestic Airport Transfer with Mini Accra City Tour',
  },
  {
    url: 'https://www.getyourguide.com/accra-l506/accra-sankofa-gallery-art-tour-candle-making-workshop-t1404702/',
    title: 'Accra Sankofa Gallery Art Tour & Candle Making Workshop',
  },
];

const GOOGLE_LISTING_URL = 'https://www.google.com/maps/place/Expedition-Go+Tours+LTD';
const GOOGLE_REVIEWS_TOURS = [
  'Cape Coast Castle, Elmina Castle & Kakum National Park Day Tour',
  'Accra Guided City Tour: Cultural and Historical Experience',
  'Accra Guided City Tour Experience',
  'From Accra: Waterfalls, Aburi Gardens & Cocoa Farm Day Tour',
  'From Accra: The Cape Coast Day Tour Guided Experience',
  'Shai Hills Safari & Akosombo Boat Cruise Day Tour',
  'Boti Falls, Umbrella Rock, Aburi Gardens & Cocoa Farm Tour',
  'Accra Sankofa Gallery Art Tour & Candle Making Workshop',
  'Kotoka Domestic Airport Transfer with Mini Accra City Tour',
  'Accra Mini Safari, Rock Climbing, Museum & Boat Cruise Tour',
];

const PAGES_TO_SCRAPE = 100;
const DELAY_BETWEEN_PAGES_MS = 4000;
const DELAY_BETWEEN_TOURS_MS = 3000;
// A healthy deep run yields 500+ reviews; below this the scrape is treated as
// failed (bot wall / DOM change) and must never overwrite the committed file.
const MIN_EXPECTED_REVIEWS = 500;
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'externalReviews.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashString(str) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 12);
}

function clampRating(rating) {
  const r = parseInt(rating);
  if (isNaN(r)) return 5;
  return Math.max(1, Math.min(5, r));
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ─── TripAdvisor Scraper ─────────────────────────────────────────────────────

async function scrapeTripAdvisorTour(page, tour, pagesToScrape) {
  const reviews = [];
  let platformReviewCount = null;

  for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
    const pageUrl = pageNum === 1
      ? tour.url
      : tour.url.replace('-Review-', `-Review-or${(pageNum - 1) * 10}-`);

    console.log(`  [TA] Page ${pageNum}/${pagesToScrape}: ${tour.title}`);

    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector(
        '[data-automation="reviewCard"], .review-container, .biGQs._P.pZUbB.KxBGd',
        { timeout: 10000 }
      ).catch(() => {});

      // Extract total review count from the page (first page only)
      if (pageNum === 1 && platformReviewCount === null) {
        platformReviewCount = await page.evaluate(() => {
          // Look for text like "911 reviews" in the review header area
          const allText = document.body.innerText || '';
          const match = allText.match(/([\d,]+)\s+reviews/i);
          return match ? parseInt(match[1].replace(/,/g, '')) : null;
        }).catch(() => null);
      }

      const pageReviews = await page.evaluate(() => {
        const cards = document.querySelectorAll(
          '[data-automation="reviewCard"], .review-container, .biGQs._P.pZUbB.KxBGd'
        );

        return Array.from(cards).map((card) => {
          const ratingEl = card.querySelector('[class*="bubble_"]');
          const ratingClass = ratingEl?.className || '';
          const ratingMatch = ratingClass.match(/bubble_(\d+)/);
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;

          const nameEl = card.querySelector('.info_text .default_name, a[href*="/Profile/"] span');
          const reviewerName = nameEl?.textContent?.trim() || '';

          const titleEl = card.querySelector('.noQuotes, .cRVSd span');
          const title = titleEl?.textContent?.trim() || '';

          const textEl = card.querySelector('.partial_entry, .glasR4aX');
          const text = textEl?.textContent?.trim() || '';

          const dateEl = card.querySelector('.rating .relativeDate, span[class*="eventDate"]');
          const date = dateEl?.getAttribute('title') || dateEl?.textContent?.trim() || '';

          const avatarEl = card.querySelector('.avatar, img[src*="avatar"]');
          const avatar = avatarEl?.getAttribute('src') || null;

          const reviewId = card.querySelector('[id]')?.id?.replace('review_', '') || null;

          return { externalId: reviewId, reviewerName, rating, title, text, date, reviewerAvatar: avatar };
        }).filter((r) => r.reviewerName || r.text);
      });

      // Stop early if the page yielded no reviews (past the last page)
      if (pageReviews.length === 0 && pageNum > 1) {
        console.log(`    No more reviews — stopping pagination for this tour`);
        break;
      }

      reviews.push(...pageReviews);
      console.log(`    Found ${pageReviews.length} reviews`);
    } catch (err) {
      console.warn(`    Failed: ${err.message}`);
    }

    if (pageNum < pagesToScrape) await sleep(DELAY_BETWEEN_PAGES_MS);
  }

  return reviews.map((r) => ({
    id: r.externalId || `ta_${hashString(r.reviewerName + r.title + r.text.slice(0, 100))}`,
    source: 'TRIPADVISOR',
    reviewerName: r.reviewerName,
    reviewerAvatar: r.reviewerAvatar,
    rating: clampRating(r.rating),
    title: r.title || null,
    text: r.text || '(No review text)',
    textTruncated: r.text.length > 200 ? r.text.slice(0, 197) + '...' : r.text,
    tourTitle: tour.title,
    tourThumbnail: null,
    tourUrl: tour.url,
    tourLink: tour.url,
    coverPhoto: null,
    originalDate: normalizeDate(r.date),
    platformReviewCount,
  }));
}

// ─── GetYourGuide Scraper ────────────────────────────────────────────────────

async function scrapeGetYourGuideTour(page, tour, pagesToScrape) {
  const reviews = [];
  let platformReviewCount = null;

  for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
    const pageUrl = pageNum === 1
      ? tour.url
      : `${tour.url}?page=${pageNum}`;

    console.log(`  [GYG] Page ${pageNum}/${pagesToScrape}: ${tour.title}`);

    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('[data-activity-review-card], .review-card, .review', { timeout: 10000 }).catch(() => {});

      // Extract total review count from the page (first page only)
      if (pageNum === 1 && platformReviewCount === null) {
        platformReviewCount = await page.evaluate(() => {
          const allText = document.body.innerText || '';
          const match = allText.match(/([\d,]+)\s+reviews/i);
          return match ? parseInt(match[1].replace(/,/g, '')) : null;
        }).catch(() => null);
      }

      const pageReviews = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-activity-review-card], .review-card, .review');
        return Array.from(cards).map((card) => {
          const nameEl = card.querySelector('.reviewer-name, .user-profile-name, [class*="userName"]');
          const titleEl = card.querySelector('.review-title, h3, [class*="reviewTitle"]');
          const textEl = card.querySelector('.review-text, .review-body, [class*="reviewText"]');
          const ratingEl = card.querySelector('[class*="rating"], [data-rating]');
          const dateEl = card.querySelector('.review-date, time, [class*="date"]');
          const avatarEl = card.querySelector('img[class*="avatar"], img[class*="profile"]');

          const ratingAttr = ratingEl?.getAttribute('data-rating') || ratingEl?.className || '';
          const ratingMatch = ratingAttr.match(/(\d+)/);
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;

          return {
            externalId: null,
            reviewerName: nameEl?.textContent?.trim() || 'Anonymous',
            reviewerAvatar: avatarEl?.getAttribute('src') || null,
            rating,
            title: titleEl?.textContent?.trim() || '',
            text: textEl?.textContent?.trim() || '',
            date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '',
          };
        }).filter((r) => r.reviewerName !== 'Anonymous' || r.text);
      });

      // Stop early if the page yielded no reviews (past the last page)
      if (pageReviews.length === 0 && pageNum > 1) {
        console.log(`    No more reviews — stopping pagination for this tour`);
        break;
      }

      reviews.push(...pageReviews);
      console.log(`    Found ${pageReviews.length} reviews`);
    } catch (err) {
      console.warn(`    Failed: ${err.message}`);
    }

    if (pageNum < pagesToScrape) await sleep(DELAY_BETWEEN_PAGES_MS);
  }

  return reviews.map((r) => ({
    id: r.externalId || `gyg_${hashString(r.reviewerName + r.title + r.text.slice(0, 100))}`,
    source: 'GETYOURGUIDE',
    reviewerName: r.reviewerName,
    reviewerAvatar: r.reviewerAvatar,
    rating: clampRating(r.rating),
    title: r.title || null,
    text: r.text || '(No review text)',
    textTruncated: r.text.length > 200 ? r.text.slice(0, 197) + '...' : r.text,
    tourTitle: tour.title,
    tourThumbnail: null,
    tourUrl: tour.url,
    tourLink: tour.url,
    coverPhoto: null,
    originalDate: normalizeDate(r.date),
    platformReviewCount,
  }));
}

// ─── Google Maps Scraper ─────────────────────────────────────────────────────

async function scrapeGoogleReviews(page) {
  console.log(`  [Google] Scraping reviews from Google Maps...`);

  try {
    await page.goto(GOOGLE_LISTING_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Click the Reviews tab if available
    const reviewsTab = await page.$('[data-tab-id="reviews"], [role="tab"][aria-label*="Reviews"], button[jsaction*="reviews"]');
    if (reviewsTab) {
      await reviewsTab.click();
      await sleep(3000);
    }

    // Extract total review count from the Maps listing
    const platformReviewCount = await page.evaluate(() => {
      const allText = document.body.innerText || '';
      // Google Maps shows "X reviews" near the rating
      const match = allText.match(/([\d,]+)\s+reviews/i);
      return match ? parseInt(match[1].replace(/,/g, '')) : null;
    }).catch(() => null);

    // Scroll to load more reviews (10 rounds for deeper scrape)
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        const scrollable = document.querySelector('[class*="m6QErb"][class*="DxyBCb"], .section-scrollbox, [role="main"]');
        if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
      });
      await sleep(2000);
    }

    const pageReviews = await page.evaluate(() => {
      const reviewEls = document.querySelectorAll('.jftiEf, .review-container, [class*="review-item"], [data-review-id]');
      return Array.from(reviewEls).map((el) => {
        const nameEl = el.querySelector('.d4r55, .reviewer-name, [class*="userName"], span[class*="fontBodyMedium"] span:first-child');
        const ratingEl = el.querySelector('[role="img"][aria-label*="star"], .kvMYJc, [class*="rating"]');
        const textEl = el.querySelector('.wiI7pd, .review-text, [class*="reviewText"], span[class*="fontBodyMedium"]');
        const dateEl = el.querySelector('.rsqaWe, .review-date, [class*="date"]');

        let rating = 5;
        if (ratingEl) {
          const ariaLabel = ratingEl.getAttribute('aria-label') || '';
          const ratingMatch = ariaLabel.match(/(\d+)/);
          if (ratingMatch) rating = parseInt(ratingMatch[1]);
        }

        return {
          reviewerName: nameEl?.textContent?.trim() || '',
          rating,
          text: textEl?.textContent?.trim() || '',
          date: dateEl?.textContent?.trim() || '',
        };
      }).filter((r) => r.reviewerName && r.text);
    });

    // Only publish Google reviews above 3 stars — 3★ and below are excluded
    // from the storefront (and from the committed stats).
    const visibleReviews = pageReviews.filter((r) => clampRating(r.rating) > 3);
    console.log(`    Found ${pageReviews.length} reviews (${visibleReviews.length} kept, >3 stars)`);

    // Distribute reviews across known tour titles
    return visibleReviews.map((r, i) => ({
      id: `goog_${hashString(r.reviewerName + r.text.slice(0, 100))}`,
      source: 'GOOGLE',
      reviewerName: r.reviewerName,
      reviewerAvatar: null,
      rating: clampRating(r.rating),
      title: null,
      text: r.text || '(No review text)',
      textTruncated: r.text.length > 200 ? r.text.slice(0, 197) + '...' : r.text,
      tourTitle: GOOGLE_REVIEWS_TOURS[i % GOOGLE_REVIEWS_TOURS.length],
      tourThumbnail: null,
      tourUrl: GOOGLE_LISTING_URL,
      tourLink: GOOGLE_LISTING_URL,
      coverPhoto: null,
      originalDate: normalizeDate(r.date),
      platformReviewCount,
    }));
  } catch (err) {
    console.warn(`    Failed: ${err.message}`);
    return [];
  }
}

// ─── Stats Computation ───────────────────────────────────────────────────────

function computeStats(reviews) {
  // Use the actual platform-level review counts (from platformReviewCount on
  // each scraped entry) instead of just counting scraped entries.  This gives
  // the real total reviews across TripAdvisor, GetYourGuide, etc.
  const platformMaxes = {};
  for (const r of reviews) {
    if (r.platformReviewCount != null) {
      const cur = platformMaxes[r.source] || 0;
      platformMaxes[r.source] = Math.max(cur, r.platformReviewCount);
    }
  }
  const totalReviews = Object.values(platformMaxes).reduce((s, v) => s + v, 0)
    || reviews.length;

  const averageRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const platforms = {};
  for (const r of reviews) {
    if (!platforms[r.source]) platforms[r.source] = { count: 0, sum: 0 };
    platforms[r.source].count++;
    platforms[r.source].sum += r.rating;
  }

  return {
    totalReviews,
    averageRating,
    platforms: Object.entries(platforms).map(([source, { count, sum }]) => ({
      source,
      reviewCount: platformMaxes[source] || count,
      averageRating: Math.round((sum / count) * 10) / 10,
    })),
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  let puppeteer;
  try {
    // Puppeteer 25 is ESM-only; dynamic import works from this CommonJS file.
    const mod = await import('puppeteer');
    puppeteer = mod.default ?? mod;
  } catch {
    console.error('puppeteer not installed. Run: npm install puppeteer');
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const allReviews = [];

    // TripAdvisor
    console.log(`\nScraping ${TRIPADVISOR_TOURS.length} TripAdvisor tours...`);
    for (let i = 0; i < TRIPADVISOR_TOURS.length; i++) {
      const tour = TRIPADVISOR_TOURS[i];
      const reviews = await scrapeTripAdvisorTour(page, tour, PAGES_TO_SCRAPE);
      allReviews.push(...reviews);
      if (i < TRIPADVISOR_TOURS.length - 1) await sleep(DELAY_BETWEEN_TOURS_MS);
    }

    // GetYourGuide
    console.log(`\nScraping ${GETYOURGUIDE_TOURS.length} GetYourGuide tours...`);
    for (let i = 0; i < GETYOURGUIDE_TOURS.length; i++) {
      const tour = GETYOURGUIDE_TOURS[i];
      const reviews = await scrapeGetYourGuideTour(page, tour, PAGES_TO_SCRAPE);
      allReviews.push(...reviews);
      if (i < GETYOURGUIDE_TOURS.length - 1) await sleep(DELAY_BETWEEN_TOURS_MS);
    }

    // Google Maps
    console.log(`\nScraping Google Maps reviews...`);
    const googleReviews = await scrapeGoogleReviews(page);
    allReviews.push(...googleReviews);

    // Never overwrite the committed reviews with an empty/partial scrape: a
    // bot-blocked or DOM-changed run must fail loudly instead of wiping the
    // storefront's social proof.
    if (allReviews.length < MIN_EXPECTED_REVIEWS) {
      throw new Error(
        `Only ${allReviews.length} reviews scraped (minimum ${MIN_EXPECTED_REVIEWS}) — refusing to overwrite ${OUTPUT_PATH}`
      );
    }

    // Compute stats and write output
    const stats = computeStats(allReviews);
    const output = { reviews: allReviews, stats };

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

    console.log(`\nDone! Wrote ${allReviews.length} reviews to ${OUTPUT_PATH}`);
    console.log(`Stats: ${stats.averageRating}★ from ${stats.totalReviews} reviews`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
