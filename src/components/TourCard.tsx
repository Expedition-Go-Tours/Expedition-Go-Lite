import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Car, Languages as LanguagesIcon, ShieldCheck, Ban, TrendingUp, BedDouble, Compass } from 'lucide-react'
import i18n from '../i18n/config'
import './TourCard.css'
import { parsePrice, getTourSlug, type Tour } from './data'
import { useWishlist, toWishlistItem } from '../context/WishlistContext'
import FormattedPrice from './FormattedPrice'
import { getCategoryMeta } from './categoryMeta'
import OptimizedImage from '@/components/shared/OptimizedImage'
import type { SpecialOfferData } from '../hooks/useExpeditionTours'
import { bestOfferDiscountAmount } from '../hooks/useExpeditionTours'

interface TourCardProps extends Tour {
  discount?: string
  slug?: string
  isNew?: boolean
  hideSourceBadge?: boolean
  hideFeatures?: boolean
  /** Numeric price (full/undiscounted) when the raw API value is available. */
  priceValue?: number | null
  /** Supplier-applied offers for this tour (used to derive the promo price). */
  specialOffers?: SpecialOfferData[]
  /** Plain Bootstrap-style card: clean image on top (no fade overlay, no
      floating pills/badges/heart), with the duration/category shown as a
      subtitle and the wishlist inline in the body. */
  imageClean?: boolean
}

export default function TourCard({ id, title, duration, features, price, rating, reviews, location, image, photos, discount, difficulty, cancellationPolicy, pickupIncluded, accommodationIncluded, meetingMode, category, languages, source, externalUrl, slug, isNew, hideSourceBadge, hideFeatures, imageClean, priceValue, specialOffers }: TourCardProps) {
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

  // Image carousel — all tour photos, falling back to the single cover image.
  // Single-photo cards render the plain image (no dots/arrows/swipe).
  const slides = useMemo(() => {
    const list = Array.isArray(photos) && photos.length > 0 ? photos : [image]
    return list.filter((src): src is string => typeof src === 'string' && src.length > 0)
  }, [photos, image])
  const isCarousel = slides.length > 1
  const [current, setCurrent] = useState(0)

  // Reset to the first slide whenever the photo set changes (a new tour can
  // replace the card, or photos arrive async) — render-phase adjustment, so no
  // effect is needed.
  const slidesKey = slides.join('|')
  const [prevSlidesKey, setPrevSlidesKey] = useState(slidesKey)
  if (prevSlidesKey !== slidesKey) {
    setPrevSlidesKey(slidesKey)
    setCurrent(0)
  }

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length)
  }, [slides.length])
  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length)
  }, [slides.length])

  // Mobile swipe on the image area. Vertical scrolling is preserved by
  // `touch-action: pan-y` on the image container — the browser keeps panning
  // the page; we only read start/end positions and never preventDefault.
  const touchStartX = useRef<number | null>(null)
  const swipeJustHappened = useRef(false)
  const onImageTouchStart = (e: React.TouchEvent): void => {
    if (!isCarousel) return
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onImageTouchEnd = (e: React.TouchEvent): void => {
    if (!isCarousel) return
    const start = touchStartX.current
    touchStartX.current = null
    if (start == null) return
    const end = e.changedTouches[0]?.clientX ?? start
    const dx = end - start
    if (Math.abs(dx) > 40) {
      // The browser fires a click after a touch — suppress the resulting
      // card navigation so a photo swipe doesn't open the tour.
      swipeJustHappened.current = true
      if (dx > 0) goPrev()
      else goNext()
    }
  }

  const handleCardClick = () => {
    // A horizontal swipe on the image ends with a click — don't navigate.
    if (swipeJustHappened.current) {
      swipeJustHappened.current = false
      return
    }
    window.open(`/tour/${tourSlug}`, '_blank', 'noopener')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }

  // The card's `price` is the ORIGINAL (full) price; when a supplier offer
  // (specialOffers) or a percentage discount label ("-30%") applies, derive
  // the promo price down from it so the card can show `~~$240~~` + `$96`.
  const originalPrice = priceValue ?? parsePrice(price)
  const promoPrice = useMemo(() => {
    if (!Number.isFinite(originalPrice) || originalPrice <= 0) return null
    const pct = discount?.match(/-?\s*(\d+(?:\.\d+)?)\s*%/)
    if (pct) {
      const promo = originalPrice * (1 - parseFloat(pct[1]) / 100)
      return promo > 0 && promo < originalPrice ? promo : null
    }
    if (Array.isArray(specialOffers) && specialOffers.length > 0) {
      const best = bestOfferDiscountAmount(specialOffers, originalPrice)
      const promo = originalPrice - best
      return best > 0 && promo > 0 && promo < originalPrice ? promo : null
    }
    return null
  }, [originalPrice, discount, specialOffers])

  return (
    <div className={`tour-card${imageClean ? ' tour-card-clean' : ''}`} onClick={handleCardClick} onKeyDown={handleKeyDown} role="link" tabIndex={0}>
      <div className={`tour-card-image${isCarousel ? ' tour-card-has-carousel' : ''}`}>
        {!imageClean && isNew && <span className="tour-card-new-pill">New</span>}
        {!imageClean && !hideSourceBadge && source === 'travio-africa' && (
          <div className="source-badge">
            <img src="/travio_logo.png" alt="Travio Africa" />
          </div>
        )}
        <div
          className="tour-card-slides"
          style={{ transform: `translateX(-${current * 100}%)` }}
          onTouchStart={onImageTouchStart}
          onTouchEnd={onImageTouchEnd}
        >
          {slides.map((src, i) => (
            <div key={`${src}-${i}`} className={`tour-card-slide${i === current ? ' tour-card-slide-active' : ''}`}>
              <OptimizedImage src={src} alt={title} width={600} />
            </div>
          ))}
        </div>
        {!imageClean && <div className="tour-card-image-fade" />}
        {duration && <span className="tour-card-duration">{duration}</span>}
        {categoryMeta && (
          <span className={`tour-card-image-type-badge tour-card-badge-type-${categoryMeta.variant}`}>
            <categoryMeta.Icon size={12} strokeWidth={2.4} />
            {categoryMeta.label}
          </span>
        )}
        {isCarousel && (
          <>
            <button
              type="button"
              className="tour-card-arrow tour-card-arrow-prev"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation()
                goPrev()
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="tour-card-arrow tour-card-arrow-next"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation()
                goNext()
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div className="tour-card-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`tour-card-dot${i === current ? ' tour-card-dot-active' : ''}`}
                  aria-label={`Go to photo ${i + 1}`}
                  aria-current={i === current}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrent(i)
                  }}
                />
              ))}
            </div>
          </>
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
          {discount && <span className="tour-card-discount">{discount}</span>}
        </div>
        <h3 className="tour-card-title">{title}</h3>
        <div className="tour-card-meta">
          {meetingMode === 'meeting_point' ? (
            <span className="tour-card-badge tour-card-badge-meeting">
              <Compass size={12} strokeWidth={2.2} />
              Meeting point
            </span>
          ) : pickupIncluded && (
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
        {!hideFeatures && <div className="tour-card-features">{features}</div>}
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
              {promoPrice != null ? (
                <>
                  <span className="tour-card-price-strike">
                    <FormattedPrice usdPrice={originalPrice} />
                  </span>
                  <span className="tour-card-price-promo">
                    <FormattedPrice usdPrice={promoPrice} />
                  </span>
                </>
              ) : (
                <span className="tour-card-price-value">
                  <FormattedPrice usdPrice={originalPrice} />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
