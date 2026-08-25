import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { transformImage } from '@/lib/image'
import { useMoodKeywords, type MoodKeyword } from '../hooks/useHomepageSections'
import { trackMoodClick } from '../lib/analytics'
import './MoodSection.css'

const CARD_WIDTH = 295
const GAP = 16

const FALLBACK_CATEGORIES = [
  { keyword: 'Adventure', image: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?auto=format&fit=crop&w=600&q=80', tourCount: 15 },
  { keyword: 'Cultural', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80', tourCount: 20 },
  { keyword: 'Nature', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80', tourCount: 18 },
  { keyword: 'Beach', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', tourCount: 12 },
  { keyword: 'Wildlife', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=80', tourCount: 10 },
  { keyword: 'City Tours', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80', tourCount: 22 },
  { keyword: 'Food & Drinks', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80', tourCount: 9 },
  { keyword: 'Wellness', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80', tourCount: 7 },
]

interface Props {
  preloaded?: MoodKeyword[]
}

export default function MoodSection({ preloaded }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const { data: liveKeywords } = useMoodKeywords(8)

  const items = (preloaded ?? liveKeywords)?.length
    ? (preloaded ?? liveKeywords)!.map((k: MoodKeyword) => ({
        keyword: k.keyword,
        image: k.image || FALLBACK_CATEGORIES[0].image,
        tourCount: k.tourCount,
      }))
    : FALLBACK_CATEGORIES

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
    const cardStep = CARD_WIDTH + GAP
    const currentIndex = Math.round(el.scrollLeft / cardStep)
    const maxIndex = Math.ceil(el.scrollWidth / cardStep) - 1
    const targetIndex = direction === 'left'
      ? Math.max(0, currentIndex - 3)
      : Math.min(currentIndex + 3, maxIndex)
    el.scrollTo({ left: targetIndex * cardStep, behavior: 'smooth' })
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
    <section className="mood-section">
      <div className="mood-container">
        <div className="mood-viewport">
          <div className="mood-header">
            <h2 className="mood-title">{t('mood.title')}</h2>
            <div className="mood-arrows">
              <button className={`mood-arrow${!canScrollLeft ? ' muted' : ''}`} onClick={() => scroll('left')} aria-label={t('common.scrollLeft')} disabled={!canScrollLeft}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button className={`mood-arrow${!canScrollRight ? ' muted' : ''}`} onClick={() => scroll('right')} aria-label={t('common.scrollRight')} disabled={!canScrollRight}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mood-clip">
            <div className="mood-carousel" ref={scrollRef}>
                {items.map((cat, i) => (
                  <div key={`${cat.keyword}-${i}`} className="mood-card-wrap">
                    <button
                      className="mood-card"
                      style={{ backgroundImage: `url(${transformImage(cat.image, { width: 600, quality: 'auto:good', format: 'auto' }) ?? cat.image})` }}
                      onClick={() => {
                        trackMoodClick(cat.keyword, i)
                        navigate(`/tours?category=${encodeURIComponent(cat.keyword)}`)
                      }}
                    >
                      <span className="mood-tag">{cat.keyword}</span>
                      <span className="mood-count">{cat.tourCount} {t('mood.tours')}</span>
                      <div className="mood-gradient" />
                      <div className="mood-footer">
                        <h3 className="mood-card-title">{cat.keyword}</h3>
                        <div className="mood-arrow-btn">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
