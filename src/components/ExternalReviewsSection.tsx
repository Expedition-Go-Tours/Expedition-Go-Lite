import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import SectionHeading from './SectionHeading'
import ExternalReviewCard from './ExternalReviewCard'
import { useExternalReviews, useExternalReviewStats } from '../hooks/useExternalReviews'
import './ExternalReviewsSection.css'

const CARD_WIDTH = 295
const GAP = 16
const AUTO_SCROLL_INTERVAL = 3000

export default function ExternalReviewsSection() {
  const { t } = useTranslation()
  const { data: reviews, isLoading } = useExternalReviews(50)
  const { data: stats } = useExternalReviewStats()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const isHovering = useRef(false)
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 5)
    setCanScrollRight(el.scrollLeft < maxScroll - 5)
  }, [])

  const scrollTo = (target: number) => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    el.scrollTo({ left: Math.min(target, maxScroll), behavior: 'smooth' })
  }

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardStep = CARD_WIDTH + GAP
    const maxScroll = el.scrollWidth - el.clientWidth
    const current = el.scrollLeft
    const next = direction === 'left'
      ? Math.max(0, current - cardStep * 3)
      : Math.min(current + cardStep * 3, maxScroll)
    scrollTo(next)
  }

  // Auto-scroll
  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) return
    autoScrollTimer.current = setInterval(() => {
      const el = scrollRef.current
      if (!el || isHovering.current) return
      const cardStep = CARD_WIDTH + GAP
      const maxScroll = el.scrollWidth - el.clientWidth
      const atEnd = el.scrollLeft >= maxScroll - 10
      if (atEnd) {
        // Loop back to start
        scrollTo(0)
      } else {
        scrollTo(el.scrollLeft + cardStep)
      }
    }, AUTO_SCROLL_INTERVAL)
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current)
      autoScrollTimer.current = null
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    const onScroll = () => updateArrows()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [updateArrows, reviews])

  // Start auto-scroll when reviews load
  useEffect(() => {
    if (reviews && reviews.length > 0) {
      startAutoScroll()
    }
    return () => stopAutoScroll()
  }, [reviews, startAutoScroll, stopAutoScroll])

  const handleMouseEnter = () => { isHovering.current = true }
  const handleMouseLeave = () => { isHovering.current = false }

  if (isLoading || !reviews || reviews.length === 0) {
    return null
  }

  return (
    <section className="ext-reviews-section">
      <div className="ext-reviews-container">
        <div className="ext-reviews-viewport">
          <SectionHeading
            title={t('sections.whatTravellersAreSaying')}
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />

          {/* Stats bar */}
          {stats && (
            <div className="ext-reviews-stats">
              <div className="ext-reviews-stats__rating">
                <span className="ext-reviews-stats__number">{stats.averageRating}</span>
                <div className="ext-reviews-stats__stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`ext-reviews-stats__star${i < Math.round(stats.averageRating!) ? ' ext-reviews-stats__star--filled' : ''}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <span className="ext-reviews-stats__divider" />
              <span className="ext-reviews-stats__text">
                From <strong>{stats.totalReviews}+</strong> reviews across
              </span>
              <div className="ext-reviews-stats__platforms">
                <span className="ext-reviews-stats__platform ext-reviews-stats__platform--ta">
                  <svg className="ext-reviews-stats__platform-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="32" cy="32" r="32" fill="#34E0A1" />
                    <g transform="translate(10, 14)">
                      <circle cx="10" cy="14" r="8" fill="#000" />
                      <circle cx="10" cy="14" r="5" fill="#34E0A1" />
                      <circle cx="10" cy="14" r="2.5" fill="#000" />
                      <circle cx="34" cy="14" r="8" fill="#000" />
                      <circle cx="34" cy="14" r="5" fill="#34E0A1" />
                      <circle cx="34" cy="14" r="2.5" fill="#000" />
                      <path d="M22 18 L20 24 L24 24 Z" fill="#000" />
                      <path d="M4 8 L8 2 L12 8" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M32 8 L36 2 L40 8" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M4 8 Q4 28 22 28 Q40 28 40 8" fill="none" stroke="#000" strokeWidth="2" />
                    </g>
                  </svg>
                  TripAdvisor
                </span>
                <span className="ext-reviews-stats__platform ext-reviews-stats__platform--gyg">
                  <svg className="ext-reviews-stats__platform-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                    <rect width="64" height="64" rx="8" fill="#E63C2F" />
                    <text x="32" y="28" textAnchor="middle" fill="#fff" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="16" letterSpacing="-0.5">GET</text>
                    <text x="32" y="44" textAnchor="middle" fill="#fff" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="16" letterSpacing="-0.5">YOUR</text>
                    <text x="32" y="58" textAnchor="middle" fill="#fff" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="13" letterSpacing="-0.5">GUIDE</text>
                  </svg>
                  GetYourGuide
                </span>
              </div>
            </div>
          )}
          <div
            className="ext-reviews-clip"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="ext-reviews-carousel" ref={scrollRef}>
              {reviews.map((review) => (
                <div key={review.id} className="ext-reviews-card-wrap">
                  <ExternalReviewCard review={review} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
