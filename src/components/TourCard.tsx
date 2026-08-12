import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Car, Languages as LanguagesIcon, ShieldCheck, Ban, TrendingUp, BedDouble } from 'lucide-react'
import i18n from '../i18n/config'
import './TourCard.css'
import { parsePrice, getTourSlug, type Tour } from './data'
import { useWishlist, toWishlistItem } from '../context/WishlistContext'
import FormattedPrice from './FormattedPrice'
import { getCategoryMeta } from './categoryMeta'
import OptimizedImage from '@/components/shared/OptimizedImage'

interface TourCardProps extends Tour {
  discount?: string
  slug?: string
}

export default function TourCard({ id, title, duration, features, price, rating, reviews, location, image, discount, difficulty, cancellationPolicy, pickupIncluded, accommodationIncluded, category, languages, source, externalUrl, slug }: TourCardProps) {
  const { t } = useTranslation()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const item = toWishlistItem({ id, title, duration, features, price, rating: String(rating), reviews, location, image, source, externalUrl } as Tour)
  const inWishlist = isInWishlist(item.id)

  // "tour" / "activity" / "transport" is the supplier's Step 2 product type
  // choice — give each its own icon + accent so the badge reads at a glance,
  // the way GetYourGuide/Viator distinguish product types on their cards.
  // Legacy mock data (e.g. "Accra · Day trip") doesn't match a known type,
  // so it falls back to a plain neutral label with a generic tag icon.
  const categoryMeta = getCategoryMeta(category)
  // "Guide" is appended so the badge unambiguously reads as the language the
  // tour guide conducts the experience in (e.g. "English Guide"), not the
  // language of e.g. printed materials or the page itself.
  const languageLabel = languages?.length ? `${languages.join(', ')} Guide` : ''
  const isNonRefundable = !!cancellationPolicy && /non[- ]?refundable/i.test(cancellationPolicy)
  const cancellationLabel = cancellationPolicy
    ? (isNonRefundable ? 'Non-refundable' : (cancellationPolicy.toLowerCase().includes('free') ? 'Free cancellation' : cancellationPolicy))
    : ''
  // The Accommodation badge only applies to overnight trips — gate it on a
  // duration of more than one day ("2 days", "3 days", ...). Hour-based
  // durations fall back to >24h so a 48-hour trip still counts.
  const isMultiDay = (() => {
    if (!duration) return false
    const days = duration.match(/(\d+(?:\.\d+)?)\s*days?/i)
    if (days) return parseFloat(days[1]) > 1
    const hours = duration.match(/(\d+(?:\.\d+)?)\s*hours?/i)
    if (hours) return parseFloat(hours[1]) > 24
    return false
  })()

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

  const tourSlug = slug || getTourSlug(title)

  const handleCardClick = () => {
    window.open(`/tour/${tourSlug}`, '_blank', 'noopener')
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
        <OptimizedImage src={image} alt={title} width={600} />
        <div className="tour-card-image-fade" />
        {discount && <span className="tour-card-discount">{discount}</span>}
        {categoryMeta && (
          <span className={`tour-card-image-type-badge tour-card-badge-type-${categoryMeta.variant}`}>
            <categoryMeta.Icon size={12} strokeWidth={2.4} />
            {categoryMeta.label}
          </span>
        )}
        <button className={`tour-card-wishlist${inWishlist ? ' wishlist-active' : ''}`} onClick={handleWishlist} aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
      <div className="tour-card-body">
        <div className="tour-card-location-row">
          <span className="tour-card-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location}
          </span>
          {duration && <span className="tour-card-duration-badge">{duration}</span>}
        </div>
        <h3 className="tour-card-title">{title}</h3>
        <div className="tour-card-meta">
          {pickupIncluded && (
            <span className="tour-card-badge tour-card-badge-pickup">
              <Car size={12} strokeWidth={2.2} />
              Pickup included
            </span>
          )}
          {accommodationIncluded && isMultiDay && (
            <span className="tour-card-badge tour-card-badge-accommodation">
              <BedDouble size={12} strokeWidth={2.2} />
              Accommodation included
            </span>
          )}
          {languageLabel && (
            <span className="tour-card-badge tour-card-badge-language">
              <LanguagesIcon size={12} strokeWidth={2.2} />
              {languageLabel}
            </span>
          )}
          {cancellationLabel && (
            <span className={`tour-card-badge tour-card-badge-cancellation${isNonRefundable ? ' tour-card-badge-cancellation-negative' : ''}`}>
              {isNonRefundable ? <Ban size={12} strokeWidth={2.2} /> : <ShieldCheck size={12} strokeWidth={2.2} />}
              {cancellationLabel}
            </span>
          )}
          {difficulty && (
            <span className="tour-card-badge tour-card-badge-difficulty">
              <TrendingUp size={12} strokeWidth={2.2} />
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
          )}
        </div>
        <div className="tour-card-features">{features}</div>
        <div className="tour-card-bottom">
          <div className="tour-card-rating">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#39AD6C" stroke="#39AD6C" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="tour-card-rating-value">{rating}</span>
            <span className="tour-card-rating-reviews">({reviews})</span>
          </div>
          {price && (
            <div className="tour-card-price">
              <span className="tour-card-from">{t('common.from')} </span>
              <span className="tour-card-price-value">
                <FormattedPrice usdPrice={parsePrice(price)} />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
