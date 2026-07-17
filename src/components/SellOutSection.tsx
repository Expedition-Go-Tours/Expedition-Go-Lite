import { useRef, useState, useEffect, useCallback } from 'react'
import SectionHeading from './SectionHeading'
import TourCard from './TourCard'
import { sellOutTours } from './data'
import './SellOutSection.css'

const CARD_WIDTH = 295
const GAP = 16
const PAGE_WIDTH = (CARD_WIDTH + GAP) * 3

export default function SellOutSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const items = sellOutTours

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
    <section className="sellout-section">
      <div className="sellout-container">
        <div className="sellout-viewport">
          <SectionHeading
            title="Likely to Sell Out"
            viewAllLink="/tours?section=Sell Out"
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="sellout-clip">
            <div className="sellout-carousel" ref={scrollRef}>
            {items.map((tour, i) => (
              <div key={`${tour.title}-${i}`} className="sellout-card-wrap">
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
