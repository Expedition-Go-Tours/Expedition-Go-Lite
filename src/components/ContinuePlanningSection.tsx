import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Star, Heart, Car, Compass, Languages as LanguagesIcon, ShieldCheck, Ban, TrendingUp } from 'lucide-react'
import SectionHeading from './SectionHeading'
import FormattedPrice from './FormattedPrice'
import TourCard from './TourCard'
import { useContinuePlanning, type ContinuePlanningItem } from '../context/ContinuePlanningContext'
import { useWishlist, toWishlistItem } from '../context/WishlistContext'
import { useSellOutContext } from '../context/SellOutContext'
import { getCategoryMeta } from './categoryMeta'
import i18n from '../i18n/config'
import './ContinuePlanningSection.css'
import OptimizedImage from '@/components/shared/OptimizedImage'

const CARD_WIDTH = 560
const GAP = 24

function shortCancellation(policy?: string): string {
  if (!policy) return ''
  const lower = policy.toLowerCase()
  if (/non[ -]?refundable/.test(lower)) return 'Non-refundable'
  if (lower.includes('free')) return 'Free cancellation'
  return policy.split(' up to')[0].trim()
}

// Maps a Continue Planning item onto the TourCard props used by the
// homepage's Recommended carousel, so the mobile cards render identically.
function toTourCardProps(item: ContinuePlanningItem, likelyToSellOut: boolean) {
  return {
    id: item.id,
    title: item.title,
    location: item.location,
    price: item.price > 0 ? `$${item.price}` : '',
    duration: item.duration,
    features: item.features,
    image: item.imageUrl,
    photos: item.photos,
    rating: String(item.rating),
    reviews: item.reviewCount,
    category: item.category ?? '',
    languages: item.languages,
    difficulty: item.difficulty,
    cancellationPolicy: item.cancellationPolicy,
    pickupIncluded: item.pickupIncluded,
    meetingMode: item.meetingMode,
    source: item.source,
    externalUrl: item.externalUrl,
    slug: item.slug,
    discount: item.discount,
    specialOffers: item.specialOffers,
    likelyToSellOut,
  }
}

function ContinuePlanningCard({ item, likelyToSellOut }: { item: ContinuePlanningItem; likelyToSellOut?: boolean }) {
  const { t } = useTranslation()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const inWishlist = isInWishlist(item.id)

  const openTour = () => {
    const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    window.open(`/tour/${slug}`, '_blank', 'noopener')
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const wishItem = toWishlistItem({
      id: item.id,
      title: item.title,
      location: item.location,
      category: item.category ?? '',
      price: item.price > 0 ? `$${item.price}` : '',
      duration: item.duration,
      features: item.features,
      image: item.imageUrl,
      rating: String(item.rating),
      reviews: item.reviewCount,
      source: item.source,
      externalUrl: item.externalUrl,
    })
    if (inWishlist) {
      removeFromWishlist(item.id)
    } else {
      addToWishlist(wishItem)
      toast.success(i18n.t('common.addedToWishlist'))
    }
  }

  // Only the first language is shown (mirrors the Step 1 "content language"
  // convention used on TourCard/AllToursPage) — "Guide" is attached so it's
  // unambiguous this is the language the tour guide conducts the experience
  // in, not a language of the page/materials.
  const languageLabel = item.languages?.length ? `${item.languages[0]} Guide` : ''
  const cancellationLabel = shortCancellation(item.cancellationPolicy)
  const isNonRefundable = /non[- ]?refundable/i.test(cancellationLabel)
  const categoryMeta = getCategoryMeta(item.category)

  // GYG-style feature list: small icon + plain text per fact, no pill/chip
  // backgrounds — just an icon-led row so features stay scannable without
  // turning the card into a wall of colored badges.
  const featureFacts: { Icon: typeof Car; label: string; negative?: boolean }[] = [
    ...(item.meetingMode === 'meeting_point'
      ? [{ Icon: Compass as typeof Car, label: t('tourDetail.meetingPoint') }]
      : item.pickupIncluded
        ? [{ Icon: Car, label: t('sections.pickupTitle') }]
        : []),
    ...(languageLabel ? [{ Icon: LanguagesIcon, label: languageLabel }] : []),
    ...(cancellationLabel
      ? [{ Icon: isNonRefundable ? Ban : ShieldCheck, label: cancellationLabel, negative: isNonRefundable }]
      : []),
  ]

  return (
    <div
      className="cp-card"
      onClick={openTour}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openTour()
        }
      }}
    >
      <div className="cp-card-media">
        {item.source === 'travio-africa' && (
          <div className="cp-card-source-badge">
            <img src="/travio_logo.png" alt="Travio Africa" />
          </div>
        )}
        <OptimizedImage src={item.imageUrl} alt={item.title} width={400} />
        {categoryMeta && (
          <span className={`cp-card-type-badge cp-card-type-badge-${categoryMeta.variant}`}>
            <categoryMeta.Icon size={11} strokeWidth={2.4} />
            {categoryMeta.label}
          </span>
        )}
        <button
          type="button"
          className={`cp-card-wishlist${inWishlist ? ' wishlist-active' : ''}`}
          onClick={handleWishlist}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={14} fill={inWishlist ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      </div>

      <div className="cp-card-content">
        <h3 className="cp-card-title">{item.title}</h3>

        {item.duration && <p className="cp-card-duration">{item.duration}</p>}

        {likelyToSellOut && (
          <span className="cp-card-sellout-tag">
            <TrendingUp size={11} strokeWidth={2.4} />
            {t('card.likelyToSellOut')}
          </span>
        )}

        {featureFacts.length > 0 && (
          <ul className="cp-card-facts">
            {featureFacts.map(({ Icon, label, negative }, i) => (
              <li key={i} className={negative ? 'cp-card-fact-negative' : undefined}>
                <Icon size={12} strokeWidth={2.2} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="cp-card-rating">
          <Star size={17} className="cp-card-star" fill="currentColor" stroke="currentColor" strokeWidth={1} />
          <span className="cp-card-rating-value">{item.rating}</span>
          {item.reviewCount > 0 && <span className="cp-card-rating-count">({item.reviewCount})</span>}
        </div>
      </div>

      <div className="cp-card-price-col">
        <span className="cp-card-from">{t('common.from')}</span>
        <span className="cp-card-price">
          <FormattedPrice usdPrice={item.price} />
        </span>
      </div>
    </div>
  )
}

export default function ContinuePlanningSection() {
  const { t } = useTranslation()
  const { continuePlanning } = useContinuePlanning()
  const { isLikelyToSellOut } = useSellOutContext()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [hasOverflow, setHasOverflow] = useState(false)
  // On mobile the section reuses the Recommended carousel's vertical TourCard
  // so the two sections look identical; desktop keeps the horizontal card.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 767px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setHasOverflow(maxScroll > 1)
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < maxScroll - 2)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardStep = CARD_WIDTH + GAP
    const currentIndex = Math.round(el.scrollLeft / cardStep)
    const maxIndex = Math.ceil(el.scrollWidth / cardStep) - 1
    const targetIndex = direction === 'left'
      ? Math.max(0, currentIndex - 3)
      : Math.min(currentIndex + 3, maxIndex)
    el.scrollTo({ left: targetIndex * cardStep, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    const onScroll = () => updateArrows()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows, continuePlanning.length])

  if (continuePlanning.length === 0) return null

  return (
    <section className={`continue-planning-section${hasOverflow ? ' has-overflow' : ''}`}>
      <div className="continue-planning-container">
        <div className="continue-planning-viewport">
          <SectionHeading
            title={t('sections.continuePlanning')}
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="continue-planning-clip">
            <div className="continue-planning-carousel" ref={scrollRef}>
              {continuePlanning.map((item) => (
                <div key={item.id} className="continue-planning-card-wrap">
                  {isMobile ? (
                    <TourCard {...toTourCardProps(item, isLikelyToSellOut({ id: item.id, title: item.title }))} imageClean hideFeatures hideOfferBadge />
                  ) : (
                    <ContinuePlanningCard item={item} likelyToSellOut={isLikelyToSellOut({ id: item.id, title: item.title })} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
