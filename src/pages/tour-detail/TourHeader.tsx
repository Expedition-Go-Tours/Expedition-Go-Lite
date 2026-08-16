import { useTranslation } from 'react-i18next'
import { Star, MapPin } from 'lucide-react'
import './TourHeader.css'

interface TourHeaderProps {
  title: string
  rating: number
  reviewCount: number
  location?: string
  supplierName?: string
  onReviewsClick: () => void
}

function RosetteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180
        return (
          <circle
            key={angle}
            cx={12 + 7 * Math.cos(rad)}
            cy={12 + 7 * Math.sin(rad)}
            r={4}
          />
        )
      })}
      <circle cx="12" cy="12" r="5.5" fill="#fff" />
      <path d="M9.4 16.9 7.8 21.3l2.3-.9Z" />
      <path d="M14.6 16.9l1.6 4.4-2.3-.9Z" />
    </svg>
  )
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
        {supplierName && (
          <>
            <span className="tour-header-divider" aria-hidden />
            <span className="tour-header-supplier">
              <RosetteIcon className="tour-header-supplier-icon" />
              <span>
                <span className="tour-header-label">
                  {t('tourDetail.destinationHost')}:
                </span>{' '}
                {supplierName}
              </span>
            </span>
          </>
        )}
        <span className="tour-header-divider" aria-hidden />
        <span className="tour-header-location">
          <MapPin size={14} className="tour-header-location-icon" />
          <span>
            <span className="tour-header-label">{t('tourDetail.destination')}:</span>{' '}
            {location || t('tourDetail.defaultLocation')}
          </span>
        </span>
      </div>
    </header>
  )
}
