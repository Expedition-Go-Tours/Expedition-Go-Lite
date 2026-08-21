import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import SectionHeading from './SectionHeading'
import TourCard from './TourCard'
import { recommendedTours } from './data'
import { useRecommendedTours, useExpeditionOffers, type TourCardData } from '../hooks/useExpeditionTours'
import './RecommendSection.css'

const CARD_WIDTH = 295
const GAP = 16

export default function RecommendSection() {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const { data: liveTours } = useRecommendedTours(12)
  // Discounted (offer) tours are folded into this carousel too. The shared
  // query key means the offer fetch (N+1 over the tiny catalog) runs once
  // across both the Recommended and Special Offers sections.
  const { data: offerTours } = useExpeditionOffers(12)

  // Fall back to the static mock list while loading or if the live data is
  // empty/unavailable — once live data arrives (including newly created
  // tours that haven't been manually curated yet) it takes over. Offer tours
  // replace their plain (curated) card when present so the promo price shows,
  // and are appended at the end when they aren't already in the list.
  const items = useMemo(() => {
    const base = liveTours && liveTours.length > 0 ? liveTours : recommendedTours
    if (!offerTours || offerTours.length === 0) return base
    const keyOf = (t: { slug?: string; title: string }) => t.slug || t.title
    const offerByKey = new Map<string, TourCardData>()
    for (const tour of offerTours) offerByKey.set(keyOf(tour), tour)

    const seen = new Set<string>()
    const merged: Array<typeof base[number]> = []
    for (const tour of base) {
      const key = keyOf(tour)
      seen.add(key)
      const offer = offerByKey.get(key)
      merged.push(offer ?? tour)
    }
    for (const tour of offerTours) {
      const key = keyOf(tour)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(tour)
    }
    return merged
  }, [liveTours, offerTours])

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
    <section className="recommend-section">
      <div className="recommend-container">
        <div className="carousel-viewport">
          <SectionHeading
            title={t('sections.recommendedTitle')}
            viewAllLink="/tours?section=Recommended"
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="carousel-clip">
            <div className="recommend-carousel" ref={scrollRef}>
              {items.map((tour, i) => (
                <div key={`${tour.title}-${i}`} className="carousel-card-wrap">
                  <TourCard {...tour} imageClean hideFeatures />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
