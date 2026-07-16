import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, ChevronUp, Star, Check, ChevronLeft, ChevronRight,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import './OverviewSection.css'

interface OverviewItem {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  desc: string | null
}

interface OverviewSectionProps {
  highlightsGrid: OverviewItem[]
  descriptionSteps: { title: string; body: string }[]
  highlights: string[]
  reviews: {
    id: string
    name: string
    date: string
    rating: number
    text: string
    country?: string
  }[]
  onTabChange: (tab: string) => void
  onReviewReadMore: (review: any) => void
}

export default function OverviewSection({
  highlightsGrid,
  descriptionSteps,
  highlights,
  reviews,
  onTabChange,
  onReviewReadMore,
}: OverviewSectionProps) {
  const [fullDescriptionExpanded, setFullDescriptionExpanded] = useState(true)
  const [highlightsOpen, setHighlightsOpen] = useState(true)
  const travellersLovedRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const handleTravellersScroll = useCallback(() => {
    const el = travellersLovedRef.current
    if (!el) return
    setShowLeftArrow(el.scrollLeft > 4)
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  const scrollLeft = useCallback(() => {
    travellersLovedRef.current?.scrollBy({ left: -960, behavior: 'smooth' })
  }, [])

  const scrollRight = useCallback(() => {
    travellersLovedRef.current?.scrollBy({ left: 960, behavior: 'smooth' })
  }, [])

  const displayReviews = reviews.slice(0, 8)
  const avatarColors = ['bg-amber-600', 'bg-emerald-600', 'bg-blue-600', 'bg-rose-500', 'bg-violet-600', 'bg-orange-500']

  return (
    <motion.section
      key="overview"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="overview-section"
    >
      {/* Highlights Grid */}
      <div className="overview-highlights-grid">
        {highlightsGrid.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="overview-highlight-card">
            <div className="overview-highlight-icon">
              <Icon className="overview-highlight-icon-svg" strokeWidth={1.5} />
            </div>
            <div>
              <p className="overview-highlight-card-title">{title}</p>
              {desc && <p className="overview-highlight-card-desc">{desc}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Full Description */}
      {descriptionSteps.length > 0 && (
        <div className="overview-description">
          <ol className="overview-description-list">
            {descriptionSteps.slice(0, 2).map((step) => (
              <li key={step.title}>
                <p className="overview-description-step-title">{step.title}</p>
                <p className="overview-description-step-body">{step.body}</p>
              </li>
            ))}
            <AnimatePresence initial={false}>
              {fullDescriptionExpanded && descriptionSteps.slice(2).map((step) => (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <p className="overview-description-step-title">{step.title}</p>
                  <p className="overview-description-step-body">{step.body}</p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          {descriptionSteps.length > 2 && (
            <button
              type="button"
              onClick={() => setFullDescriptionExpanded((v) => !v)}
              className="overview-description-toggle"
            >
              {fullDescriptionExpanded ? 'See less' : 'See more'}
            </button>
          )}
        </div>
      )}

      {/* What Travellers Loved */}
      {displayReviews.length > 0 && (
        <section className="overview-travellers">
          <div className="overview-travellers-header">
            <h2 className="overview-travellers-title">What travellers loved</h2>
            <Link
              to="#reviews"
              onClick={() => onTabChange('reviews')}
              className="overview-travellers-link"
            >
              See all reviews &rarr;
            </Link>
          </div>
          <div className="overview-travellers-scroll-wrapper">
            {showLeftArrow && (
              <button
                type="button"
                onClick={scrollLeft}
                className="overview-travellers-arrow left"
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div
              ref={travellersLovedRef}
              className="overview-travellers-scroll"
              onScroll={handleTravellersScroll}
            >
              {displayReviews.map((review, idx) => {
                const initials = review.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                const avatarColor = avatarColors[idx % avatarColors.length]

                return (
                  <article key={review.id} className="overview-traveller-card">
                    <div className="overview-traveller-card-header">
                      <div className={`overview-traveller-avatar ${avatarColor}`}>
                        {initials}
                      </div>
                      <div>
                        <p className="overview-traveller-name">{review.name}</p>
                        <div className="overview-traveller-meta">
                          <span>{review.date}</span>
                          <span className="overview-traveller-verified">
                            <Check size={10} strokeWidth={3} />
                            Verified booking
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="overview-traveller-stars">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < review.rating ? 'star-filled' : 'star-empty'}
                        />
                      ))}
                    </div>
                    <p className="overview-traveller-text">{review.text}</p>
                    <button
                      type="button"
                      onClick={() => onReviewReadMore(review)}
                      className="overview-traveller-readmore"
                    >
                      Read more
                    </button>
                  </article>
                )
              })}
            </div>
            {showRightArrow && (
              <button
                type="button"
                onClick={scrollRight}
                className="overview-travellers-arrow right"
                aria-label="Scroll right"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </section>
      )}

      {/* Highlights Accordion */}
      {highlights.length > 0 && (
        <div className="overview-accordion">
          <button
            type="button"
            onClick={() => setHighlightsOpen((v) => !v)}
            className="overview-accordion-trigger"
            aria-expanded={highlightsOpen}
          >
            <span>Highlights</span>
            {highlightsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <AnimatePresence initial={false}>
            {highlightsOpen && (
              <motion.div
                key="highlights-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overview-accordion-content"
              >
                <ul className="overview-accordion-list">
                  {highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  )
}
