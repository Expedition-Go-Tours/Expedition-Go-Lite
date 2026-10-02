import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { SearchSuggestion } from '../hooks/useSearchAutocomplete'
import { tourHref } from '../lib/tourPath'
import { ensureHandoff } from '../lib/ssoHandoff'
import { stampRegionOnCurrentUrl } from '../lib/tourRegionHandoff'
import { useOptionalLocationSearch } from '../context/LocationSearchContext'
import './SearchContextChip.css'

interface SearchContextChipProps {
  suggestion: SearchSuggestion | null
  onDismiss?: () => void
}

export default function SearchContextChip({ suggestion, onDismiss }: SearchContextChipProps) {
  const navigate = useNavigate()
  const locationSearch = useOptionalLocationSearch()

  const handleClick = () => {
    if (!suggestion) return
    if (suggestion.kind === 'attraction') {
      navigate(`/tours?attraction=${encodeURIComponent(suggestion.name)}&place=${encodeURIComponent(suggestion.region || '')}`)
    } else if (suggestion.kind === 'place') {
      navigate(`/tours?place=${encodeURIComponent(suggestion.name)}`)
    } else if (suggestion.kind === 'region') {
      navigate(`/tours?place=${encodeURIComponent(suggestion.name)}`)
    } else if (suggestion.kind === 'tour' && suggestion.slug) {
      // Same as every other search surface: scope the homepage to the tour's
      // region. Both channels are needed because this leaves the origin and
      // consent-gated storage is in-memory for anyone who declined cookies.
      if (suggestion.region) {
        locationSearch?.setLocation(suggestion.region)
        stampRegionOnCurrentUrl(suggestion.region)
      }
      void ensureHandoff(tourHref(suggestion.tourId, suggestion.slug)).then((destination) =>
        window.location.assign(destination),
      )
    } else {
      navigate(`/tours?place=${encodeURIComponent(suggestion.name)}`)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {suggestion && (
        <motion.div
          key={suggestion.name}
          className="search-context-chip"
          initial={{ opacity: 0, y: -6, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 10 }}
          exit={{ opacity: 0, y: -6, height: 0, marginTop: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <button
            type="button"
            className="search-context-chip-btn"
            onClick={handleClick}
            aria-label={`View results for ${suggestion.name}`}
          >
            <span className="search-context-chip-text">
              Recommendations based on your search: <strong>{suggestion.name}</strong>
            </span>
            <span className="search-context-chip-arrow">
              View results ›
            </span>
          </button>
          {onDismiss && (
            <button
              type="button"
              className="search-context-chip-dismiss"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
