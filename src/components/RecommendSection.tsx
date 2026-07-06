import { useRef } from 'react'
import SectionHeading from './SectionHeading'
import TourCard from './TourCard'
import { recommendedTours } from './data'
import './RecommendSection.css'

export default function RecommendSection() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 880
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const items = [...recommendedTours, ...recommendedTours, ...recommendedTours]

  return (
    <section className="recommend-section">
      <div className="recommend-container">
        <SectionHeading
          title="Recommended for you"
          subtitle="Handpicked experiences you'll love"
          viewAllLink="/tours"
          onScrollLeft={() => scroll('left')}
          onScrollRight={() => scroll('right')}
        />
        <div className="recommend-carousel" ref={scrollRef}>
          {items.map((tour, i) => (
            <TourCard key={`${tour.title}-${i}`} {...tour} />
          ))}
        </div>
      </div>
    </section>
  )
}
