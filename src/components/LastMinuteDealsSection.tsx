import { useRef, useState, useEffect, useCallback } from 'react'
import SectionHeading from './SectionHeading'
import TourCard from './TourCard'
import { lastMinuteDeals } from './data'
import './LastMinuteDealsSection.css'

const CARD_WIDTH = 295
const GAP = 16
const PAGE_WIDTH = (CARD_WIDTH + GAP) * 3

export default function LastMinuteDealsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const items = lastMinuteDeals

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
    <section className="lastminute-section">
      <div className="lastminute-container">
        <div className="lastminute-viewport">
          <SectionHeading
            title="Last Minute Deals"
            viewAllLink="/tours?section=Last Minute Deals"
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="lastminute-clip">
            <div className="lastminute-carousel" ref={scrollRef}>
            {items.map((tour, i) => (
              <div key={`${tour.title}-${i}`} className="lastminute-card-wrap">
                <TourCard {...tour} discount={tour.discount} />
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
