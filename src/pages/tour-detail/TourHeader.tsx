import { useTranslation } from 'react-i18next'
import { Star, MapPin, Check } from 'lucide-react'
import './TourHeader.css'

interface TourHeaderProps {
  title: string
  rating: number
  reviewCount: number
  location?: string
  supplierName?: string
  onReviewsClick: () => void
}

export default function TourHeader({
  title,
  rating,
  reviewCount,
  location,
  supplierName,
  onReviewsClick,
}: TourHeaderProps) {
  const { t } = useTranslation()
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
          {reviewCount} {t('sections.reviews')}
        </button>
        <span className="tour-header-divider" aria-hidden />
        <span className="tour-header-badge">
          <span className="tour-header-badge-icon">
            <Check size={12} strokeWidth={3} />
          </span>
          {t('tourDetail.travelerSatisfaction')}
        </span>
        <span className="tour-header-divider" aria-hidden />
        <span className="tour-header-location">
          <MapPin size={14} />
          <span>{location || t('tourDetail.defaultLocation')}</span>
        </span>
        {supplierName && (
          <>
            <span className="tour-header-divider" aria-hidden />
            <span className="tour-header-supplier">{supplierName}</span>
          </>
        )}
      </div>
    </header>
  )
}
