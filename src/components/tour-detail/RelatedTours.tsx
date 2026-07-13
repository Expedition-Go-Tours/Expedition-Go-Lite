import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TourCard from '../TourCard'
import type { Tour } from '../data'
import './RelatedTours.css'

interface RelatedToursProps {
  tours: Tour[]
}

export default function RelatedTours({ tours }: RelatedToursProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350 // Approximate card width + gap
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount)

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      })
    }
  }

  if (tours.length === 0) return null

  return (
    <section className="related-tours">
      <div className="related-tours-header">
        <h2 className="related-tours-title">Explore Other Options</h2>
        <div className="related-tours-nav">
          <button
            className="related-tours-nav-btn"
            onClick={() => scroll('left')}
            aria-label="Previous tours"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="related-tours-nav-btn"
            onClick={() => scroll('right')}
            aria-label="Next tours"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="related-tours-container" ref={scrollContainerRef}>
        {tours.map((tour) => (
          <div key={tour.title} className="related-tour-card-wrapper">
            <TourCard {...tour} />
          </div>
        ))}
      </div>
    </section>
  )
}
