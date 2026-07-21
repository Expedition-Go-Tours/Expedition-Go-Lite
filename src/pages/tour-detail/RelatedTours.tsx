import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SimilarTourCard from './SimilarTourCard'
import type { Tour } from '../../components/data'
import './RelatedTours.css'

interface RelatedToursProps {
  tours: Tour[]
}

export default function RelatedTours({ tours }: RelatedToursProps) {
  const { t } = useTranslation()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350
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
        <h2 className="related-tours-title">{t('tourDetail.similarExperiences')}</h2>
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
            <SimilarTourCard {...tour} />
          </div>
        ))}
      </div>
    </section>
  )
}
