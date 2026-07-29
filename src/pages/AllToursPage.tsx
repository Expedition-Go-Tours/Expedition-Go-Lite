import { useState, useMemo, useRef, useCallback, type ReactNode } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Star, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import TourCard from '../components/TourCard'
import MultiDayCard from '../components/MultiDayCard'
import { useExpeditionTours, type TourCardData } from '../hooks/useExpeditionTours'
import './AllToursPage.css'

const PAGE_SIZE = 12

const RATING_OPTIONS = [
  { value: '5', label: '5' },
  { value: '4', label: '4' },
  { value: '3', label: '3' },
  { value: '2', label: '2' },
  { value: '1', label: '1' },
] as const

const TOUR_TYPE_OPTIONS = [
  { value: 'day', label: 'Day Tours' },
  { value: 'multi-day', label: 'Multi-Day' },
] as const

const DURATION_BUCKETS = [
  { value: 'under-4', label: '< 4 hours', match: (m: number) => m > 0 && m < 240 },
  { value: '4-6', label: '4–6 hours', match: (m: number) => m >= 240 && m <= 360 },
  { value: 'full-day', label: 'Full Day (6+)', match: (m: number) => m > 360 && m < 1440 },
  { value: '2-3-days', label: '2–3 Days', match: (m: number) => m >= 2880 && m <= 4320 },
  { value: '4-plus-days', label: '4+ Days', match: (m: number) => m > 4320 },
]

const PRICE_RANGES = [
  { value: 'under-50', label: 'Under $50', match: (p: number) => p < 50 },
  { value: '50-100', label: '$50 – $100', match: (p: number) => p >= 50 && p <= 100 },
  { value: '100-200', label: '$100 – $200', match: (p: number) => p > 100 && p <= 200 },
  { value: 'over-200', label: '$200+', match: (p: number) => p > 200 },
]

const SECTION_TITLES: Record<string, string> = {
  'Recommended': 'Recommended For You',
  'Day Tours': 'Day Tours',
  'Multi-Day Tours': 'Multi-Day Tours',
  'Top Rated': 'Top Rated by Travellers',
  'Sell Out': 'Likely to Sell Out',
  'Last Minute Deals': 'Last Minute Deals',
}

function getSortBy(sectionParam: string, manualSort: string | undefined): string | undefined {
  if (manualSort && manualSort !== 'recommended') {
    if (manualSort === 'top-rated') return 'rating'
    if (manualSort === 'price-low') return 'price_asc'
    if (manualSort === 'price-high') return 'price_desc'
  }
  if (sectionParam === 'Top Rated') return 'rating'
  if (sectionParam === 'Sell Out' || sectionParam === 'Last Minute Deals') return 'popular'
  if (sectionParam === 'Multi-Day Tours' || sectionParam === 'Day Tours') return 'popular'
  return undefined
}

function getCityFilter(sectionParam: string, locationParam: string, manualDestinations: string[]): string | undefined {
  if (manualDestinations.length === 1) return manualDestinations[0]
  if (locationParam) return locationParam
  return undefined
}

function applyClientFilters(
  tours: TourCardData[],
  tourTypes: string[],
  durationFilter: string[],
  languageFilter: string[],
  sectionParam: string,
  manualDestinations: string[],
  manualCategories: string[],
) {
  let result = tours

  if (tourTypes.length > 0) {
    result = result.filter(t => {
      const isMultiDay = false
      const tourType = isMultiDay ? 'multi-day' : 'day'
      return tourTypes.includes(tourType)
    })
  }

  if (durationFilter.length > 0 && result.length > 0) {
    result = result.filter(() => true)
  }

  if (languageFilter.length > 0) {
    result = result.filter(() => true)
  }

  if (sectionParam === 'Day Tours') {
    result = result.filter(() => true)
  }
  if (sectionParam === 'Multi-Day Tours') {
    result = result.filter(() => true)
  }

  if (manualDestinations.length > 0 || manualCategories.length > 0) {
    result = result
  }

  return result
}

function extractPrice(priceStr: string): number {
  return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0
}

function getMinutesFromDuration(durationStr: string): number {
  const match = durationStr.match(/(\d+)\s*hour/)
  if (match) return parseInt(match[1]) * 60
  const dayMatch = durationStr.match(/(\d+)\s*day/)
  if (dayMatch) return parseInt(dayMatch[1]) * 1440
  return 0
}

interface AllToursPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
}

export default function AllToursPage({ onOpenAuth }: AllToursPageProps) {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sectionParam = searchParams.get('section') || ''
  const locationParam = searchParams.get('location') || ''

  const [tourTypes, setTourTypes] = useState<string[]>([])
  const [destinations, setDestinations] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [durationFilter, setDurationFilter] = useState<string[]>([])
  const [priceFilter, setPriceFilter] = useState<string[]>([])
  const [languageFilter, setLanguageFilter] = useState<string[]>([])
  const [ratingFilter, setRatingFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string[]>(['recommended'])
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sortByVal = sortBy[0] || 'recommended'
  const apiSortBy = getSortBy(sectionParam, sortByVal)

  const minPrice = useMemo(() => {
    if (priceFilter.length > 0) {
      const vals = priceFilter.map(v => {
        const range = PRICE_RANGES.find(r => r.value === v)
        if (range?.value === 'under-50') return 0
        if (range?.value === 'over-200') return 200
        const m = range?.label.match(/\$(\d+)/)
        return m ? parseInt(m[1]) : 0
      })
      return Math.min(...vals)
    }
    return undefined
  }, [priceFilter])

  const maxPrice = useMemo(() => {
    if (priceFilter.length > 0) {
      const vals = priceFilter.map(v => {
        const range = PRICE_RANGES.find(r => r.value === v)
        if (range?.value === 'under-50') return 50
        if (range?.value === 'over-200') return 99999
        const parts = range?.label.match(/\$(\d+)\s*–\s*\$(\d+)/)
        return parts ? parseInt(parts[2]) : 99999
      })
      return Math.max(...vals)
    }
    return undefined
  }, [priceFilter])

  const minRating = ratingFilter.length > 0 ? Math.min(...ratingFilter.map(Number)) : undefined

  const apiDestinations = destinations.length > 0 ? destinations : undefined
  const apiCategories = categories.length > 0 ? categories : undefined

  const { data, isLoading, isError, error } = useExpeditionTours({
    page,
    limit: PAGE_SIZE,
    sortBy: apiSortBy,
    city: getCityFilter(sectionParam, locationParam, destinations),
    category: apiCategories?.[0],
    minPrice,
    maxPrice,
    minRating,
  })

  const fetchedTours = data?.tours || []
  const pagination = data?.pagination

  const allTours = useMemo(() => {
    if (page === 1) return fetchedTours
    return fetchedTours
  }, [fetchedTours, page])

  const filterOptions = useMemo(() => {
    const allLocations = [...new Set(fetchedTours.map(t => t.location).filter(Boolean))]
    const allCategories = [...new Set(fetchedTours.map(t => t.category).filter(Boolean))]
    return {
      destinations: allLocations.map(v => ({ value: v, label: v })),
      categories: allCategories.map(v => ({ value: v, label: v })),
    }
  }, [fetchedTours])

  const allPillOptions = useMemo(() => {
    const pills: { key: string; value: string; label: string }[] = []
    TOUR_TYPE_OPTIONS.forEach(o => pills.push({ key: `type-${o.value}`, value: o.value, label: o.label }))
    DURATION_BUCKETS.forEach(b => pills.push({ key: `dur-${b.value}`, value: b.value, label: b.label }))
    PRICE_RANGES.forEach(r => pills.push({ key: `price-${r.value}`, value: r.value, label: r.label }))
    filterOptions.destinations.forEach(d => pills.push({ key: `dest-${d.value}`, value: d.value, label: d.label }))
    filterOptions.categories.forEach(c => pills.push({ key: `cat-${c.value}`, value: c.value, label: c.label }))
    RATING_OPTIONS.forEach(r => pills.push({ key: `rating-${r.value}`, value: r.value, label: r.label }))
    return pills
  }, [filterOptions])

  const isPillActive = (value: string) => {
    return tourTypes.includes(value) || destinations.includes(value) ||
      categories.includes(value) || durationFilter.includes(value) || priceFilter.includes(value) ||
      languageFilter.includes(value) || ratingFilter.includes(value)
  }

  const handlePillToggle = (value: string) => {
    if (TOUR_TYPE_OPTIONS.some(o => o.value === value)) { handleMulti(setTourTypes)(value); return }
    if (DURATION_BUCKETS.some(b => b.value === value)) { handleMulti(setDurationFilter)(value); return }
    if (PRICE_RANGES.some(r => r.value === value)) { handleMulti(setPriceFilter)(value); return }
    if (RATING_OPTIONS.some(r => r.value === value)) { handleMulti(setRatingFilter)(value); return }
    if (filterOptions.destinations.some(d => d.value === value)) { handleMulti(setDestinations)(value); return }
    if (filterOptions.categories.some(c => c.value === value)) { handleMulti(setCategories)(value); return }
  }

  const pageTitle = locationParam
    ? t('sections.toursIn', { location: locationParam })
    : SECTION_TITLES[sectionParam] || t('sections.allToursTitle')

  const sortOptions = useMemo(() => [
    { value: 'recommended', label: t('sections.recommendedTitle') },
    { value: 'top-rated', label: t('sections.topRatedTitle') },
    { value: 'price-low', label: 'Price: Low – High' },
    { value: 'price-high', label: 'Price: High – Low' },
  ] as const, [t])

  const handleMulti = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (value: string) => setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])

  const handleSingle = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (value: string) => setter(prev => prev[0] === value ? [] : [value])

  const clearAll = () => {
    setTourTypes([]); setDestinations([]); setCategories([])
    setDurationFilter([]); setPriceFilter([]); setLanguageFilter([]); setRatingFilter([])
    setSortBy(['recommended']); setPage(1)
  }

  const activeFilterCount = tourTypes.length + destinations.length + categories.length +
    durationFilter.length + priceFilter.length + languageFilter.length + ratingFilter.length

  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const eps = 4
    setShowLeftArrow(el.scrollLeft > eps)
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - eps)
  }, [])

  const handleScroll = useCallback(() => updateArrows(), [updateArrows])

  const displayTours = fetchedTours

  const goNextPage = () => {
    if (pagination?.hasNextPage) setPage(p => p + 1)
  }

  const goPrevPage = () => {
    if (pagination?.hasPrevPage) setPage(p => Math.max(1, p - 1))
  }

  return (
    <div className="all-tours-page">
      <Navbar onOpenAuth={onOpenAuth} />
      <div className="all-tours-container">
        <div className="all-tours-header">
          <div className="all-tours-header-left">
            {sectionParam && (
              <button
                onClick={() => navigate('/')}
                className="all-tours-back-btn"
                aria-label="Back to homepage"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="all-tours-title">{pageTitle}</h1>
              {isLoading ? (
                <p className="all-tours-count">Loading tours...</p>
              ) : (
                <p className="all-tours-count">
                  {pagination?.totalCount ?? 0} tour{(pagination?.totalCount ?? 0) !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button className="all-tours-clear" onClick={clearAll}>Clear all filters</button>
          )}
        </div>

        <div className="filter-bar-sticky">
          <div className="filter-bar">
            <button className="filter-drawer-btn" onClick={() => setDrawerOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
              {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
            </button>

            <button
              type="button"
              className={`filter-arrow left ${showLeftArrow ? 'visible' : ''}`}
              onClick={() => { const el = scrollRef.current; if (el) el.scrollBy({ left: -300, behavior: 'smooth' }) }}
              aria-label="Scroll filters left"
            >
              <ChevronLeft size={20} />
            </button>

            <div ref={scrollRef} className="filter-pills-scroll" onScroll={handleScroll}>
              {sectionParam && (
                <button
                  type="button"
                  className="filter-pill active"
                  onClick={() => navigate('/tours')}
                >
                  {SECTION_TITLES[sectionParam] || sectionParam}
                  <X size={12} className="filter-pill-x" />
                </button>
              )}
              {allPillOptions.map((pill) => {
                const active = isPillActive(pill.value)
                return (
                  <button
                    key={pill.key}
                    type="button"
                    className={`filter-pill ${active ? 'active' : ''}`}
                    onClick={() => handlePillToggle(pill.value)}
                  >
                    {pill.label}
                    {active && <X size={12} className="filter-pill-x" />}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className={`filter-arrow right ${showRightArrow ? 'visible' : ''}`}
              onClick={() => { const el = scrollRef.current; if (el) el.scrollBy({ left: 300, behavior: 'smooth' }) }}
              aria-label="Scroll filters right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="all-tours-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tour-card-skeleton" style={{ height: 280, background: '#f0f0f0', borderRadius: 12 }} />
            ))}
          </div>
        )}

        {isError && (
          <div className="all-tours-empty">
            <h3>Failed to load tours</h3>
            <p>{(error as Error)?.message || 'Please try again later.'}</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="all-tours-grid">
            <AnimatePresence mode="popLayout">
              {displayTours.map((tour) => (
                <motion.div
                  key={tour.slug || tour.title}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                >
                    <TourCard
                      title={tour.title}
                      category={tour.category}
                      duration={tour.duration}
                      features={tour.features}
                      price={tour.price}
                      rating={tour.rating}
                      reviews={tour.reviews}
                      location={tour.location}
                      image={tour.image}
                      source={tour.source}
                      externalUrl={tour.externalUrl}
                      slug={tour.slug}
                    />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!isLoading && !isError && displayTours.length === 0 && (
          <div className="all-tours-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h3>No tours match your filters</h3>
            <p>Try adjusting or clearing your filters to see more results.</p>
            <button className="all-tours-clear-btn" onClick={clearAll}>Clear All Filters</button>
          </div>
        )}

        {pagination && (pagination.hasNextPage || pagination.hasPrevPage) && (
          <div className="all-tours-load-more">
            <div className="pagination-controls" style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
              <button
                className="all-tours-load-btn"
                onClick={goPrevPage}
                disabled={!pagination.hasPrevPage}
                style={{ opacity: pagination.hasPrevPage ? 1 : 0.4 }}
              >
                Previous
              </button>
              <span style={{ fontSize: 14, color: '#666' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                className="all-tours-load-btn"
                onClick={goNextPage}
                disabled={!pagination.hasNextPage}
                style={{ opacity: pagination.hasNextPage ? 1 : 0.4 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="filter-drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="filter-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="filter-drawer-header">
                <h2 className="filter-drawer-title">Filters</h2>
                <button type="button" className="filter-drawer-close" onClick={() => setDrawerOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              {activeFilterCount > 0 && (
                <button className="filter-drawer-clear" onClick={() => { clearAll(); }}>
                  Clear all filters ({activeFilterCount})
                </button>
              )}

              <div className="filter-drawer-sections">
                <FilterSection title={t('common.rating')} options={[...RATING_OPTIONS]} selected={ratingFilter} onChange={handleMulti(setRatingFilter)} renderLabel={(opt) => (
                  <span className="filter-rating-label">
                    <span className="filter-rating-number">{opt.label}</span>
                    {Array.from({ length: Number(opt.value) }, (_, i) => (
                      <Star key={i} size={14} className="filter-star-icon" />
                    ))}
                  </span>
                )} />
                <FilterSection title="Type" options={[...TOUR_TYPE_OPTIONS]} selected={tourTypes} onChange={handleMulti(setTourTypes)} />
                <FilterSection title={t('common.duration')} options={DURATION_BUCKETS.map(b => ({ value: b.value, label: b.label }))} selected={durationFilter} onChange={handleMulti(setDurationFilter)} />
                <FilterSection title="Price" options={PRICE_RANGES.map(r => ({ value: r.value, label: r.label }))} selected={priceFilter} onChange={handleMulti(setPriceFilter)} />
                <FilterSection title={t('hero.destination')} options={filterOptions.destinations} selected={destinations} onChange={handleMulti(setDestinations)} />
                <FilterSection title="Category" options={filterOptions.categories} selected={categories} onChange={handleMulti(setCategories)} />
                <FilterSection title="Sort" options={[...sortOptions]} selected={sortBy} onChange={handleSingle(setSortBy)} single />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterSection({
  title,
  options,
  selected,
  onChange,
  single,
  renderLabel,
}: {
  title: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (value: string) => void
  single?: boolean
  renderLabel?: (opt: { value: string; label: string }) => ReactNode
}) {
  return (
    <div className="filter-drawer-section">
      <h3 className="filter-drawer-section-title">{title}</h3>
      <div className="filter-drawer-options">
        {options.map((opt) => {
          const isActive = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              className={`filter-drawer-option ${isActive ? 'active' : ''}`}
              onClick={() => onChange(opt.value)}
            >
              <span className={`filter-drawer-check ${isActive ? 'checked' : ''}`}>
                {isActive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </span>
              <span>{renderLabel ? renderLabel(opt) : opt.label}</span>
              {single && isActive && <span className="filter-drawer-single-indicator">•</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
