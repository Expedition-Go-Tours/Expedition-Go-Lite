import { useRef, useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SectionHeading from './SectionHeading'
import TripAdvisorLogo from './TripAdvisorLogo'
import { reviews } from './data'
import type { Review } from './data'
import './CustomReviewsSection.css'

const CARD_WIDTH = 295
const GAP = 16
const PAGE_WIDTH = (CARD_WIDTH + GAP) * 3

function Stars({ count }: { count: number }) {
  return (
    <div className="review-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= count ? '#179237' : '#ddd'} stroke={i <= count ? '#179237' : '#ddd'} strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review, onReadMore }: { review: Review; onReadMore: () => void }) {
  return (
    <div className="review-card-wrap">
      <div className="review-card">
        <div className="review-card-top">
          <div className="review-avatar">{review.avatar}</div>
          <div className="review-name-row">
            <span className="review-name">{review.name}</span>
            <Stars count={review.rating} />
          </div>
        </div>
        <div className="review-date">{review.date}</div>
        <p className="review-text">{review.text}</p>
        <button className="review-readmore" onClick={onReadMore}>Read more</button>
        <div className="review-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {review.location}
        </div>
      </div>
    </div>
  )
}

function ReviewModal({ review, onClose }: { review: Review; onClose: () => void }) {
  return (
    <motion.div
      className="review-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="review-modal-card"
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="review-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="review-modal-top">
          <div className="review-avatar review-avatar--lg">{review.avatar}</div>
          <div>
            <div className="review-modal-name">{review.name}</div>
            <Stars count={review.rating} />
            <div className="review-modal-date">{review.date}</div>
          </div>
        </div>
        <p className="review-modal-text">{review.text}</p>
        <div className="review-modal-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {review.location}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function CustomReviewsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const items = reviews

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < maxScroll - 2)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const delta = direction === 'left' ? -PAGE_WIDTH : PAGE_WIDTH
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    const onScroll = () => updateArrows()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [updateArrows])

  return (
    <section className="reviews-section">
      <div className="reviews-container">
        <div className="reviews-viewport">
          <SectionHeading
            title="Reviews from Tripadvisor"
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="tripadvisor-bar">
            <TripAdvisorLogo />
            <span className="tripadvisor-text">Powered by Tripadvisor</span>
          </div>
          <div className="reviews-clip">
            <div className="reviews-carousel" ref={scrollRef}>
              {items.map((review, i) => (
                <ReviewCard key={`${review.name}-${i}`} review={review} onReadMore={() => setSelectedReview(review)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedReview && (
          <ReviewModal review={selectedReview} onClose={() => setSelectedReview(null)} />
        )}
      </AnimatePresence>
    </section>
  )
}
