import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/config'
import './TourCard.css'
import { parsePrice, getTourSlug, type Tour } from './data'
import { useWishlist, toWishlistItem } from '../context/WishlistContext'
import FormattedPrice from './FormattedPrice'

interface TourCardProps extends Tour {
  discount?: string
}

export default function TourCard({ title, duration, features, price, rating, reviews, location, image, discount, source, externalUrl }: TourCardProps) {
  const { t } = useTranslation()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const item = toWishlistItem({ title, duration, features, price, rating: String(rating), reviews, location, image, source } as Tour)
  const inWishlist = isInWishlist(item.id)

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (inWishlist) {
      removeFromWishlist(item.id)
    } else {
      addToWishlist(item)
      toast.success(i18n.t('common.addedToWishlist'))
    }
  }

  const isExternal = !!externalUrl
  const tourSlug = getTourSlug(title)

  const handleCardClick = () => {
    if (isExternal) {
      window.open(externalUrl, '_blank', 'noopener')
    } else {
      window.open(`/tour/${tourSlug}`, '_blank', 'noopener')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }

  return (
    <div className="tour-card" onClick={handleCardClick} onKeyDown={handleKeyDown} role="link" tabIndex={0}>
      <div className="tour-card-image">
        {source === 'travio-africa' && (
          <div className="source-badge">
            <img src="/travio_logo.png" alt="Travio Africa" />
          </div>
        )}
        <img src={image} alt={title} loading="lazy" />
        <div className="tour-card-image-fade" />
        <span className="tour-card-duration">{duration}</span>
        {discount && <span className="tour-card-discount">{discount}</span>}
        <button className="tour-card-wishlist" onClick={handleWishlist} aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={inWishlist ? '#179237' : 'none'} stroke={inWishlist ? '#179237' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
      <div className="tour-card-body">
        <div className="tour-card-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {location}
        </div>
        <h3 className="tour-card-title">{title}</h3>
        <div className="tour-card-features">{features}</div>
        <div className="tour-card-bottom">
          <div className="tour-card-rating">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#39AD6C" stroke="#39AD6C" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="tour-card-rating-value">{rating}</span>
            <span className="tour-card-rating-reviews">({reviews})</span>
          </div>
          <div className="tour-card-price">
            <span className="tour-card-from">{t('common.from')} </span>
            <span className="tour-card-price-value">
              <FormattedPrice usdPrice={parsePrice(price)} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
