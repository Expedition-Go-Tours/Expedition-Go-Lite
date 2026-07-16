import { Star, MapPin, Clock } from 'lucide-react'
import './ReviewTourCard.css'

interface ReviewTourCardProps {
  images: string[]
  rating: string | number
  title: string
  supplierName: string
  supplierLogo?: string
  location: string
  duration: string
}

export default function ReviewTourCard({
  images,
  rating,
  title,
  supplierName,
  supplierLogo,
  location,
  duration,
}: ReviewTourCardProps) {
  const displayImage = images[0] || ''

  return (
    <div className="review-tour-card">
      <div className="review-tour-card-image">
        {displayImage && <img src={displayImage} alt={title} />}
      </div>
      <div className="review-tour-card-body">
        <div className="review-tour-card-rating">
          <Star className="review-tour-card-star" size={14} fill="currentColor" />
          <span>{Number(rating).toFixed(1)}</span>
        </div>
        <h3 className="review-tour-card-title">{title}</h3>
        <div className="review-tour-card-supplier">
          {supplierLogo && (
            <img src={supplierLogo} alt="" className="review-tour-card-supplier-logo" />
          )}
          <span>{supplierName}</span>
        </div>
        <div className="review-tour-card-meta">
          <span className="review-tour-card-meta-item">
            <MapPin size={14} />
            {location}
          </span>
          <span className="review-tour-card-meta-item">
            <Clock size={14} />
            {duration}
          </span>
        </div>
      </div>
    </div>
  )
}
