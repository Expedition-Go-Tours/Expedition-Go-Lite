import { useQuery } from '@tanstack/react-query'
import type { TourDetail, TravelerPricing, GroupSizeBand, PricingTier, ItineraryDay } from '../lib/tourTypes'
import { fetchWithAuth } from '../lib/api'

/**
 * `bypassCache` skips the browser's HTTP cache for this request. The tour
 * detail endpoints respond with `Cache-Control: max-age=60`, so a page
 * revisited within that window would otherwise get a stale response even
 * though our own refetch fired — that would hide a supplier's just-saved
 * pricing/tier change for up to a minute. Used for the tour-detail fetches
 * (useExpeditionTour) where freshness matters most; other listing fetches
 * keep the default caching to avoid unnecessary network traffic.
 */
async function expeditionFetchRaw(path: string, bypassCache = false) {
  const res = await fetchWithAuth(path, {
    ...(bypassCache ? { cache: 'no-store' } : {}),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.message || `Request failed (${res.status})`)
  }
  return payload
}

export function extractStartingPriceFromRaw(sp: unknown): number | null {
  if (!sp) return null;
  try {
    const data = typeof sp === 'string' ? JSON.parse(sp) : sp as Record<string, any>;

    // Path 1: pricingSchedules -> schedules[].prices/ pricingCategories
    const schedules = (data as any)?.pricingSchedules?.schedules;
    if (Array.isArray(schedules) && schedules.length > 0) {
      for (const s of schedules) {
        const prices = Array.isArray(s?.prices) ? s.prices : [];
        for (const p of prices) {
          const ag = (p?.ageGroup || '').toLowerCase();
          if ((ag === 'adult' || ag === 'adults') && p?.retailPrice != null) {
            return Number(p.retailPrice);
          }
        }
        const cats = Array.isArray(s?.pricingCategories) ? s.pricingCategories : [];
        for (const c of cats) {
          const name = (c?.name || '').toLowerCase();
          if ((name === 'adult' || name === 'adults') && c?.price != null) {
            return Number(c.price);
          }
        }
        if (s?.uniformPrice != null) return Number(s.uniformPrice);
        if (prices.length > 0 && prices[0]?.retailPrice != null) return Number(prices[0].retailPrice);
        if (cats.length > 0 && cats[0]?.price != null) return Number(cats[0].price);
      }
    }

    // Path 2: travelerDetails.pricingCategories (no schedules case)
    const td = (data as any)?.travelerDetails;
    if (td) {
      if (td.uniformPrice != null) return Number(td.uniformPrice);
      const cats = Array.isArray(td.pricingCategories) ? td.pricingCategories : [];
      for (const c of cats) {
        const name = (c?.name || '').toLowerCase();
        if ((name === 'adult' || name === 'adults') && c?.price != null) {
          return Number(c.price);
        }
      }
      if (cats.length > 0 && cats[0]?.price != null) return Number(cats[0].price);
    }

    return null;
  } catch {
    return null;
  }
}

function parseJsonMaybe(value: unknown): any {
  if (!value) return {}
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return {} }
  }
  return value
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    if (days === 1) return 'Full Day'
    return `${days} days`
  }
  const hours = Math.round(minutes / 60)
  return `${hours} hour${hours > 1 ? 's' : ''}`
}

function formatPrice(price: number | null): string {
  if (price == null || price === 0) return ''
  return `$${price}`
}

interface ExpeditionTourRecord {
  id: string
  displayOrder: number
  isFeatured: boolean
  bookingFlow: 'DIRECT' | 'EXTERNAL'
  externalUrl: string | null
  tour: {
    id: string
    title: string
    slug: string
    description: string | null
    coverPhoto: string | null
    photos: string[]
    category: string | null
    durationMinutes: number | null
    startingPrice: number | null
    currency: string
    averageRating: number | null
    reviewCount: number
    viewCount: number
    city: string | null
    country: string | null
    categorization?: any
    productContent?: any
    bookingAndTickets?: any
    difficulty?: string | null
    cancellationPolicy?: string | null
    pickupIncluded?: boolean | null
    supplierName: string | null
    supplierPhoto: string | null
    bookingFlow: 'DIRECT' | 'EXTERNAL'
    externalUrl: string | null
    features: string
    languages: string[]
    schedulesAndPricing?: any
  }
}

export interface TourCardData {
  id: string
  title: string
  category: string
  duration: string
  features: string
  price: string
  rating: string
  reviews: number
  location: string
  image: string
  source: 'expedition-go' | 'travio-africa'
  externalUrl?: string
  slug: string
  languages?: string[]
  difficulty?: string
  cancellationPolicy?: string
  pickupIncluded?: boolean
  /** Numeric equivalents for client-side filtering (All Tours page). */
  durationMinutes?: number | null
  priceValue?: number | null
  ratingValue?: number | null
}
function extractDurationFromTour(tour: any): number | null {
  try {
    const cat = typeof tour.categorization === 'string' ? JSON.parse(tour.categorization) : tour.categorization
    const d = cat?.duration
    if (!d || d.value == null) return null
    const val = Number(d.value)
    if (!Number.isFinite(val) || val <= 0) return null
    const unit = (d.unit || '').toLowerCase()
    if (unit === 'minutes') return val
    if (unit === 'hours') return val * 60
    if (unit === 'days') return val * 1440
    if (unit === 'weeks') return val * 10080
    return val * 60
  } catch {
    return null
  }
}

function extractCityFromTour(tour: any): string | null {
  try {
    const pc = typeof tour.productContent === 'string' ? JSON.parse(tour.productContent) : tour.productContent
    const loc = Array.isArray(pc?.locations) ? pc.locations[0] : null
    if (!loc) return null
    const addr = (loc.address || loc.name || '').trim()
    const parts = addr.split(',').map((s: string) => s.trim()).filter(Boolean)
    if (parts.length < 2) return null

    const country = parts[parts.length - 1]
    const nonCityKeywords = ['region', 'district', 'municipal', 'municipality', 'area', 'highway',
      'road', 'street', 'avenue', 'lane', 'drive', 'boulevard', 'circle', 'close', 'way',
      'junction', 'interchange', 'estate', 'park', 'gardens', 'heights', 'village', 'town']

    for (let i = parts.length - 2; i >= 0; i--) {
      const p = parts[i]
      if (p === country) continue
      const lower = p.toLowerCase()
      if (nonCityKeywords.some(k => lower.includes(k))) continue
      if (/[\d]/.test(p) && /-/.test(p)) continue
      if (lower.length < 2 || lower.length > 40) continue
      return p
    }

    return parts.length >= 3 ? parts[parts.length - 3] : parts[0]
  } catch {
    return null
  }
}

function extractCountryFromTour(tour: any): string | null {
  try {
    const pc = typeof tour.productContent === 'string' ? JSON.parse(tour.productContent) : tour.productContent
    const loc = Array.isArray(pc?.locations) ? pc.locations[0] : null
    if (!loc) return null
    const addr = (loc.address || loc.name || '').trim()
    const parts = addr.split(',').map((s: string) => s.trim()).filter(Boolean)
    return parts.length > 0 ? parts[parts.length - 1] : null
  } catch {
    return null
  }
}

function extractDifficultyFromTour(tour: any): string | null {
  try {
    if (tour?.difficulty) return String(tour.difficulty)
    const cat = typeof tour?.categorization === 'string' ? JSON.parse(tour.categorization) : tour?.categorization
    return cat?.difficulty ? String(cat.difficulty) : null
  } catch {
    return null
  }
}

function formatCancellationPolicy(policy: any): string | null {
  if (policy == null) return null
  if (typeof policy === 'string') {
    const trimmed = policy.trim()
    if (!trimmed) return null
    const lower = trimmed.toLowerCase()
    // Supplier "All sales final" / legacy non-refundable values.
    if (lower === 'all_sales_final' || lower === 'non-refundable' || lower === 'non_refundable') {
      return 'Non-refundable'
    }
    // Supplier "Standard" policy (free cancellation, default 24h window).
    if (lower === 'standard') return 'Free cancellation up to 24 hours before start time'
    return trimmed
  }
  if (typeof policy !== 'object') return null

  const type = String(policy.type ?? '').toLowerCase()
  // NOTE: cutoffHours on the supplier record is the booking cut-off (Step 15),
  // NOT the cancellation window — so a bare cutoffHours: 0 must NOT be read as
  // "non-refundable". Newer "standard" / "all_sales_final" records carry the
  // cancellation window in cancellationWindowHours instead.
  const cutoffHours = policy.cutoffHours
  const windowHours = policy.cancellationWindowHours ?? policy.freeCancellationHours
  const refundPct = policy.refundPercentage ?? policy.refundRate
  const hasRules = typeof policy.refundRules === 'string' && policy.refundRules.trim() !== ''
  const label = typeof policy.label === 'string' && policy.label.trim() ? policy.label.trim() : null

  // Non-refundable: the supplier's "All sales final" choice, legacy
  // non-refundable types, or an explicit 0% refund.
  if (
    type === 'all_sales_final' ||
    type === 'non-refundable' ||
    type === 'non_refundable' ||
    (refundPct != null && Number(refundPct) === 0)
  ) {
    return 'Non-refundable'
  }

  // Supplier's "Standard" choice — free cancellation up to the configured
  // window (defaults to the platform-standard 24 hours).
  if (type === 'standard') {
    const h = windowHours != null && Number(windowHours) > 0
      ? Math.round(Number(windowHours))
      : (cutoffHours != null && Number(cutoffHours) > 0 ? Math.round(Number(cutoffHours)) : 24)
    return `Free cancellation up to ${h} hours before start time`
  }

  // Legacy structured rules (freeCancellation days-before window).
  const freeRule = policy.freeCancellation
  if (freeRule && typeof freeRule === 'object') {
    const days = Number(freeRule.daysBefore)
    if (Number.isFinite(days) && days > 0) {
      return `Free cancellation up to ${days} ${days === 1 ? 'day' : 'days'} before start time`
    }
  }

  // Legacy flexible policies stored the free-cancellation window in
  // cutoffHours (or cancellationWindowHours).
  const legacyHours = (cutoffHours != null && Number(cutoffHours) > 0)
    ? Number(cutoffHours)
    : (windowHours != null && Number(windowHours) > 0 ? Number(windowHours) : null)
  if (legacyHours != null) {
    const h = Math.round(legacyHours)
    if (refundPct == null || Number(refundPct) >= 100) {
      return `Free cancellation up to ${h} hours before start time`
    }
    return `Cancel up to ${h} hours before start time with ${refundPct}% refund`
  }

  if (type === 'flexible') return 'Free cancellation'
  if (type === 'strict') return 'Strict cancellation policy'
  if (type === 'moderate') return 'Moderate cancellation policy'
  if (label) return label
  if (hasRules) return policy.refundRules.trim()
  return null
}

function extractCancellationFromTour(tour: any): string | null {
  try {
    if (tour?.cancellationPolicy != null) {
      const formatted = formatCancellationPolicy(tour.cancellationPolicy)
      if (formatted) return formatted
    }
    const bt = typeof tour?.bookingAndTickets === 'string'
      ? JSON.parse(tour.bookingAndTickets)
      : tour?.bookingAndTickets
    const policy = bt?.cancellationPolicy
    const formatted = formatCancellationPolicy(policy)
    if (formatted) return formatted
    // A configured policy that isn't explicitly non-refundable defaults to the
    // platform-standard free cancellation policy, so tours created with the
    // supplier's "Standard" option still show "Free Cancellation" on cards.
    if (policy != null && typeof policy === 'object' && Object.keys(policy).length > 0) {
      return 'Free cancellation up to 24 hours before'
    }
    return null
  } catch {
    return null
  }
}

function extractTravelerPricing(rawTour: any): TravelerPricing[] {
  try {
    const sp = typeof rawTour?.schedulesAndPricing === 'string'
      ? JSON.parse(rawTour.schedulesAndPricing)
      : rawTour?.schedulesAndPricing
    if (!sp) return []
    const td = sp.travelerDetails || {}
    const pricingModel = td.pricingModel || 'perPerson'

    // perGroup tours don't have per-traveler-type pricing at all — the
    // group-size bands are surfaced separately via extractGroupSizePricing().
    if (pricingModel === 'perGroup') return []

    const pricingApproach = td.pricingApproach || 'dependsOnAge'

    // sameForEveryone: a single flat per-person price applies to every
    // traveler type (adult/child/infant alike) — mirrors the backend's
    // calculateTourPrice() sameForEveryone branch, which charges
    // uniformPrice * count for every non-zero traveler bucket.
    if (pricingApproach === 'sameForEveryone') {
      const uniformPrice = td.uniformPrice != null ? Number(td.uniformPrice) : 0
      return [
        { label: 'Adult', price: uniformPrice, minAge: null, maxAge: null },
        { label: 'Child', price: uniformPrice, minAge: null, maxAge: null },
        { label: 'Infant', price: uniformPrice, minAge: null, maxAge: null },
      ]
    }

    // Prefer schedule prices (ageGroup -> retailPrice), these drive checkout pricing.
    const priceByLabel = new Map<string, number>()
    for (const s of Array.isArray(sp?.pricingSchedules?.schedules) ? sp.pricingSchedules.schedules : []) {
      for (const p of Array.isArray(s?.prices) ? s.prices : []) {
        if (p?.ageGroup && p?.retailPrice != null && !priceByLabel.has(p.ageGroup)) {
          priceByLabel.set(p.ageGroup, Number(p.retailPrice))
        }
      }
      if (priceByLabel.size > 0) break
    }

    const metaByLabel = new Map<string, { price?: number; minAge?: number | null; maxAge?: number | null; tiers?: PricingTier[] }>()
    for (const c of Array.isArray(td.pricingCategories) ? td.pricingCategories : []) {
      if (c?.name && !metaByLabel.has(c.name)) {
        const tiers = Array.isArray(c.tiers)
          ? c.tiers
            .filter((t: any) => t && t.pricePerPerson != null)
            .map((t: any) => ({
              from: t.from != null ? Number(t.from) : 1,
              to: t.to != null ? Number(t.to) : Infinity,
              pricePerPerson: Number(t.pricePerPerson),
            }))
          : undefined
        metaByLabel.set(c.name, {
          price: c.price != null ? Number(c.price) : undefined,
          minAge: c.minAge ?? null,
          maxAge: c.maxAge ?? null,
          tiers: tiers && tiers.length > 0 ? tiers : undefined,
        })
      }
    }

    const groups: { label: string; minAge?: number | null; maxAge?: number | null }[] | null =
      Array.isArray(td.ageGroups) && td.ageGroups.length > 0 ? td.ageGroups : null
    const labels = groups && groups.length > 0
      ? groups.map((g) => g.label).filter(Boolean)
      : Array.from(new Set([...priceByLabel.keys(), ...metaByLabel.keys()]))

    return labels.map((label: string) => {
      const group = groups?.find((g) => g.label === label)
      const meta = metaByLabel.get(label)
      const price = priceByLabel.get(label) ?? meta?.price ?? 0
      return {
        label,
        price,
        minAge: group?.minAge ?? meta?.minAge ?? null,
        maxAge: group?.maxAge ?? meta?.maxAge ?? null,
        tiers: meta?.tiers,
      }
    })
  } catch {
    return []
  }
}

/** Returns 'perPerson' or 'perGroup' — mirrors td.pricingModel used throughout the backend. */
function extractPricingModel(rawTour: any): 'perPerson' | 'perGroup' {
  try {
    const sp = typeof rawTour?.schedulesAndPricing === 'string'
      ? JSON.parse(rawTour.schedulesAndPricing)
      : rawTour?.schedulesAndPricing
    return sp?.travelerDetails?.pricingModel === 'perGroup' ? 'perGroup' : 'perPerson'
  } catch {
    return 'perPerson'
  }
}

function extractPricingApproach(rawTour: any): 'sameForEveryone' | 'dependsOnAge' {
  try {
    const sp = typeof rawTour?.schedulesAndPricing === 'string'
      ? JSON.parse(rawTour.schedulesAndPricing)
      : rawTour?.schedulesAndPricing
    return sp?.travelerDetails?.pricingApproach === 'sameForEveryone' ? 'sameForEveryone' : 'dependsOnAge'
  } catch {
    return 'dependsOnAge'
  }
}

function extractUniformPrice(rawTour: any): number | null {
  try {
    const sp = typeof rawTour?.schedulesAndPricing === 'string'
      ? JSON.parse(rawTour.schedulesAndPricing)
      : rawTour?.schedulesAndPricing
    const v = sp?.travelerDetails?.uniformPrice
    return v != null ? Number(v) : null
  } catch {
    return null
  }
}

/**
 * Flat price bands by total group headcount — used when the supplier chose
 * pricingModel: 'perGroup' in Step 14 of the product builder (GroupSizeStep /
 * PerGroupPriceStep), instead of per-traveler-type pricing.
 */
function extractGroupSizePricing(rawTour: any): GroupSizeBand[] {
  try {
    const sp = typeof rawTour?.schedulesAndPricing === 'string'
      ? JSON.parse(rawTour.schedulesAndPricing)
      : rawTour?.schedulesAndPricing
    const td = sp?.travelerDetails || {}
    if (td.pricingModel !== 'perGroup') return []
    const groupSizes = Array.isArray(td.groupSizes) ? td.groupSizes : []
    return groupSizes
      .filter((gs: any) => gs && gs.price != null)
      .map((gs: any) => ({
        from: gs.from != null ? Number(gs.from) : 1,
        to: gs.to != null ? Number(gs.to) : Infinity,
        price: Number(gs.price),
      }))
  } catch {
    return []
  }
}

function extractSkipTheLine(rawTour: any): string | null {
  try {
    const pc = typeof rawTour?.productContent === 'string'
      ? JSON.parse(rawTour.productContent)
      : rawTour?.productContent
    const options = Array.isArray(pc?.options) ? pc.options : []
    const value = options
      .map((o: any) => o?.skipTheLine)
      .find((v: unknown) => typeof v === 'string' && v && v !== 'none')
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

function parseProductContent(rawTour: any): any {
  if (!rawTour) return {}
  try {
    return typeof rawTour.productContent === 'string'
      ? JSON.parse(rawTour.productContent)
      : (rawTour.productContent || {})
  } catch {
    return {}
  }
}

function extractLanguagesFromTour(rawTour: any): string[] {
  try {
    const pc = parseProductContent(rawTour)
    const set = new Set<string>()
    const writing = pc?.writingLanguage
    if (typeof writing === 'string' && writing.trim()) set.add(writing.trim())
    const options = Array.isArray(pc?.options) ? pc.options : []
    for (const o of options) {
      if (Array.isArray(o?.languages)) {
        for (const l of o.languages) {
          if (typeof l === 'string' && l.trim()) set.add(l.trim())
        }
      }
    }
    return Array.from(set)
  } catch {
    return []
  }
}

/**
 * Returns just the single product content language chosen in Step 1 of
 * the supplier product builder (productContent.writingLanguage). Used for
 * tour card listings, which should show one language — not the full set
 * merged in from every per-option language (Step 12), which is what
 * extractLanguagesFromTour() returns for the tour detail page.
 */
function extractContentLanguage(rawTour: any): string[] {
  try {
    const writing = parseProductContent(rawTour)?.writingLanguage
    return typeof writing === 'string' && writing.trim() ? [writing.trim()] : []
  } catch {
    return []
  }
}

function extractWheelchairAccessible(rawTour: any): boolean {
  try {
    const pc = parseProductContent(rawTour)
    const options = Array.isArray(pc?.options) ? pc.options : []
    return options.some((o: any) => o?.wheelchairAccessible === true)
  } catch {
    return false
  }
}

function extractFoodProvided(rawTour: any): boolean {
  return !!parseProductContent(rawTour)?.foodProvided
}

function extractDrinksIncluded(rawTour: any): boolean {
  return !!parseProductContent(rawTour)?.drinksIncluded
}

function extractGuideType(rawTour: any): string {
  return (parseProductContent(rawTour)?.guideType as string) || 'tour-guide'
}

function extractGuideMaterials(rawTour: any): { audioGuide: boolean; infoBooklet: boolean } {
  try {
    const gm = parseProductContent(rawTour)?.guideMaterials || {}
    return {
      audioGuide: !!gm.audioGuide,
      infoBooklet: !!gm.infoBooklet,
    }
  } catch {
    return { audioGuide: false, infoBooklet: false }
  }
}

function extractPetFriendly(rawTour: any): boolean {
  return !!parseProductContent(rawTour)?.petFriendly
}

/**
 * Whether the tour is a private (not shared/group) experience. Sourced from
 * productContent.isPrivateActivity — note this field currently has no
 * supplier-facing UI to set it in TravioAfrica-Supplier's product builder,
 * so it will read as false/"No" for virtually all tours until that's added.
 */
function extractIsPrivateActivity(rawTour: any): boolean {
  return !!parseProductContent(rawTour)?.isPrivateActivity
}

interface MealInfo {
  type: string
  format: string
}

function extractMeals(rawTour: any): MealInfo[] {
  try {
    const meals = parseProductContent(rawTour)?.meals
    if (!Array.isArray(meals)) return []
    return meals
      .filter((m: any) => m && typeof m === 'object' && (m.type || m.format))
      .map((m: any) => ({ type: m.type || '', format: m.format || '' }))
  } catch {
    return []
  }
}

function extractDietaryOptions(rawTour: any): string[] {
  try {
    const pc = parseProductContent(rawTour)
    if (!pc?.showDietaryRestrictions) return []
    return Array.isArray(pc?.dietaryOptions) ? pc.dietaryOptions : []
  } catch {
    return []
  }
}

function normalizeDurationUnit(unit: unknown): 'minute' | 'hour' | 'day' {
  const u = String(unit || '').toLowerCase()
  if (u.startsWith('min')) return 'minute'
  if (u.startsWith('day')) return 'day'
  return 'hour'
}

/**
 * Resolves the tour's itinerary. Prefers the explicit `productContent.itinerary`
 * array (structured itinerary stops created in the supplier builder); when that
 * is absent or empty, falls back to deriving stops from `productContent.locations`
 * (the ordered list of places the tour visits), so tours that never filled in a
 * dedicated itinerary still show an itinerary section on the detail page.
 */
function extractItinerary(rawTour: any): ItineraryDay[] {
  try {
    const pc = parseProductContent(rawTour)
    const explicit = Array.isArray(pc?.itinerary) ? pc.itinerary : []
    if (explicit.length > 0) return explicit

    const locations = Array.isArray(pc?.locations) ? pc.locations : []
    if (locations.length === 0) return []

    return locations
      .filter((loc: any) => loc && (loc.name || loc.title))
      .map((loc: any, index: number) => ({
        day: index + 1,
        title: loc.name || loc.title || `Stop ${index + 1}`,
        description: typeof loc.description === 'string' ? loc.description : '',
        locationName: loc.name || loc.title || undefined,
        locationAddress: loc.address || undefined,
        locationLat: loc.lat != null ? loc.lat : null,
        locationLng: loc.lng != null ? loc.lng : null,
        duration: loc.timeSpent != null ? Number(loc.timeSpent) : undefined,
        durationUnit: loc.timeSpentUnit != null ? normalizeDurationUnit(loc.timeSpentUnit) : undefined,
        type: 'activity' as const,
        additionalFee: loc.admissionIncluded === 'no',
      }))
  } catch {
    return []
  }
}

function mapToListing(tour: ExpeditionTourRecord['tour']): TourCardData {
  const location = [tour.city, tour.country].filter(Boolean).join(', ')
  const isExternal = tour.bookingFlow === 'EXTERNAL'
  // Prefer the authoritative schedule-derived price whenever the record
  // carries schedulesAndPricing, falling back to the (possibly stale)
  // stored startingPrice only when no schedule data is available.
  const effectivePrice = extractStartingPriceFromRaw(tour.schedulesAndPricing) ?? tour.startingPrice
  // Cards show only the single Step 1 content language, not every
  // per-option language merged in — see extractContentLanguage().
  // The curated /expedition/tours select never includes productContent,
  // so prefer the already-enriched tour.languages (backfilled from the
  // full /tours listing by enrichExpeditionRecords) and only fall back to
  // reading productContent directly when it's actually present on `tour`.
  const languages = tour.languages?.length ? tour.languages : extractContentLanguage(tour)

  let effectiveDuration = tour.durationMinutes
  if (!effectiveDuration && tour.categorization) {
    const cat = typeof tour.categorization === 'string' ? JSON.parse(tour.categorization) : tour.categorization
    const d = cat?.duration
    if (d && d.value != null) {
      const val = Number(d.value)
      if (Number.isFinite(val) && val > 0) {
        const unit = (d.unit || '').toLowerCase()
        if (unit === 'minutes') effectiveDuration = val
        else if (unit === 'hours') effectiveDuration = val * 60
        else if (unit === 'days') effectiveDuration = val * 1440
        else effectiveDuration = val * 60
      }
    }
  }

  return {
    id: tour.id,
    title: tour.title,
    category: tour.category || '',
    duration: formatDuration(effectiveDuration),
    features: tour.features || '',
    price: formatPrice(effectivePrice),
    rating: tour.averageRating != null ? String(tour.averageRating) : '0',
    reviews: tour.reviewCount,
    location,
    image: tour.coverPhoto || tour.photos?.[0] || '',
    source: isExternal ? 'travio-africa' : 'expedition-go',
    externalUrl: isExternal ? (tour.externalUrl || undefined) : undefined,
    slug: tour.slug,
    languages: languages.length ? languages : undefined,
    difficulty: extractDifficultyFromTour(tour) || undefined,
    cancellationPolicy: extractCancellationFromTour(tour) || undefined,
    pickupIncluded: tour.pickupIncluded ?? (tour.bookingAndTickets?.pickupAvailable ?? tour.bookingAndTickets?.pickupProvided) ?? undefined,
    durationMinutes: effectiveDuration ?? tour.durationMinutes ?? null,
    priceValue: effectivePrice != null ? effectivePrice : null,
    ratingValue: tour.averageRating != null ? Number(tour.averageRating) : null,
  }
}

export interface ExpeditionToursFilters {
  page?: number
  limit?: number
  search?: string
  category?: string
  city?: string
  country?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular'
}

/**
 * The curated /expedition/tours endpoint only selects a handful of
 * top-level Tour columns (city, country, category, etc.), which are
 * frequently null — the real values live inside the productContent /
 * categorization / bookingAndTickets JSON blobs, which that endpoint
 * doesn't fetch. This cross-references the full /tours listing (which
 * does include those JSON blobs) to backfill missing listing fields
 * (location, difficulty, cancellation policy, duration, pickup, languages,
 * price) on curated records by tour ID, mutating them in place.
 */
async function enrichExpeditionRecords(records: ExpeditionTourRecord[]): Promise<void> {
  // Always run: curated records carry a stored startingPrice that can be
  // stale/wrong (e.g. a tour's Child price while adults are charged more),
  // which is only detectable by cross-referencing the full /tours listing.
  // There is no cheap way to detect staleness up front, so skip the old
  // "needsBatch" short-circuit to keep every listing price authoritative.
  try {
    const allPayload = await expeditionFetchRaw('/tours?limit=500')
    const allTours: any[] = allPayload.data?.tours ?? []
    const priceMap = new Map<string, number>()
    const cityMap = new Map<string, string | null>()
    const countryMap = new Map<string, string | null>()
    const durationMap = new Map<string, number | null>()
    const difficultyMap = new Map<string, string | null>()
    const cancellationMap = new Map<string, string | null>()
    const pickupMap = new Map<string, boolean | undefined>()
    const languagesMap = new Map<string, string[]>()
    const categoryMap = new Map<string, string | null>()
    for (const t of allTours) {
      const p = extractStartingPriceFromRaw(t.schedulesAndPricing)
      if (p != null) priceMap.set(t.id, p)
      cityMap.set(t.id, extractCityFromTour(t))
      countryMap.set(t.id, extractCountryFromTour(t))
      durationMap.set(t.id, extractDurationFromTour(t))
      difficultyMap.set(t.id, extractDifficultyFromTour(t))
      cancellationMap.set(t.id, extractCancellationFromTour(t))
      pickupMap.set(t.id, t.pickupIncluded ?? (t.bookingAndTickets?.pickupAvailable ?? t.bookingAndTickets?.pickupProvided) ?? undefined)
      // Cards show only the single Step 1 content language, not the full
      // per-option merge extractLanguagesFromTour() returns.
      languagesMap.set(t.id, extractContentLanguage(t))
      categoryMap.set(t.id, t.category ?? null)
    }
    for (const r of records) {
      // The curated /expedition/tours records carry a stored startingPrice
      // that can be stale/wrong (e.g. a tour's Child price while the adult
      // price is what checkout charges). Always prefer the authoritative
      // schedule-derived price from the full tour listing when known.
      const authoritativePrice = priceMap.get(r.tour.id)
      if (authoritativePrice != null) r.tour.startingPrice = authoritativePrice
      if (!r.tour.city) {
        r.tour.city = cityMap.get(r.tour.id) ?? null
      }
      if (!r.tour.country) {
        r.tour.country = countryMap.get(r.tour.id) ?? null
      }
      if (!r.tour.category) {
        r.tour.category = categoryMap.get(r.tour.id) ?? null
      }
      if (!r.tour.durationMinutes) {
        const fallbackDuration = durationMap.get(r.tour.id)
        if (fallbackDuration != null) r.tour.durationMinutes = fallbackDuration
      }
      if (!extractDifficultyFromTour(r.tour)) {
        r.tour.difficulty = difficultyMap.get(r.tour.id) ?? null
      }
      if (!extractCancellationFromTour(r.tour)) {
        r.tour.cancellationPolicy = cancellationMap.get(r.tour.id) ?? null
      }
      if (r.tour.pickupIncluded == null) {
        const p = pickupMap.get(r.tour.id)
        if (p != null) r.tour.pickupIncluded = p
      }
      if (!r.tour.languages?.length) {
        const fallbackLanguages = languagesMap.get(r.tour.id)
        if (fallbackLanguages?.length) r.tour.languages = fallbackLanguages
      }
    }
  } catch (e) {
    console.warn('[enrichExpeditionRecords] batch fallback failed:', e)
  }
}

export function useExpeditionTours(filters: ExpeditionToursFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.category) params.set('category', filters.category)
  if (filters.city) params.set('city', filters.city)
  if (filters.country) params.set('country', filters.country)
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice))
  if (filters.minRating != null) params.set('minRating', String(filters.minRating))
  if (filters.sortBy) params.set('sortBy', filters.sortBy)

  const qs = params.toString()

  return useQuery({
    queryKey: ['expedition', 'tours', filters],
    queryFn: async () => {
      const payload = await expeditionFetchRaw(`/expedition/tours${qs ? `?${qs}` : ''}`)
      const records: ExpeditionTourRecord[] = payload.data?.tours ?? payload.tours ?? []
      const pagination = payload.pagination ?? null

      await enrichExpeditionRecords(records)

      return {
        tours: records.map((r) => mapToListing(r.tour)),
        pagination,
      }
    },
  })
}

/**
 * Fetches the ENTIRE active curated catalog by paging through
 * /expedition/tours (limit capped at 50 per request). The curated endpoint
 * only supports a handful of filters server-side (and has broken pagination
 * counts for price/rating), so the All Tours page pulls the full set once and
 * filters/sorts/paginates locally — this keeps every filter working with
 * accurate counts without touching the backend.
 */
const MAX_CATALOG_PAGES = 10
const CATALOG_PAGE_SIZE = 50

export function useAllExpeditionTours() {
  return useQuery({
    queryKey: ['expedition', 'tours', 'all'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TourCardData[]> => {
      const records: ExpeditionTourRecord[] = []
      let page = 1
      let totalPages = 1

      do {
        const payload = await expeditionFetchRaw(`/expedition/tours?page=${page}&limit=${CATALOG_PAGE_SIZE}`)
        const batch: ExpeditionTourRecord[] = payload.data?.tours ?? payload.tours ?? []
        records.push(...batch)
        totalPages = payload.pagination?.totalPages ?? 1
        if (batch.length === 0) break
        page += 1
      } while (page <= totalPages && page <= MAX_CATALOG_PAGES)

      await enrichExpeditionRecords(records)

      return records.map((r) => mapToListing(r.tour))
    },
  })
}

export interface TourFilterOptions {
  categories: string[]
  destinations: string[]
}

/**
 * Fetch options for the All Tours filter UI from the public
 * /tours/filters/options endpoint (cached server-side + by react-query).
 */
export function useTourFilterOptions() {
  return useQuery({
    queryKey: ['expedition', 'tours', 'filter-options'],
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<TourFilterOptions> => {
      const payload = await expeditionFetchRaw('/tours/filters/options')
      const opts = payload.data?.filterOptions ?? {}
      return {
        categories: Array.isArray(opts.categories) ? opts.categories : [],
        destinations: Array.isArray(opts.locations?.cities) ? opts.locations.cities : [],
      }
    },
  })
}

export function useExpeditionFeaturedTours() {
  return useQuery({
    queryKey: ['expedition', 'tours', 'featured'],
    queryFn: async () => {
      const payload = await expeditionFetchRaw('/expedition/tours/featured')
      const records: ExpeditionTourRecord[] = payload.data?.tours ?? []
      await enrichExpeditionRecords(records)
      return records.map((r) => mapToListing(r.tour))
    },
  })
}

export interface TourDetailData extends Omit<TourDetail, 'guide' | 'contact' | 'difficulty'> {
  coverPhoto: string | null
  category: string
  city: string | null
  country: string | null
  difficulty?: string
  tags: string[]
  whatToBring: string[]
  notSuitableFor: string[]
  notAllowed: string[]
  additionalInfo: string
  meetingPoint: string
  supplierName: string
  supplierPhoto: string | null
  bookingFlow: 'DIRECT' | 'EXTERNAL'
  externalUrl: string | null
  startingPrice: number | null
  travelerPricing: TravelerPricing[]
  skipTheLine?: string | null
  wheelchairAccessible?: boolean
  foodProvided?: boolean
  drinksIncluded?: boolean
  meals?: MealInfo[]
  dietaryOptions?: string[]
  guideType?: string
  guideMaterials?: { audioGuide: boolean; infoBooklet: boolean }
  petFriendly?: boolean
  /**
   * Whether the tour is a private (not shared/group) experience.
   * Sourced from productContent.isPrivateActivity — this field currently
   * has no supplier-facing UI to set it in TravioAfrica-Supplier, so it
   * will read false for virtually all tours until that control is added.
   */
  isPrivateActivity?: boolean
  guide?: TourDetail['guide']
  contact?: TourDetail['contact']
  pricingModel?: TourDetail['pricingModel']
  pricingApproach?: TourDetail['pricingApproach']
  uniformPrice?: TourDetail['uniformPrice']
  groupSizePricing?: TourDetail['groupSizePricing']
}

/**
 * Fetches a tour directly from the public /tours/:id endpoint (works for
 * any ACTIVE tour, regardless of whether it has been curated onto the
 * Expedition-Go homepage). Used as a fallback so newly created / uncurated
 * tours found via search can still be opened on the detail page.
 *
 * `bypassCache` skips the browser HTTP cache — the tour detail path
 * (useExpeditionTour) needs this so a supplier's just-saved pricing/tier
 * change is visible immediately instead of waiting out the endpoint's
 * max-age=60 response caching.
 */
async function fetchRawTourBySlugOrId(idOrSlug: string, bypassCache = false): Promise<any | null> {
  const res = await fetchWithAuth(`/tours/${encodeURIComponent(idOrSlug)}`, {
    ...(bypassCache ? { cache: 'no-store' } : {}),
  })
  if (!res.ok) return null
  const payload = await res.json().catch(() => ({}))
  return payload.data?.tour ?? payload.tour ?? payload ?? null
}

function buildTourDetailFromRawTour(rawTour: any): TourDetailData {
  const pc = parseJsonMaybe(rawTour?.productContent)
  const bt = parseJsonMaybe(rawTour?.bookingAndTickets)

  const durationMinutes = rawTour?.durationMinutes ?? extractDurationFromTour(rawTour)
  const resolvedPrice = extractStartingPriceFromRaw(rawTour?.schedulesAndPricing) ?? 0
  const city = rawTour?.city || extractCityFromTour(rawTour)
  const country = rawTour?.country || extractCountryFromTour(rawTour)
  const location = [city, country].filter(Boolean).join(', ')
  const travelerPricing = extractTravelerPricing(rawTour)
  const skipTheLine = extractSkipTheLine(rawTour)
  const languages = extractLanguagesFromTour(rawTour)
  const itinerary = extractItinerary(rawTour)

  return {
    id: rawTour?.id || '',
    title: rawTour?.title || '',
    slug: rawTour?.slug || '',
    description: rawTour?.description || '',
    shortDescription: typeof pc?.shortSummary === 'string' ? pc.shortSummary : undefined,
    images: Array.isArray(rawTour?.photos) ? rawTour.photos : [],
    coverPhoto: rawTour?.coverPhoto || null,
    category: rawTour?.category || '',
    duration: formatDuration(durationMinutes),
    price: resolvedPrice,
    currency: rawTour?.schedulesAndPricing
      ? (parseJsonMaybe(rawTour.schedulesAndPricing)?.pricingSchedules?.currency || 'USD')
      : 'USD',
    startingPrice: resolvedPrice,
    rating: rawTour?.averageRating != null ? Number(rawTour.averageRating) : 0,
    reviewCount: rawTour?.reviewCount || rawTour?._count?.reviews || 0,
    location,
    city: city || null,
    country: country || null,
    difficulty: extractDifficultyFromTour(rawTour) || undefined,
    tags: Array.isArray(rawTour?.tags) ? rawTour.tags : [],
    highlights: Array.isArray(pc?.highlights) ? pc.highlights : [],
    included: Array.isArray(pc?.included) ? pc.included : [],
    excluded: Array.isArray(pc?.excluded) ? pc.excluded : [],
    whatToBring: Array.isArray(pc?.whatToBring) ? pc.whatToBring : [],
    notSuitableFor: Array.isArray(pc?.healthRestrictions) ? pc.healthRestrictions : [],
    notAllowed: Array.isArray(pc?.notAllowed) ? pc.notAllowed : [],
    additionalInfo: typeof pc?.additionalInfo === 'string' ? pc.additionalInfo : '',
    itinerary,
    faqs: [],
    coordinates: { lat: rawTour?.latitude ?? 0, lng: rawTour?.longitude ?? 0 },
    cancellationPolicy: extractCancellationFromTour(rawTour) || 'Free cancellation up to 24 hours before',
    meetingPoint: bt?.meetingPoint || '',
    languages,
    supplierName: rawTour?.supplier?.name || '',
    supplierPhoto: rawTour?.supplier?.photoURL || null,
    bookingFlow: 'DIRECT',
    externalUrl: null,
    groupSize: 15,
    tourType: durationMinutes && durationMinutes >= 1440 ? 'multi-day' : 'day',
    availability: [],
    pickupIncluded: !!(bt?.pickupProvided ?? bt?.pickupAvailable),
    travelerPricing,
    skipTheLine,
    wheelchairAccessible: extractWheelchairAccessible(rawTour),
    foodProvided: extractFoodProvided(rawTour),
    drinksIncluded: extractDrinksIncluded(rawTour),
    meals: extractMeals(rawTour),
    dietaryOptions: extractDietaryOptions(rawTour),
    guideType: extractGuideType(rawTour),
    guideMaterials: extractGuideMaterials(rawTour),
    petFriendly: extractPetFriendly(rawTour),
    isPrivateActivity: extractIsPrivateActivity(rawTour),
    pricingModel: extractPricingModel(rawTour),
    pricingApproach: extractPricingApproach(rawTour),
    uniformPrice: extractUniformPrice(rawTour),
    groupSizePricing: extractGroupSizePricing(rawTour),
  }
}

export function useExpeditionTour(slug: string | undefined) {
  return useQuery({
    queryKey: ['expedition', 'tour', slug],
    enabled: !!slug,
    // Pricing (tiers, group-size bands, uniform price, etc.) is set by the
    // supplier and can change at any time on the supplier platform. The
    // global queryClient default (staleTime: 5min) would let the booking
    // widget show a stale price/tier for up to 5 minutes after a supplier
    // edit, so this query always treats its data as stale and refetches on
    // every mount — the tour detail page (and its booking widget) should
    // always reflect the supplier's current pricing and availability.
    staleTime: 0,
    refetchOnMount: 'always',
    // The global client default turns refetchOnWindowFocus off; the tour
    // detail page must stay fresh even while the tab sits in the background
    // (e.g. an admin just approved a supplier's update), so refetch on focus.
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // Try the curated (homepage) endpoint first — it's cached and includes
      // a few pre-computed fields. If the tour hasn't been curated (e.g. it
      // was just created by a supplier), fall back to the public /tours/:id
      // endpoint so it's still viewable when found via search.
      let payload: any
      try {
        payload = await expeditionFetchRaw(`/expedition/tours/${encodeURIComponent(slug!)}`, true)
      } catch (e: any) {
        const rawTour = await fetchRawTourBySlugOrId(slug!, true)
        if (rawTour) {
          return buildTourDetailFromRawTour(rawTour)
        }
        throw e
      }
      const wrapper = payload.data?.tour ?? {}
      const tour = wrapper.tour ?? {}

      if (!tour.id) {
        const rawTour = await fetchRawTourBySlugOrId(slug!, true)
        if (rawTour) {
          return buildTourDetailFromRawTour(rawTour)
        }
      }

      const tourType = tour.durationMinutes && tour.durationMinutes >= 1440 ? 'multi-day' : 'day'

      let resolvedPrice = tour.startingPrice ?? extractStartingPriceFromRaw(tour.schedulesAndPricing)
      let shortDescription = ''
      let travelerPricing: TravelerPricing[] = []
      let skipTheLine: string | null = null
      let pricingModel: 'perPerson' | 'perGroup' = 'perPerson'
      let pricingApproach: 'sameForEveryone' | 'dependsOnAge' = 'dependsOnAge'
      let uniformPrice: number | null = null
      let groupSizePricing: GroupSizeBand[] = []

      // Fetch raw tour data to get excluded and other missing fields
      if (tour.id) {
        try {
          // Bypass HTTP caching so pricing/tier edits a supplier just
          // saved are reflected immediately on the tour detail page.
          const rawRes = await fetchWithAuth(`/tours/${tour.id}`, {
            cache: 'no-store',
          })
          if (rawRes.ok) {
            const rawPayload = await rawRes.json()
            const rawTour = rawPayload.data?.tour ?? rawPayload.tour ?? rawPayload
            travelerPricing = extractTravelerPricing(rawTour)
            skipTheLine = extractSkipTheLine(rawTour)
            pricingModel = extractPricingModel(rawTour)
            pricingApproach = extractPricingApproach(rawTour)
            uniformPrice = extractUniformPrice(rawTour)
            groupSizePricing = extractGroupSizePricing(rawTour)
            // Dynamic per-option / inclusion facts selected by the supplier
            tour.wheelchairAccessible = extractWheelchairAccessible(rawTour)
            tour.foodProvided = extractFoodProvided(rawTour)
            tour.drinksIncluded = extractDrinksIncluded(rawTour)
            tour.meals = extractMeals(rawTour)
            tour.dietaryOptions = extractDietaryOptions(rawTour)
            tour.guideType = extractGuideType(rawTour)
            tour.guideMaterials = extractGuideMaterials(rawTour)
            tour.petFriendly = extractPetFriendly(rawTour)
            tour.isPrivateActivity = extractIsPrivateActivity(rawTour)
            // Re-derive the cancellation policy from the raw tour's
            // bookingAndTickets.cancellationPolicy (Step 17 in the supplier
            // builder: "Standard" vs "All sales final") whenever it can be
            // resolved there — this is the source of truth for whichever of
            // the two options the supplier actually picked, and keeps the
            // curated record's copy from going stale or missing that detail.
            {
              const rawCancellation = extractCancellationFromTour(rawTour)
              if (rawCancellation) {
                tour.cancellationPolicy = rawCancellation
              }
            }
            if (resolvedPrice == null) {
              resolvedPrice = extractStartingPriceFromRaw(rawTour?.schedulesAndPricing)
            } else {
              // The curated record's stored startingPrice can be stale (e.g.
              // a tour's Child price while adults are charged more), so once
              // we have the raw tour we always prefer the authoritative
              // schedule-derived price — keeping the detail page, booking
              // widget, and listings consistent.
              const rawResolved = extractStartingPriceFromRaw(rawTour?.schedulesAndPricing)
              if (rawResolved != null) resolvedPrice = rawResolved
            }
            if (!tour.city) {
              tour.city = extractCityFromTour(rawTour)
            }
            if (!tour.country) {
              tour.country = extractCountryFromTour(rawTour)
            }
            if (!tour.durationMinutes) {
              const fallbackDuration = extractDurationFromTour(rawTour)
              if (fallbackDuration != null) tour.durationMinutes = fallbackDuration
            }
            // Extract excluded from raw productContent
            if (!Array.isArray(tour.excluded)) {
              const pc = rawTour?.productContent
              if (pc && Array.isArray(pc.excluded)) {
                tour.excluded = pc.excluded
              }
            }
            // Extract itinerary from raw productContent (explicit itinerary
            // first, falling back to the locations list for tours that never
            // filled in a dedicated itinerary).
            if (!Array.isArray(tour.itinerary) || tour.itinerary.length === 0) {
              const pc = rawTour?.productContent
              const rawItin = pc?.itinerary
              if (Array.isArray(rawItin) && rawItin.length > 0) {
                tour.itinerary = rawItin
              } else {
                const derived = extractItinerary(rawTour)
                if (derived.length > 0) {
                  tour.itinerary = derived
                }
              }
            }
            // Extract short description (productContent.shortSummary)
            const pcShort = rawTour?.productContent
            if (pcShort && typeof pcShort.shortSummary === 'string') {
              shortDescription = pcShort.shortSummary
            }
            // Extract guide/spoken language (productContent.writingLanguage + option languages)
            if (pcShort) {
              const optionLangs = extractLanguagesFromTour(rawTour)
              if (!Array.isArray(tour.languages) || tour.languages.length === 0) {
                tour.languages = optionLangs
              } else if (optionLangs.length > 0) {
                tour.languages = Array.from(new Set([...tour.languages, ...optionLangs]))
              }
            }
            // Extract pickup included from bookingAndTickets (pickupProvided / pickupAvailable)
            if (tour.pickupIncluded == null) {
              const bt = rawTour?.bookingAndTickets
              if (bt) {
                tour.pickupIncluded = !!(bt.pickupProvided ?? bt.pickupAvailable)
              }
            }
            // Extract difficulty — the expedition detail endpoint does not return it,
            // so pull it from the raw tour record (top-level column or categorization blob).
            if (!extractDifficultyFromTour(tour)) {
              const diff = extractDifficultyFromTour(rawTour)
              if (diff) tour.difficulty = diff
            }
            // Extract additional info (not suitable for / not allowed / know before you go)
            if (pcShort) {
              if (!Array.isArray(tour.notSuitableFor) && Array.isArray(pcShort.healthRestrictions)) {
                tour.notSuitableFor = pcShort.healthRestrictions
              }
              if (!Array.isArray(tour.notAllowed) && Array.isArray(pcShort.notAllowed)) {
                tour.notAllowed = pcShort.notAllowed
              }
              if (!tour.additionalInfo && typeof pcShort.additionalInfo === 'string') {
                tour.additionalInfo = pcShort.additionalInfo
              }
            }
          }
        } catch (e) {
          console.warn('[useExpeditionTour] fallback fetch failed:', e)
        }
      }

      resolvedPrice = resolvedPrice ?? 0
      const loc = [tour.city, tour.country].filter(Boolean).join(', ')

      const rawTourPayload = wrapper
      const rawItinerary =
        Array.isArray(tour.itinerary) && tour.itinerary.length > 0
          ? tour.itinerary
          : Array.isArray(rawTourPayload?.productContent?.itinerary)
            ? rawTourPayload.productContent.itinerary
            : extractItinerary(rawTourPayload)

      const result: TourDetailData = {
        id: tour.id || '',
        title: tour.title || '',
        slug: tour.slug || '',
        description: tour.description || '',
        shortDescription: shortDescription || undefined,
        images: Array.isArray(tour.photos) ? tour.photos : [],
        coverPhoto: tour.coverPhoto || null,
        category: tour.category || '',
        duration: formatDuration(tour.durationMinutes),
        price: resolvedPrice,
        currency: tour.currency || 'USD',
        startingPrice: resolvedPrice,
        rating: tour.averageRating != null ? Number(tour.averageRating) : 0,
        reviewCount: tour.reviewCount || 0,
        location: loc,
        city: tour.city || null,
        country: tour.country || null,
        difficulty: extractDifficultyFromTour(tour) || undefined,
        tags: [],
        highlights: Array.isArray(tour.highlights) ? tour.highlights : [],
        included: Array.isArray(tour.included) ? tour.included : [],
        excluded: Array.isArray(tour.excluded) ? tour.excluded : [],
        whatToBring: Array.isArray(tour.whatToBring) ? tour.whatToBring : [],
        notSuitableFor: Array.isArray(tour.notSuitableFor) ? tour.notSuitableFor : [],
        notAllowed: Array.isArray(tour.notAllowed) ? tour.notAllowed : [],
        additionalInfo: tour.additionalInfo || '',
        itinerary: rawItinerary,
        faqs: [],
        coordinates: { lat: 0, lng: 0 },
        cancellationPolicy: extractCancellationFromTour(tour) || 'Free cancellation up to 24 hours before',
        meetingPoint: tour.meetingPoint || '',
        languages: Array.isArray(tour.languages) ? tour.languages : [],
        supplierName: tour.supplierName || '',
        supplierPhoto: tour.supplierPhoto || null,
        bookingFlow: 'DIRECT',
        externalUrl: null,
        groupSize: 15,
        tourType,
        availability: [],
        pickupIncluded: !!tour.pickupIncluded,
        travelerPricing,
        skipTheLine,
        wheelchairAccessible: !!tour.wheelchairAccessible,
        foodProvided: !!tour.foodProvided,
        drinksIncluded: !!tour.drinksIncluded,
        meals: Array.isArray(tour.meals) ? tour.meals : [],
        dietaryOptions: Array.isArray(tour.dietaryOptions) ? tour.dietaryOptions : [],
        guideType: tour.guideType || undefined,
        guideMaterials: tour.guideMaterials || undefined,
        petFriendly: !!tour.petFriendly,
        isPrivateActivity: !!tour.isPrivateActivity,
        pricingModel,
        pricingApproach,
        uniformPrice,
        groupSizePricing,
      }
      return result
    },
  })
}

export function mapRawTourToListing(t: any): TourCardData {
  const location = [t.city, t.country].filter(Boolean).join(', ')
  const price = extractStartingPriceFromRaw(t.schedulesAndPricing)
  const durationMinutes = t.durationMinutes ?? extractDurationFromTour(t)
  // Cards show only the single Step 1 content language, not every
  // per-option language merged in — see extractContentLanguage().
  const languages = extractContentLanguage(t)

  return {
    id: t.id,
    title: t.title,
    category: t.category || '',
    duration: formatDuration(durationMinutes),
    features: '',
    price: formatPrice(price),
    rating: t.averageRating != null ? String(t.averageRating) : '0',
    reviews: t.reviewCount ?? t._count?.reviews ?? 0,
    location,
    image: t.coverPhoto || t.photos?.[0] || '',
    source: 'expedition-go',
    externalUrl: undefined,
    slug: t.slug,
    languages: languages.length ? languages : undefined,
    difficulty: extractDifficultyFromTour(t) || undefined,
    cancellationPolicy: extractCancellationFromTour(t) || undefined,
    pickupIncluded: t.pickupIncluded ?? undefined,
  }
}

/**
 * Fallback used when the curated "similar tours" endpoint has nothing to
 * offer — either because the current tour isn't curated onto the homepage
 * (ExpeditionTour table) or because it has no category-matching curated
 * siblings. Queries the public /tours listing directly so every active
 * tour can show a "similar experiences" section, not just curated ones.
 */
async function fetchSimilarToursFallback(excludeTourId: string | undefined, category: string | null, city: string | null, country: string | null): Promise<TourCardData[]> {
  const tryFetch = async (params: URLSearchParams) => {
    const payload = await expeditionFetchRaw(`/tours?${params.toString()}`)
    const tours: any[] = payload.data?.tours ?? payload.tours ?? []
    return tours.filter((t) => t.id !== excludeTourId)
  }

  // 1) Same category first (closest match to the curated endpoint's intent)
  if (category) {
    const params = new URLSearchParams({ category, limit: '8' })
    const results = await tryFetch(params)
    if (results.length > 0) return results.slice(0, 4).map(mapRawTourToListing)
  }

  // 2) Fall back to same city/country
  if (city || country) {
    const params = new URLSearchParams({ limit: '8' })
    if (city) params.set('city', city)
    if (country) params.set('country', country)
    const results = await tryFetch(params)
    if (results.length > 0) return results.slice(0, 4).map(mapRawTourToListing)
  }

  // 3) Last resort: just show other active tours
  const params = new URLSearchParams({ limit: '8', sortBy: 'popularity' })
  const results = await tryFetch(params)
  return results.slice(0, 4).map(mapRawTourToListing)
}

/**
 * Powers the homepage "Recommended" section.
 *
 * The curated /expedition/tours endpoint only returns tours an admin has
 * manually added to the ExpeditionTour table, so brand-new tours never
 * show up here until someone curates them — even though they're fully
 * ACTIVE and bookable. To fix that, this merges the curated list with the
 * most recently published active tours from the public /tours endpoint,
 * so new tours appear on the homepage immediately without waiting on
 * manual curation. Curated tours still take priority in ordering; any
 * new tour not yet curated is appended (deduped) so nothing is lost.
 */
export function useRecommendedTours(limit: number = 12) {
  return useQuery({
    queryKey: ['expedition', 'tours', 'recommended', limit],
    queryFn: async (): Promise<TourCardData[]> => {
      const [curatedResult, newestResult] = await Promise.allSettled([
        expeditionFetchRaw(`/expedition/tours?limit=${limit}`),
        expeditionFetchRaw(`/tours?limit=${limit}&sortBy=createdAt&sortOrder=desc`),
      ])

      const curatedTours: TourCardData[] = []
      if (curatedResult.status === 'fulfilled') {
        const records: ExpeditionTourRecord[] = curatedResult.value.data?.tours ?? curatedResult.value.tours ?? []
        await enrichExpeditionRecords(records)
        curatedTours.push(...records.map((r) => mapToListing(r.tour)))
      }

      const newestTours: TourCardData[] = []
      if (newestResult.status === 'fulfilled') {
        const rawTours: any[] = newestResult.value.data?.tours ?? newestResult.value.tours ?? []
        newestTours.push(...rawTours.map(mapRawTourToListing))
      }

      const seenSlugs = new Set(curatedTours.map((t) => t.slug))
      const merged = [...curatedTours]
      for (const tour of newestTours) {
        if (seenSlugs.has(tour.slug)) continue
        seenSlugs.add(tour.slug)
        merged.push(tour)
      }

      return merged.slice(0, limit)
    },
  })
}

export function useSimilarTours(slug: string | undefined) {
  return useQuery({
    queryKey: ['expedition', 'tours', slug, 'similar'],
    enabled: !!slug,
    queryFn: async () => {
      let payload: any
      try {
        payload = await expeditionFetchRaw(`/expedition/tours/${encodeURIComponent(slug!)}/similar`)
      } catch {
        // Tour isn't curated onto the homepage — resolve its category/location
        // from the public tour endpoint and fall back to a live query.
        const rawTour = await fetchRawTourBySlugOrId(slug!)
        if (!rawTour) return []
        return fetchSimilarToursFallback(rawTour.id, rawTour.category || null, rawTour.city || null, rawTour.country || null)
      }

      const records: ExpeditionTourRecord[] = payload.data?.tours ?? []

      if (records.length === 0) {
        // Curated, but no category-matching curated siblings — fall back to
        // the live tour listing so a "similar experiences" section still shows.
        const rawTour = await fetchRawTourBySlugOrId(slug!)
        if (rawTour) {
          return fetchSimilarToursFallback(rawTour.id, rawTour.category || null, rawTour.city || null, rawTour.country || null)
        }
        return []
      }

      // Batch-enrich similar tours with full data (price, location, duration,
      // etc.). Always run — same reason as enrichExpeditionRecords: the stored
      // startingPrice on curated records can be stale and is only correctable
      // by cross-referencing the full /tours listing.
      {
        try {
          const allPayload = await expeditionFetchRaw('/tours?limit=500')
          const allTours: any[] = allPayload.data?.tours ?? []
          const priceMap = new Map<string, number>()
          const cityMap = new Map<string, string | null>()
          const countryMap = new Map<string, string | null>()
          const durationMap = new Map<string, number | null>()
          const difficultyMap = new Map<string, string | null>()
          const cancellationMap = new Map<string, string | null>()
          const pickupMap = new Map<string, boolean | undefined>()
          const languagesMap = new Map<string, string[]>()
          for (const t of allTours) {
            const p = extractStartingPriceFromRaw(t.schedulesAndPricing)
            if (p != null) priceMap.set(t.id, p)
            cityMap.set(t.id, extractCityFromTour(t))
            countryMap.set(t.id, extractCountryFromTour(t))
            durationMap.set(t.id, extractDurationFromTour(t))
            difficultyMap.set(t.id, extractDifficultyFromTour(t))
            cancellationMap.set(t.id, extractCancellationFromTour(t))
            pickupMap.set(t.id, t.pickupIncluded ?? (t.bookingAndTickets?.pickupAvailable ?? t.bookingAndTickets?.pickupProvided) ?? undefined)
            // Cards show only the single Step 1 content language, not the
            // full per-option merge extractLanguagesFromTour() returns.
            languagesMap.set(t.id, extractContentLanguage(t))
          }
          for (const r of records) {
            // Same rule as enrichExpeditionRecords: the stored startingPrice
            // on curated records can be stale, so always prefer the
            // authoritative schedule-derived price when known.
            const authoritativePrice = priceMap.get(r.tour.id)
            if (authoritativePrice != null) r.tour.startingPrice = authoritativePrice
            if (!r.tour.city) {
              r.tour.city = cityMap.get(r.tour.id) ?? null
            }
            if (!r.tour.country) {
              r.tour.country = countryMap.get(r.tour.id) ?? null
            }
            if (!r.tour.durationMinutes) {
              const fallbackDuration = durationMap.get(r.tour.id)
              if (fallbackDuration != null) r.tour.durationMinutes = fallbackDuration
            }
            if (!extractDifficultyFromTour(r.tour)) {
              r.tour.difficulty = difficultyMap.get(r.tour.id) ?? null
            }
            if (!extractCancellationFromTour(r.tour)) {
              r.tour.cancellationPolicy = cancellationMap.get(r.tour.id) ?? null
            }
            if (r.tour.pickupIncluded == null) {
              const p = pickupMap.get(r.tour.id)
              if (p != null) r.tour.pickupIncluded = p
            }
            if (!r.tour.languages?.length) {
              const fallbackLanguages = languagesMap.get(r.tour.id)
              if (fallbackLanguages?.length) r.tour.languages = fallbackLanguages
            }
          }
        } catch (e) {
          console.warn('[useSimilarTours] batch fallback failed:', e)
        }
      }

      return records.map((r) => mapToListing(r.tour))
    },
  })
}
