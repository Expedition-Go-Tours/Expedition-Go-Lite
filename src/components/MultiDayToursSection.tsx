import { useRef, useState, useEffect, useCallback } from 'react'
import SectionHeading from './SectionHeading'
import MultiDayCard from './MultiDayCard'
import { multiDayTours } from './data'
import './MultiDayToursSection.css'

const CARD_WIDTH = 295
const GAP = 16
const PAGE_WIDTH = (CARD_WIDTH + GAP) * 3

export default function MultiDayToursSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const items = multiDayTours

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
    <section className="multiday-section">
      <div className="multiday-container">
        <div className="multiday-viewport">
          <SectionHeading
            title="Multi-Day Tours"
            viewAllLink="/tours"
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="multiday-clip">
            <div className="multiday-carousel" ref={scrollRef}>
            {items.map((tour, i) => (
              <div key={`${tour.title}-${i}`} className="multiday-card-wrap">
                <MultiDayCard {...tour} />
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
