import { Star, MapPin, Check } from 'lucide-react'
import './TourHeader.css'

interface TourHeaderProps {
  title: string
  rating: number
  reviewCount: number
  onReviewsClick: () => void
}

export default function TourHeader({
  title,
  rating,
  reviewCount,
  onReviewsClick,
}: TourHeaderProps) {
  return (
    <header className="tour-header-new">
      <h1 className="tour-header-title">{title}</h1>

      <div className="tour-header-meta">
        <span className="tour-header-rating" aria-label={`${rating} out of 5 rating`}>
          <Star className="tour-header-star" size={16} />
          <span>{rating}</span>
        </span>
        <button
          type="button"
          onClick={onReviewsClick}
          className="tour-header-reviews-btn"
        >
          {reviewCount} Reviews
        </button>
        <span className="tour-header-divider" aria-hidden />
        <span className="tour-header-badge">
          <span className="tour-header-badge-icon">
            <Check size={12} strokeWidth={3} />
          </span>
          96% travel
        </span>
        <span className="tour-header-divider" aria-hidden />
        <span className="tour-header-location">
          <MapPin size={14} />
          <span>Accra, Ghana</span>
        </span>
      </div>
    </header>
  )
}
