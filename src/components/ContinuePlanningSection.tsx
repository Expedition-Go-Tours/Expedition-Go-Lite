import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SectionHeading from './SectionHeading'
import { useContinuePlanning } from '../context/ContinuePlanningContext'
import FormattedPrice from './FormattedPrice'
import './ContinuePlanningSection.css'

const CARD_WIDTH = 440
const GAP = 16
const PAGE_WIDTH = (CARD_WIDTH + GAP) * 3

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="cp-stars">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.min(1, Math.max(0, rating - i))
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24">
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              fill={fill >= 0.95 ? '#179237' : '#e5e7eb'}
            />
            {fill > 0.05 && fill < 0.95 && (
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                fill="#179237"
                clipPath={`polygon(0 0, ${fill * 100}% 0, ${fill * 100}% 100%, 0 100%)`}
              />
            )}
          </svg>
        )
      })}
    </div>
  )
}

export default function ContinuePlanningSection() {
  const { t } = useTranslation()
  const { continuePlanning } = useContinuePlanning()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const navigate = useNavigate()

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
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows, continuePlanning.length])

  if (continuePlanning.length === 0) return null

  return (
    <section className="continue-planning-section">
      <div className="continue-planning-container">
        <div className="continue-planning-viewport">
          <SectionHeading
            title={t('sections.continuePlanning')}
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="continue-planning-clip">
            <div className="continue-planning-carousel" ref={scrollRef}>
              {continuePlanning.map((item) => (
                <div key={item.id} className="continue-planning-card-wrap">
                  <div
                    className="continue-planning-card"
                    onClick={() => navigate(`/tour/${toSlug(item.title)}`)}
                  >
                    <div className="cp-card-image">
                      <img src={item.imageUrl} alt={item.title} loading="lazy" />
                    </div>
                    <div className="cp-card-body">
                      <h3 className="cp-card-title">{item.title}</h3>
                      <p className="cp-card-subtitle">
                        {item.duration}{item.features ? ` \u2022 ${item.features}` : ''}
                      </p>
                      <div className="cp-card-rating-row">
                        <StarRating rating={item.rating} />
                        <span className="cp-card-rating-value">{item.rating}</span>
                        <span className="cp-card-rating-count">({item.reviewCount})</span>
                      </div>
                      <div className="cp-card-price-row">
                        <span className="cp-card-from">{t('common.from')} </span>
                        <span className="cp-card-price">
                          <FormattedPrice usdPrice={item.price} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
