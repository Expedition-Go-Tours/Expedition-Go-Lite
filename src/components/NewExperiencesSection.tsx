import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import SectionHeading from './SectionHeading'
import TourCard from './TourCard'
import { useNewestTours } from '../hooks/useExpeditionTours'
import './NewExperiencesSection.css'

const CARD_WIDTH = 295
const GAP = 16

export default function NewExperiencesSection() {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const { data: liveTours } = useNewestTours(10)

  const items = liveTours ?? []

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
    <section className="newexp-section">
      <div className="newexp-container">
        <div className="newexp-viewport">
          <SectionHeading
            title={t('sections.newExperiences')}
            viewAllLink="/tours?section=New Experiences"
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="newexp-clip">
            <div className="newexp-carousel" ref={scrollRef}>
              {items.map((tour, i) => (
                <div key={`${tour.id ?? tour.title}-${i}`} className="newexp-card-wrap">
                  <TourCard {...tour} isNew hideSourceBadge />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
