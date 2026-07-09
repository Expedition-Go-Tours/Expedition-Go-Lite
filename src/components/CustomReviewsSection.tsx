import { useRef, useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SectionHeading from './SectionHeading'
import trippyLogo from '../assets/icons/trippy.png'
import './CustomReviewsSection.css'

const CARD_WIDTH = 295
const GAP = 16

interface Review {
  name: string
  avatar: string
  rating: number
  date: string
  text: string
}

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
          <div className="review-avatar">
            {review.avatar ? (
              <img src={review.avatar} alt={review.name} className="review-avatar-img" />
            ) : (
              review.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="review-name-row">
            <span className="review-name">{review.name}</span>
            <Stars count={review.rating} />
          </div>
        </div>
        <div className="review-date">{review.date}</div>
        <p className="review-text">{review.text}</p>
        <button className="review-readmore" onClick={onReadMore}>Read more</button>
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
          <div className="review-avatar review-avatar--lg">
            {review.avatar ? (
              <img src={review.avatar} alt={review.name} className="review-avatar-img" />
            ) : (
              review.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="review-modal-name">{review.name}</div>
            <Stars count={review.rating} />
            <div className="review-modal-date">{review.date}</div>
          </div>
        </div>
        <p className="review-modal-text">{review.text}</p>
      </motion.div>
    </motion.div>
  )
}

function extractReviewsFromDOM(): Review[] {
  const cards = document.querySelectorAll('.es-review-background-container')
  const reviews: Review[] = []

  cards.forEach((card) => {
    const nameEl = card.querySelector('.es-review-author-name')
    const textEl = card.querySelector('.es-text-shortener')
    const dateEl = card.querySelector('.es-review-info-date')
    const imgEl = card.querySelector('.es-avatar-image') as HTMLImageElement
    const ratingEls = card.querySelectorAll('.es-rating-item-filled')

    const name = nameEl?.textContent?.trim() || ''
    const text = textEl?.textContent?.trim() || ''
    const date = dateEl?.textContent?.trim() || ''
    const rating = Math.min(ratingEls.length, 5)
    const avatar = imgEl?.src || ''

    if (name && text) {
      reviews.push({ name, avatar, rating, date, text })
    }
  })

  return reviews
}

export default function CustomReviewsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return

    const tryExtract = () => {
      const cards = document.querySelectorAll('.es-review-background-container')
      if (cards.length > 0) {
        const extracted = extractReviewsFromDOM()
        if (extracted.length > 0) {
          setReviews(extracted)
          setLoaded(true)
          observer?.disconnect()
          clearTimeout(fallback)
          return true
        }
      }
      return false
    }

    const observer = new MutationObserver(() => { tryExtract() })
    observer.observe(document.body, { childList: true, subtree: true })

    const fallback = setTimeout(tryExtract, 10000)

    return () => {
      observer.disconnect()
      clearTimeout(fallback)
    }
  }, [loaded])

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < maxScroll - 2)
  }, [])

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const cardStep = CARD_WIDTH + GAP
    el.scrollTo({ left: index * cardStep, behavior: 'smooth' })
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardStep = CARD_WIDTH + GAP
    const currentIndex = Math.round(el.scrollLeft / cardStep)
    const maxIndex = Math.ceil(el.scrollWidth / cardStep) - 1
    const targetIndex = direction === 'left'
      ? Math.max(0, currentIndex - 3)
      : Math.min(currentIndex + 3, maxIndex)
    scrollToIndex(targetIndex)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    const onScroll = () => updateArrows()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [updateArrows, loaded])

  return (
    <section className="reviews-section">
      <div className="reviews-container">
        <div className="reviews-viewport">
          <SectionHeading
            title="Reviews from Tripadvisor"
            viewAllLink="https://www.tripadvisor.co.uk/Attraction_Review-g293797-d24155300-Reviews-Expedition_Go_Tours_Ltd-Accra_Greater_Accra.html"
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />

          <div className="reviews-elfsight" data-extracted={loaded ? 'true' : 'false'}>
            <div className="elfsight-app-81f18ebc-8702-4317-b46f-6de7cfe86fa7" data-elfsight-app-lazy></div>
          </div>

          {loaded && (
            <>
              <div className="reviews-hero">
                <img src={trippyLogo} alt="Tripadvisor" className="reviews-hero-img" />
              </div>
              <div className="reviews-clip">
                <div className="reviews-carousel" ref={scrollRef}>
                  {reviews.map((review, i) => (
                    <ReviewCard key={`${review.name}-${i}`} review={review} onReadMore={() => setSelectedReview(review)} />
                  ))}
                </div>
              </div>
              <div className="tripadvisor-bar">
                <span className="tripadvisor-text">Powered by Tripadvisor</span>
              </div>
            </>
          )}
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
