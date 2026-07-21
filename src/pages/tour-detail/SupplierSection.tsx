import { useRef, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, ChevronDown, ChevronRight, ChevronLeft, Phone, Mail, Globe, MapPin, Heart } from 'lucide-react'
import './SupplierSection.css'

interface SupplierTour {
  title: string
  slug?: string
  image: string
  duration: string
  price: number
  rating: string
  reviews: string | number
}

interface SupplierSectionProps {
  name: string
  logo?: string
  description?: string
  rating: number | null
  totalTours: number
  phone?: string
  email?: string
  website?: string
  address?: string
  tours: SupplierTour[]
  onOpenInfo: () => void
  infoOpen: boolean
  onToggleInfo: () => void
  onNavigateTour: (slug: string) => void
  onToggleWishlist?: (tour: SupplierTour) => void
  isInWishlist?: (title: string) => boolean
  formatPrice: (price: number) => { formatted: string }
}

const CARD_GAP = 16
const CARD_W_SM = 260
const CARD_W_MD = 280

export default function SupplierSection({
  name,
  logo,
  description,
  rating,
  totalTours,
  phone,
  email,
  website,
  address,
  tours,
  infoOpen,
  onToggleInfo,
  onNavigateTour,
  onToggleWishlist,
  isInWishlist,
  formatPrice,
}: SupplierSectionProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const displayRating = rating != null ? rating.toFixed(1) : null
  const websiteHref = website
    ? website.startsWith('http') ? website : `https://${website}`
    : null
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const eps = 4
    setShowLeftArrow(scrollLeft > eps)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - eps)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateArrows)
      : null
    ro?.observe(el)
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      ro?.disconnect()
      window.removeEventListener('resize', updateArrows)
    }
  }, [tours.length, updateArrows])

  const scrollBy = useCallback((dir: number) => {
    const el = scrollRef.current
    if (!el) return
    const card = window.innerWidth >= 640 ? CARD_W_MD : CARD_W_SM
    const step = card + CARD_GAP
    const maxScroll = el.scrollWidth - el.clientWidth
    const target = Math.max(0, Math.min(maxScroll, el.scrollLeft + dir * step * 3))
    el.scrollTo({ left: target, behavior: 'smooth' })
  }, [])

  return (
    <motion.div
      key="supplier"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <section className="supplier-section">
        <div className="supplier-header">
          <div className="supplier-header-left">
            <div className="supplier-logo">
              {logo ? (
                <img src={logo} alt="" className="supplier-logo-img" />
              ) : (
                <span className="supplier-logo-fallback">
                  {name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="supplier-name">{name}</h2>
              <div className="supplier-meta">
                {displayRating && (
                  <>
                    <Star size={14} className="supplier-star" />
                    <span className="supplier-rating">{displayRating}</span>
                    <span className="supplier-dot">&bull;</span>
                  </>
                )}
                <span>{totalTours} tours</span>
              </div>
            </div>
          </div>
        </div>

        {/* About & Contact */}
        <div className="supplier-about">
          <div className="supplier-about-header-row">
            <button
              type="button"
              onClick={onToggleInfo}
              className="supplier-about-trigger"
            >
              About this supplier
              <motion.span
                animate={{ rotate: infoOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="supplier-about-chevron"
              >
                <ChevronDown size={16} />
              </motion.span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/supplier/${encodeURIComponent(name)}`)}
              className="supplier-view-more"
            >
              View More
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
          <div
            className={`supplier-about-content ${infoOpen ? 'open' : ''}`}
          >
            <div className="supplier-about-body">
              {description && <p className="supplier-description">{description}</p>}
              <div className="supplier-contact">
                {phone && (
                  <div className="supplier-contact-item">
                    <Phone size={16} className="supplier-contact-icon" />
                    <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
                  </div>
                )}
                {email && (
                  <div className="supplier-contact-item">
                    <Mail size={16} className="supplier-contact-icon" />
                    <a href={`mailto:${email}`}>{email}</a>
                  </div>
                )}
                {websiteHref && (
                  <div className="supplier-contact-item">
                    <Globe size={16} className="supplier-contact-icon" />
                    <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                      {website}
                    </a>
                  </div>
                )}
                {address && (
                  <div className="supplier-contact-item">
                    <MapPin size={16} className="supplier-contact-icon" />
                    <span>{address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tours by this supplier */}
        {tours.length > 0 && (
          <div className="supplier-tours">
            <div className="supplier-tours-header">
              <h3 className="supplier-tours-title">Tours by this supplier</h3>
            </div>
            <div className="supplier-tours-scroll-wrapper">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                className="supplier-tours-scroll-arrow left"
                style={{ opacity: showLeftArrow ? 1 : 0, pointerEvents: showLeftArrow ? 'auto' : 'none' }}
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} />
              </button>
              <div ref={scrollRef} className="supplier-tours-scroll">
                {tours.map((tour) => {
                  const isFav = isInWishlist?.(tour.title) || false
                  return (
                    <article key={tour.title} className="supplier-tour-card">
                      <div className="supplier-tour-card-image">
                        <button
                          type="button"
                          className="supplier-tour-card-img-btn"
                          onClick={() => onNavigateTour(tour.slug || tour.title)}
                        >
                          <img src={tour.image} alt="" />
                        </button>
                        <span className="supplier-tour-card-duration">{tour.duration}</span>
                        {onToggleWishlist && (
                          <button
                            type="button"
                            onClick={() => onToggleWishlist(tour)}
                            className="supplier-tour-card-wishlist"
                            aria-label="Toggle wishlist"
                          >
                            <Heart
                              size={16}
                              className={isFav ? 'wishlist-filled' : ''}
                            />
                          </button>
                        )}
                      </div>
                      <div className="supplier-tour-card-body">
                        <button
                          type="button"
                          onClick={() => onNavigateTour(tour.slug || tour.title)}
                          className="supplier-tour-card-title-btn"
                        >
                          {tour.title}
                        </button>
                        <div className="supplier-tour-card-footer">
                          <div className="supplier-tour-card-rating">
                            <Star size={14} className="supplier-tour-card-star" />
                            <span>{tour.rating}</span>
                            <span className="supplier-tour-card-reviews">
                              ({tour.reviews})
                            </span>
                          </div>
                          <div className="supplier-tour-card-price">
                            <span className="supplier-tour-card-from">{t('common.from')}</span>
                            <span className="supplier-tour-card-amount">
                              {formatPrice(tour.price).formatted}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                className="supplier-tours-scroll-arrow right"
                style={{ opacity: showRightArrow ? 1 : 0, pointerEvents: showRightArrow ? 'auto' : 'none' }}
                aria-label="Scroll right"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </section>
    </motion.div>
  )
}
