import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import SectionHeading from './SectionHeading'
import { attractionsNearby, haversineDistanceKm, type Attraction } from './attractionsData'
import { useAllExpeditionTours } from '../hooks/useExpeditionTours'
import { useWishlist, toWishlistItem } from '../context/WishlistContext'
import type { Tour } from './data'
import './TopAttractionsNearbySection.css'

const CARD_WIDTH = 295
const GAP = 16

function AttractionCard({ attraction, hasTour }: { attraction: Attraction; hasTour: boolean }) {
  const { t } = useTranslation()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const wishlistItem = toWishlistItem({
    title: attraction.title,
    location: attraction.location,
    price: attraction.price,
    duration: '1 Day',
    image: attraction.image,
    rating: attraction.rating,
    reviews: attraction.reviews,
    source: 'expedition-go',
  } as Tour)
  const inWishlist = isInWishlist(wishlistItem.id)

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (inWishlist) {
      removeFromWishlist(wishlistItem.id)
    } else {
      addToWishlist(wishlistItem)
    }
  }

  const cardInner = (
    <>
      <img
        src={attraction.image}
        alt=""
        aria-hidden
        className="attraction-card-img"
        loading="lazy"
      />
      <div className="attraction-card-overlay" />
      <span className="attraction-card-badge">{t('sections.attractionsBadge')}</span>
      <div className="attraction-card-footer">
        <div className="attraction-card-location">
          <MapPin className="attraction-card-pin" size={13} />
          <span>{attraction.location}</span>
        </div>
        <div className="attraction-card-title-row">
          <h3 className="attraction-card-title">{attraction.title}</h3>
          <div className="attraction-card-price">
            <p className="attraction-card-from">{t('common.from')}</p>
            <p className="attraction-card-amount">{attraction.price}</p>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleHeartClick}
        aria-label={inWishlist ? t('common.removeFromWishlist') : t('common.addToWishlist')}
        className={`attraction-card-heart${inWishlist ? ' wishlist-active' : ''}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={inWishlist ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </>
  )

  if (!hasTour) {
    return <div className="attraction-card">{cardInner}</div>
  }

  return (
    <Link
      to={`/tour/${attraction.slug}`}
      className="attraction-card"
      aria-label={`${t('common.viewDetails', { defaultValue: 'View details' })}: ${attraction.title}`}
    >
      {cardInner}
    </Link>
  )
}

export default function TopAttractionsNearbySection() {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [sortedAttractions, setSortedAttractions] = useState<Attraction[]>(attractionsNearby)
  const [locationError, setLocationError] = useState<string | null>(() =>
    typeof navigator !== 'undefined' && navigator.geolocation ? null : 'Geolocation not supported',
  )
  const { data: allTours } = useAllExpeditionTours()

  const liveSlugs = useMemo(
    () => new Set((allTours ?? []).map((tour) => tour.slug).filter(Boolean)),
    [allTours],
  )

  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const withDistance = attractionsNearby
          .map((a) => ({
            ...a,
            distance: haversineDistanceKm(latitude, longitude, a.lat, a.lng),
          }))
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        setSortedAttractions(withDistance)
      },
      () => {
        setLocationError('Location access denied')
        setSortedAttractions(attractionsNearby)
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    )
  }, [])

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
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
    return () => el.removeEventListener('scroll', onScroll)
  }, [updateArrows])

  return (
    <section className="attractions-section">
      <div className="attractions-container">
        <div className="attractions-viewport">
          <SectionHeading
            title={t('sections.topAttractionsNearby')}
            subtitle={locationError ? t('sections.attractionsShowingAll') : undefined}
            viewAllLink="/tours?section=Top Attractions Nearby"
            onScrollLeft={() => scroll('left')}
            onScrollRight={() => scroll('right')}
            disableLeft={!canScrollLeft}
            disableRight={!canScrollRight}
          />
          <div className="attractions-clip">
            <div className="attractions-carousel" ref={scrollRef}>
              {sortedAttractions.map((attraction, i) => (
                <div key={`${attraction.slug}-${i}`} className="attractions-card-wrap">
                  <AttractionCard attraction={attraction} hasTour={liveSlugs.has(attraction.slug)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
