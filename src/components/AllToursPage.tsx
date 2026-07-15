import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import FilterBar from './FilterBar'
import './AllToursPage.css'

const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'top-rated', label: 'Top Rated' },
  { value: 'price-low', label: 'Price: Low – High' },
  { value: 'price-high', label: 'Price: High – Low' },
] as const

const RATING_OPTIONS = [
  { value: '4', label: '★ 4+' },
  { value: '4.5', label: '★ 4.5+' },
] as const

const TOUR_TYPE_OPTIONS = [
  { value: 'day', label: 'Day Tours' },
  { value: 'multi-day', label: 'Multi-Day' },
] as const

interface AllToursPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
  onOpenDashboard?: () => void
  onOpenWishlist?: () => void
  onOpenBookings?: () => void
}

export default function AllToursPage({ onOpenAuth, onOpenDashboard, onOpenWishlist, onOpenBookings }: AllToursPageProps) {
  const [tourTypes, setTourTypes] = useState<string[]>([])
  const [sections, setSections] = useState<string[]>([])
  const [destinations, setDestinations] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [durationFilter, setDurationFilter] = useState<string[]>([])
  const [priceFilter, setPriceFilter] = useState<string[]>([])
  const [languageFilter, setLanguageFilter] = useState<string[]>([])
  const [ratingFilter, setRatingFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string[]>(['recommended'])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

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

  const filteredTours = useMemo(() => {
    let result = [...allTours]

    if (tourTypes.length > 0) {
      result = result.filter(t => tourTypes.includes(t.tourType))
    }

    if (sections.length > 0) {
      result = result.filter(t => sections.includes(t.section))
    }

    if (destinations.length > 0) {
      result = result.filter(t => destinations.includes(t.location))
    }

    if (categories.length > 0) {
      result = result.filter(t => categories.includes(parseCategory(t.category)))
    }

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

    if (languageFilter.length > 0) {
      result = result.filter(t => {
        const langs = t.languages || ['English']
        return langs.some(l => languageFilter.includes(l))
      })
    }

    if (ratingFilter.length > 0) {
      result = result.filter(t => {
        const rating = parseFloat(t.rating)
        return ratingFilter.some(key => {
          const min = parseFloat(key)
          return rating >= min
        })
      })
    }

    const sortKey = sortBy[0] || 'recommended'
    if (sortKey === 'top-rated') {
      result.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    } else if (sortKey === 'price-low') {
      result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
    } else if (sortKey === 'price-high') {
      result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price))
    }

    return result
  }, [tourTypes, sections, destinations, categories, durationFilter, priceFilter, languageFilter, ratingFilter, sortBy])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [tourTypes, sections, destinations, categories, durationFilter, priceFilter, languageFilter, ratingFilter, sortBy])

  const visibleTours = filteredTours.slice(0, visibleCount)
  const hasMore = visibleCount < filteredTours.length

  const handleMulti = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (value: string) => {
      setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
    }

  const handleSingle = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (value: string) => {
      setter(prev => prev[0] === value ? [] : [value])
    }

  const clearAll = () => {
    setTourTypes([])
    setSections([])
    setDestinations([])
    setCategories([])
    setDurationFilter([])
    setPriceFilter([])
    setLanguageFilter([])
    setRatingFilter([])
    setSortBy(['recommended'])
  }

  const hasActiveFilters = tourTypes.length > 0 || sections.length > 0 || destinations.length > 0 ||
    categories.length > 0 || durationFilter.length > 0 || priceFilter.length > 0 ||
    languageFilter.length > 0 || ratingFilter.length > 0

  return (
    <div className="all-tours-page">
      <Navbar
        onOpenAuth={onOpenAuth}
        onOpenDashboard={onOpenDashboard}
        onOpenWishlist={onOpenWishlist}
        onOpenBookings={onOpenBookings}
      />
      <div className="all-tours-container">
        <div className="all-tours-header">
          <div>
            <h1 className="all-tours-title">All Tours</h1>
            <p className="all-tours-count">{filteredTours.length} tour{filteredTours.length !== 1 ? 's' : ''} found</p>
          </div>
          {hasActiveFilters && (
            <button className="all-tours-clear" onClick={clearAll}>Clear all filters</button>
          )}
        </div>

        <div className="all-tours-filters">
          <FilterBar
            label="Type"
            options={[...TOUR_TYPE_OPTIONS]}
            selected={tourTypes}
            onChange={handleMulti(setTourTypes)}
          />
          <FilterBar
            label="Section"
            options={filterOptions.sections}
            selected={sections}
            onChange={handleMulti(setSections)}
          />
          <FilterBar
            label="Destination"
            options={filterOptions.destinations}
            selected={destinations}
            onChange={handleMulti(setDestinations)}
          />
          <FilterBar
            label="Category"
            options={filterOptions.categories}
            selected={categories}
            onChange={handleMulti(setCategories)}
          />
          <FilterBar
            label="Duration"
            options={durationBuckets.map(b => ({ value: b.value, label: b.label }))}
            selected={durationFilter}
            onChange={handleMulti(setDurationFilter)}
          />
          <FilterBar
            label="Price"
            options={priceRanges.map(r => ({ value: r.value, label: r.label }))}
            selected={priceFilter}
            onChange={handleMulti(setPriceFilter)}
          />
          <FilterBar
            label="Language"
            options={filterOptions.languages}
            selected={languageFilter}
            onChange={handleMulti(setLanguageFilter)}
          />
          <FilterBar
            label="Rating"
            options={[...RATING_OPTIONS]}
            selected={ratingFilter}
            onChange={handleMulti(setRatingFilter)}
          />
          <FilterBar
            label="Sort"
            options={[...SORT_OPTIONS]}
            selected={sortBy}
            onChange={handleSingle(setSortBy)}
            multi={false}
          />
        </div>

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
            <button
              className="all-tours-load-btn"
              onClick={() => setVisibleCount(c => c + 8)}
            >
              Load More ({filteredTours.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
