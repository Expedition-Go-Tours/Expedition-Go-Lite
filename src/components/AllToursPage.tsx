import { useState, useMemo, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Star, ArrowLeft } from 'lucide-react'
import {
  allTours,
  parsePrice,
  parseCategory,
  getDurationHours,
  durationBuckets,
  priceRanges,
} from './data'
import Navbar from './Navbar'
import TourCard from './TourCard'
import MultiDayCard from './MultiDayCard'
import './AllToursPage.css'

const PRICE_MIN = Math.min(...allTours.map(t => parsePrice(t.price)))
const PRICE_MAX = Math.max(...allTours.map(t => parsePrice(t.price)))

const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'top-rated', label: 'Top Rated' },
  { value: 'price-low', label: 'Price: Low – High' },
  { value: 'price-high', label: 'Price: High – Low' },
] as const

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

const SECTION_TITLES: Record<string, string> = {
  'Recommended': 'Recommended For You',
  'Day Tours': 'Day Tours',
  'Multi-Day Tours': 'Multi-Day Tours',
  'Top Rated': 'Top Rated by Travellers',
  'Sell Out': 'Likely to Sell Out',
  'Last Minute Deals': 'Last Minute Deals',
}

interface AllToursPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
}

export default function AllToursPage({ onOpenAuth }: AllToursPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sectionParam = searchParams.get('section') || '';
  const [tourTypes, setTourTypes] = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [destinations, setDestinations] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [durationFilter, setDurationFilter] = useState<string[]>([])
  const [priceFilter, setPriceFilter] = useState<string[]>([])
  const [priceSliderMin, setPriceSliderMin] = useState(PRICE_MIN)
  const [priceSliderMax, setPriceSliderMax] = useState(PRICE_MAX)
  const [languageFilter, setLanguageFilter] = useState<string[]>([])
  const [ratingFilter, setRatingFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string[]>(['recommended'])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateArrows) : null
    ro?.observe(el)
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      ro?.disconnect()
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows])

  const scrollBy = (dir: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * 300, behavior: 'smooth' })
  }

  const filterOptions = useMemo(() => {
    const uniqueSections = [...new Set(allTours.map(t => t.section))]
    const uniqueDests = [...new Set(allTours.map(t => t.location))]
    const uniqueCats = [...new Set(allTours.map(t => parseCategory(t.category)))].filter(Boolean) as string[]
    const uniqueLangs = [...new Set(allTours.flatMap(t => t.languages || ['English']))].sort()
    return {
      sections: uniqueSections.map(v => ({ value: v, label: v })),
      destinations: uniqueDests.map(v => ({ value: v, label: v })),
      categories: uniqueCats.map(v => ({ value: v, label: v })),
      languages: uniqueLangs.map(v => ({ value: v, label: v })),
    }
  }, [])

  const allPillOptions = useMemo(() => {
    const pills: { key: string; value: string; label: string }[] = []
    TOUR_TYPE_OPTIONS.forEach(o => pills.push({ key: `type-${o.value}`, value: o.value, label: o.label }))
    durationBuckets.forEach(b => pills.push({ key: `dur-${b.value}`, value: b.value, label: b.label }))
    priceRanges.forEach(r => pills.push({ key: `price-${r.value}`, value: r.value, label: r.label }))
    filterOptions.destinations.forEach(d => pills.push({ key: `dest-${d.value}`, value: d.value, label: d.label }))
    filterOptions.categories.forEach(c => pills.push({ key: `cat-${c.value}`, value: c.value, label: c.label }))
    filterOptions.languages.forEach(l => pills.push({ key: `lang-${l.value}`, value: l.value, label: l.label }))
    RATING_OPTIONS.forEach(r => pills.push({ key: `rating-${r.value}`, value: r.value, label: r.label }))
    return pills
  }, [filterOptions])

  const isPillActive = (value: string) => {
    return tourTypes.includes(value) || sections.includes(value) || destinations.includes(value) ||
      categories.includes(value) || durationFilter.includes(value) || priceFilter.includes(value) ||
      languageFilter.includes(value) || ratingFilter.includes(value)
  }

  const handlePillToggle = (value: string) => {
    if (TOUR_TYPE_OPTIONS.some(o => o.value === value)) { handleMulti(setTourTypes)(value); return }
    if (durationBuckets.some(b => b.value === value)) { handleMulti(setDurationFilter)(value); return }
    if (priceRanges.some(r => r.value === value)) { handleMulti(setPriceFilter)(value); return }
    if (RATING_OPTIONS.some(r => r.value === value)) { handleMulti(setRatingFilter)(value); return }
    if (filterOptions.destinations.some(d => d.value === value)) { handleMulti(setDestinations)(value); return }
    if (filterOptions.categories.some(c => c.value === value)) { handleMulti(setCategories)(value); return }
    if (filterOptions.languages.some(l => l.value === value)) { handleMulti(setLanguageFilter)(value); return }
  }

  const pageTitle = SECTION_TITLES[sectionParam] || 'All Tours'

  const filteredTours = useMemo(() => {
    let result = [...allTours]
    if (sectionParam) result = result.filter(t => t.section === sectionParam)
    if (tourTypes.length > 0) result = result.filter(t => tourTypes.includes(t.tourType))
    if (sections.length > 0) result = result.filter(t => sections.includes(t.section))
    if (destinations.length > 0) result = result.filter(t => destinations.includes(t.location))
    if (categories.length > 0) result = result.filter(t => categories.includes(parseCategory(t.category)))
    if (durationFilter.length > 0) {
      result = result.filter(t => {
        const hours = getDurationHours(t)
        return durationFilter.some(key => {
          const bucket = durationBuckets.find(b => b.value === key)
          return bucket ? bucket.match(hours) : false
        })
      })
    }
    if (priceFilter.length > 0) {
      result = result.filter(t => {
        const price = parsePrice(t.price)
        return priceFilter.some(key => {
          const range = priceRanges.find(r => r.value === key)
          return range ? range.match(price) : false
        })
      })
    }
    if (priceSliderMin > PRICE_MIN || priceSliderMax < PRICE_MAX) {
      result = result.filter(t => {
        const price = parsePrice(t.price)
        return price >= priceSliderMin && price <= priceSliderMax
      })
    }
    if (languageFilter.length > 0) {
      result = result.filter(t => {
        const langs = t.languages || ['English']
        return langs.some(l => languageFilter.includes(l))
      })
    }
    if (ratingFilter.length > 0) {
      result = result.filter(t => {
        const rating = parseFloat(t.rating)
        return ratingFilter.some(key => parseFloat(key) <= rating)
      })
    }
    const sortKey = sortBy[0] || 'recommended'
    if (sortKey === 'top-rated') result.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    else if (sortKey === 'price-low') result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
    else if (sortKey === 'price-high') result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price))
    return result
  }, [sectionParam, tourTypes, sections, destinations, categories, durationFilter, priceFilter, priceSliderMin, priceSliderMax, languageFilter, ratingFilter, sortBy])

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [sectionParam, tourTypes, sections, destinations, categories, durationFilter, priceFilter, priceSliderMin, priceSliderMax, languageFilter, ratingFilter, sortBy])

  const visibleTours = filteredTours.slice(0, visibleCount)
  const hasMore = visibleCount < filteredTours.length

  const handleMulti = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (value: string) => setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])

  const handleSingle = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (value: string) => setter(prev => prev[0] === value ? [] : [value])

  const clearAll = () => {
    setTourTypes([]); setSections([]); setDestinations([]); setCategories([])
    setDurationFilter([]); setPriceFilter([]); setLanguageFilter([]); setRatingFilter([])
    setPriceSliderMin(PRICE_MIN); setPriceSliderMax(PRICE_MAX)
    setSortBy(['recommended'])
  }

  const priceSliderActive = priceSliderMin > PRICE_MIN || priceSliderMax < PRICE_MAX
  const activeFilterCount = tourTypes.length + sections.length + destinations.length + categories.length +
    durationFilter.length + priceFilter.length + languageFilter.length + ratingFilter.length +
    (priceSliderActive ? 1 : 0)

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
              <p className="all-tours-count">{filteredTours.length} tour{filteredTours.length !== 1 ? 's' : ''} found</p>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button className="all-tours-clear" onClick={clearAll}>Clear all filters</button>
          )}
        </div>

        {/* Filter Bar */}
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
            onClick={() => scrollBy(-1)}
            aria-label="Scroll filters left"
          >
            <ChevronLeft size={20} />
          </button>

          <div ref={scrollRef} className="filter-pills-scroll" onScroll={updateArrows}>
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
            onClick={() => scrollBy(1)}
            aria-label="Scroll filters right"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        </div>

        {/* Tour Grid */}
        <div className="all-tours-grid">
          <AnimatePresence mode="popLayout">
            {visibleTours.map((tour) => (
              <motion.div
                key={tour.title}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              >
                {tour.tourType === 'multi-day' ? (
                  <MultiDayCard
                    title={tour.title}
                    days={(tour as any).days || ''}
                    accommodation={(tour as any).accommodation || ''}
                    highlights={(tour as any).highlights || ''}
                    price={tour.price}
                    rating={tour.rating}
                    reviews={tour.reviews}
                    location={tour.location}
                    image={tour.image}
                  />
                ) : (
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
                    discount={tour.discount}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {visibleTours.length === 0 && (
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

        {hasMore && (
          <div className="all-tours-load-more">
            <button className="all-tours-load-btn" onClick={() => setVisibleCount(c => c + 8)}>
              Load More ({filteredTours.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Filters Drawer Modal */}
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
                <div className="filter-drawer-section">
                  <h3 className="filter-drawer-section-title">Price Range</h3>
                  <div className="price-slider-container">
                    <div className="price-slider-values">
                      <span className="price-slider-value">${priceSliderMin}</span>
                      <span className="price-slider-sep">–</span>
                      <span className="price-slider-value">${priceSliderMax}</span>
                    </div>
                    <div className="price-slider-track">
                      <div className="price-slider-fill" style={{
                        left: `${((priceSliderMin - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
                        right: `${100 - ((priceSliderMax - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
                      }} />
                      <input
                        type="range"
                        min={PRICE_MIN}
                        max={PRICE_MAX}
                        value={priceSliderMin}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setPriceSliderMin(Math.min(val, priceSliderMax - 5))
                        }}
                        className="price-slider-input price-slider-input-min"
                      />
                      <input
                        type="range"
                        min={PRICE_MIN}
                        max={PRICE_MAX}
                        value={priceSliderMax}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setPriceSliderMax(Math.max(val, priceSliderMin + 5))
                        }}
                        className="price-slider-input price-slider-input-max"
                      />
                    </div>
                  </div>
                </div>
                <FilterSection title="Rating" options={[...RATING_OPTIONS]} selected={ratingFilter} onChange={handleMulti(setRatingFilter)} renderLabel={(opt) => (
                  <span className="filter-rating-label">
                    <span className="filter-rating-number">{opt.label}</span>
                    {Array.from({ length: Number(opt.value) }, (_, i) => (
                      <Star key={i} size={14} className="filter-star-icon" />
                    ))}
                  </span>
                )} />
                <FilterSection title="Type" options={[...TOUR_TYPE_OPTIONS]} selected={tourTypes} onChange={handleMulti(setTourTypes)} />
                <FilterSection title="Duration" options={durationBuckets.map(b => ({ value: b.value, label: b.label }))} selected={durationFilter} onChange={handleMulti(setDurationFilter)} />
                <FilterSection title="Price" options={priceRanges.map(r => ({ value: r.value, label: r.label }))} selected={priceFilter} onChange={handleMulti(setPriceFilter)} />
                <FilterSection title="Destination" options={filterOptions.destinations} selected={destinations} onChange={handleMulti(setDestinations)} />
                <FilterSection title="Category" options={filterOptions.categories} selected={categories} onChange={handleMulti(setCategories)} />
                <FilterSection title="Language" options={filterOptions.languages} selected={languageFilter} onChange={handleMulti(setLanguageFilter)} />
                <FilterSection title="Sort" options={[...SORT_OPTIONS]} selected={sortBy} onChange={handleSingle(setSortBy)} single />
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
