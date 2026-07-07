import { useRef, useState, useEffect, useCallback } from 'react'
import SectionHeading from './SectionHeading'
import PopularLocationCard from './PopularLocationCard'
import { destinations } from './data'
import './PopularLocations.css'

const CARD_WIDTH = 295
const GAP = 16
const PAGE_WIDTH = (CARD_WIDTH + GAP) * 3

export default function PopularLocations() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const items = destinations

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
    <section className="popular-locations-section">
      <div className="popular-locations-container">
        <div className="location-viewport">
          <SectionHeading
            title="Popular Locations"
            viewAllLink="/tours?category=destinations"
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="location-clip">
            <div className="popular-locations-carousel" ref={scrollRef}>
            {items.map((dest, i) => (
              <div key={`${dest.title}-${i}`} className="location-card-wrap">
                <PopularLocationCard {...dest} />
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
