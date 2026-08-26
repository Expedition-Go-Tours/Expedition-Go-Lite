import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import SectionHeading from './SectionHeading'
import { haversineDistanceKm, type Attraction } from './attractionsData'
import { useAttractions, type HomepageAttraction } from '../hooks/useHomepageSections'
import { transformImage } from '../lib/image'
import './TopAttractionsNearbySection.css'

const CARD_WIDTH = 295
const GAP = 16

function AttractionCard({
  attraction,
  onClick,
}: {
  attraction: Attraction
  onClick: () => void
}) {
  const { t } = useTranslation()
  const priceStr = attraction.startingPrice != null ? `$${attraction.startingPrice}` : ''

  return (
    <button type="button" className="attraction-card" onClick={onClick}>
      {attraction.heroImage && (
        <img
          src={transformImage(attraction.heroImage, { width: 590, height: 672, quality: 'auto:best', format: 'auto', fit: 'fill' }) ?? attraction.heroImage}
          alt={attraction.name}
          className="attraction-card-img"
          loading="lazy"
          decoding="async"
          width={295}
          height={336}
        />
      )}
      <div className="attraction-card-overlay" />
      <span className="attraction-card-badge">
        {t('sections.attractionsBadge', { defaultValue: 'Attraction' })}
      </span>
      <div className="attraction-card-footer">
        <div className="attraction-card-location">
          <MapPin className="attraction-card-pin" size={13} />
          <span>{attraction.tourCount} {t('sections.tours', { defaultValue: 'tours' })}</span>
        </div>
        <div className="attraction-card-title-row">
          <h3 className="attraction-card-title">{attraction.name}</h3>
          {priceStr && (
            <div className="attraction-card-price">
              <p className="attraction-card-from">{t('common.from')}</p>
              <p className="attraction-card-amount">{priceStr}</p>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

interface Props {
  preloaded?: HomepageAttraction[]
}

export default function TopAttractionsNearbySection({ preloaded }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const { data: attractionsData, isLoading } = useAttractions(12)
  const [locationError, setLocationError] = useState<string | null>(() =>
    typeof navigator !== 'undefined' && navigator.geolocation ? null : 'Geolocation not supported',
  )

  const attractions = (preloaded ?? attractionsData) ?? []

  // Sort by proximity if geolocation available
  const [sortedAttractions, setSortedAttractions] = useState<Attraction[]>([])

  useEffect(() => {
    if (attractions.length === 0) {
      setSortedAttractions([])
      return
    }

    if (!navigator.geolocation) {
      setSortedAttractions(attractions)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const withDistance = attractions
          .filter(a => a.lat != null && a.lng != null)
          .map(a => ({
            ...a,
            _distance: haversineDistanceKm(latitude, longitude, a.lat!, a.lng!),
          }))
          .sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity))

        const withoutCoords = attractions.filter(a => a.lat == null || a.lng == null)
        setSortedAttractions([...withDistance, ...withoutCoords])
      },
      () => {
        setLocationError('Location access denied')
        setSortedAttractions(attractions)
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    )
  }, [attractions])

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
    el.addEventListener('scroll', updateArrows, { passive: true })
    return () => el.removeEventListener('scroll', updateArrows)
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
          {isLoading ? (
            <div className="attractions-loading">{t('common.loading', { defaultValue: 'Loading...' })}</div>
          ) : sortedAttractions.length === 0 ? (
            <div className="attractions-empty">{t('sections.noAttractions', { defaultValue: 'No attractions found.' })}</div>
          ) : (
            <div className="attractions-clip">
              <div className="attractions-carousel" ref={scrollRef}>
                {sortedAttractions.map((attraction, i) => (
                  <div key={`${attraction.name}-${i}`} className="attractions-card-wrap">
                    <AttractionCard
                      attraction={attraction}
                      onClick={() => navigate(`/tours?attraction=${encodeURIComponent(attraction.name)}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
