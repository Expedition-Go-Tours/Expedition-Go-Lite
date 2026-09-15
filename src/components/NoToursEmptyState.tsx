import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import NoToursAnimation from './NoToursAnimation'
import SectionHeading from './SectionHeading'
import TourCard from './TourCard'
import { useSearchFallback } from '../hooks/useSearchFallback'
import { useHomepageOffers, mapToTourCard } from '../hooks/useHomepageSections'
import type { TourCardData } from '../hooks/useExpeditionTours'
import './NoToursEmptyState.css'

interface Props {
  /** The searched destination, when known (drives the copy + suggestions). */
  location?: string
  /** If the search was for an attraction, this provides the attraction name. */
  attraction?: string
  /** If the search was for a region, this provides the region name. */
  region?: string
  /** Primary CTA. Defaults to navigating to the full catalogue. */
  onBrowseAll?: () => void
}

interface RailProps {
  title: string
  items: TourCardData[]
  viewAllLink?: string
  hideOfferBadge?: boolean
  priorityFirst?: boolean
}

/** A horizontal card rail with scroll arrows + a "View all" link. */
function NoToursRail({ title, items, viewAllLink, hideOfferBadge, priorityFirst }: RailProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < maxScroll - 2)
  }, [])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const step = Math.max(el.clientWidth * 0.8, 280)
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' })
  }, [])

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
  }, [updateArrows, items.length])

  return (
    <section className="no-tours-section">
      <SectionHeading
        title={title}
        viewAllLink={viewAllLink}
        onScrollLeft={() => scroll('left')}
        onScrollRight={() => scroll('right')}
        disableLeft={!canScrollLeft}
        disableRight={!canScrollRight}
      />
      <div className="no-tours-rail" ref={scrollRef}>
        {items.map((tour, i) => (
          <div className="no-tours-rail-item" key={tour.id ?? `${tour.title}-${i}`}>
            <TourCard {...tour} imageClean hideFeatures hideOfferBadge={hideOfferBadge} priority={priorityFirst && i === 0} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function NoToursEmptyState({ location = '', attraction, region, onBrowseAll }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading } = useSearchFallback(location, attraction, region)

  const nearby = data?.nearbyLocations ?? []
  const recommended = data?.recommended ?? []
  const alsoLike = data?.youMayAlsoLike ?? []
  const resolvedAttraction = data?.attraction || attraction
  const resolvedRegion = data?.region || region
  const { data: offerTours } = useHomepageOffers(12)
  const offers = (offerTours ?? []).map(mapToTourCard)
  const place = location || t('empty.thisPlace', { defaultValue: 'this destination' })

  // Honest copy that names what was ACTUALLY searched. For an attraction the
  // `location` prop is the surrounding REGION, so saying "we don't have
  // experiences for Ashanti Region" while listing three of them contradicts
  // itself — name the attraction and point at the region instead.
  const bodyCopy = resolvedAttraction
    ? resolvedRegion
      ? t('empty.bodyAttraction', {
          attraction: resolvedAttraction,
          region: resolvedRegion,
          defaultValue:
            "We don't have experiences for {{attraction}} just yet — but there are plenty across {{region}}.",
        })
      : t('empty.bodyAttractionNoRegion', {
          attraction: resolvedAttraction,
          defaultValue:
            "We don't have experiences for {{attraction}} just yet — but there's plenty to discover nearby.",
        })
    : t('empty.body', {
        location: place,
        defaultValue:
          'We\'re not quite there yet — but we\'re working on it. We don\'t have experiences for {{location}} just yet, but there\'s plenty to discover.',
      })

  // Scoped CTA text. Prefer the REGION — that is what the listings below
  // actually cover, so "Browse experiences in Ashanti Region" matches what the
  // user is about to see (naming a single attraction was misleading).
  const scopedCta = resolvedRegion
    ? t('empty.browseRegion', {
        region: resolvedRegion,
        defaultValue: 'Browse experiences in {{region}}',
      })
    : resolvedAttraction
    ? t('empty.browseAttraction', {
        attraction: resolvedAttraction,
        defaultValue: 'Browse experiences in {{attraction}}',
      })
    : t('empty.browseAll', { defaultValue: 'Browse all experiences' })

  return (
    <div className="no-tours">
      <div className="no-tours-hero">
        <NoToursAnimation />
        <h2 className="no-tours-title">{t('empty.title', { defaultValue: "We're not quite there yet" })}</h2>
        <p className="no-tours-sub">
          <span className="no-tours-sub-line">{bodyCopy}</span>
        </p>
        <div className="no-tours-actions">
          <button
            type="button"
            className="no-tours-btn no-tours-btn--primary"
            onClick={onBrowseAll ?? (() => navigate('/tours'))}
          >
            {scopedCta}
          </button>
        </div>
      </div>

      {nearby.length > 0 && (
        <section id="no-tours-nearby" className="no-tours-section">
          <SectionHeading title={t('empty.nearbyTitle', { defaultValue: 'Close by' })} />
          <div className="no-tours-chips">
            {nearby.map((loc) => (
              <button
                key={`${loc.city}-${loc.country ?? ''}`}
                type="button"
                className="no-tours-chip"
                onClick={() => navigate(`/tours?place=${encodeURIComponent(loc.city)}`)}
              >
                {loc.coverPhoto && <img src={loc.coverPhoto} alt="" loading="lazy" />}
                <span className="no-tours-chip-body">
                  <span className="no-tours-chip-city">
                    <MapPin size={13} aria-hidden="true" /> {loc.city}
                  </span>
                  <span className="no-tours-chip-meta">
                    {t('empty.experiencesCount', { count: loc.tourCount, defaultValue: '{{count}} experiences' })}
                    {loc.distanceKm ? ` · ${loc.distanceKm} km` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {offers.length > 0 && (
        <NoToursRail
          title={t('empty.specialOffersTitle', { defaultValue: 'Special Offers' })}
          items={offers}
          viewAllLink="/tours?section=Last Minute Deals"
          hideOfferBadge
          priorityFirst
        />
      )}

      {recommended.length > 0 && (
        <NoToursRail
          title={t('empty.recommendedTitle', { defaultValue: 'Recommended for you' })}
          items={recommended}
          viewAllLink="/tours?section=Recommended"
          priorityFirst
        />
      )}

      {alsoLike.length > 0 && (
        <NoToursRail
          title={t('empty.alsoLikeTitle', { defaultValue: 'You may also like' })}
          items={alsoLike}
          viewAllLink="/tours"
        />
      )}

      {isLoading && recommended.length === 0 && (
        <p className="no-tours-loading" role="status" aria-live="polite">
          {t('empty.loading', { defaultValue: 'Finding great experiences for you…' })}
        </p>
      )}
    </div>
  )
}
