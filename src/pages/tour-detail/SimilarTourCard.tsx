import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useWishlist, toWishlistItem } from '../../context/WishlistContext'
import { parsePrice, type Tour } from '../../components/data'
import { getTourImage } from '../../lib/tourImages'
import FormattedPrice from '../../components/FormattedPrice'
import './SimilarTourCard.css'

function hashStr(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

interface SimilarTourCardProps extends Tour {
  discount?: string
}

export default function SimilarTourCard({ 
  title, 
  duration, 
  features, 
  price, 
  rating, 
  reviews, 
  location, 
  image 
}: SimilarTourCardProps) {
  const { t } = useTranslation()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const fallback = getTourImage(location, (hashStr(title) % 6) + 1)
  const [src, setSrc] = useState(image)
  const item = toWishlistItem({ title, duration, features, price, rating: String(rating), reviews, location, image } as Tour)
  const inWishlist = isInWishlist(item.id)

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (inWishlist) {
      removeFromWishlist(item.id)
    } else {
      addToWishlist(item)
      toast.success('Added to wishlist')
    }
  }

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const tourSlug = generateSlug(title)

  return (
    <Link to={`/tour/${tourSlug}`} className="similar-tour-card">
      <div className="similar-tour-image">
        <img src={src} alt={title} loading="lazy" onError={() => setSrc(fallback)} />
        <div className="similar-tour-overlay" />
        <button 
          className="similar-tour-wishlist" 
          onClick={handleWishlist}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart 
            size={18} 
            fill={inWishlist ? '#fff' : 'none'} 
            stroke="#fff"
            strokeWidth={2}
          />
        </button>
        <span className="similar-tour-duration">{duration}</span>
      </div>

      <div className="similar-tour-content">
        <div className="similar-tour-location">
          <MapPin size={12} strokeWidth={2.5} />
          <span>{location}</span>
        </div>

        <h3 className="similar-tour-title">{title}</h3>

        <p className="similar-tour-features">{features}</p>

        <div className="similar-tour-footer">
          <div className="similar-tour-rating">
            <Star size={14} fill="#179237" stroke="#179237" strokeWidth={1} />
            <span className="similar-tour-rating-value">{rating}</span>
            <span className="similar-tour-rating-count">({reviews})</span>
          </div>

          <div className="similar-tour-price">
            <span className="similar-tour-price-label">{t('common.from')}</span>
            <span className="similar-tour-price-value">
              <FormattedPrice usdPrice={parsePrice(price)} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
