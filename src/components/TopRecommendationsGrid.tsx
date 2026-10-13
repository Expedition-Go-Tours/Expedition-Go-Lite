import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import OptimizedImage from '@/components/shared/OptimizedImage'
import type { HomepageTour } from '../hooks/useHomepageSections'
import { tourHref } from '../lib/tourPath'
import { useHandoffHref } from '../lib/ssoHandoff'
import { useOptionalLocationSearch } from '../context/LocationSearchContext'
import './TopRecommendationsGrid.css'

/** Five rows of two — the editorial grid this content was designed around. */
export const TOP_RECOMMENDATION_COUNT = 10
/** Same long-description gate the tour detail page uses for its toggle. */
const LONG_DESCRIPTION_CHARS = 300

export interface TopRecItem {
  id: string
  title: string
  slug: string
  image: string
  /** Admin region — scopes the homepage when the row is clicked. */
  region: string | null
}

/** Map a ranked homepage row to the card's display fields. */
export function toTopRecItem(tour: HomepageTour): TopRecItem {
  return {
    id: tour.id,
    title: tour.title,
    slug: tour.slug,
    image: tour.coverPhoto || tour.photos?.[0] || '',
    region: tour.region ?? null,
  }
}

/** Dedupe by id, first occurrence wins (payload order = backend ranking). */
export function dedupeTours(tours: HomepageTour[]): HomepageTour[] {
  const seen = new Set<string>()
  const out: HomepageTour[] = []
  for (const tour of tours) {
    if (!tour?.id || seen.has(tour.id)) continue
    seen.add(tour.id)
    out.push(tour)
  }
  return out
}

/**
 * One recommendation row: image, title (both link to the tour's detail page on
 * Travio Ghana), the description excerpt, and an inline "See more" / "See
 * less" toggle that reveals the full description in place.
 *
 * The text is the tour's full description from the detail endpoint (the same
 * source the tour detail page renders); the collapsed state simply clamps it
 * to three lines, and "See more" un-clamps the entire text.
 */
function TopRecommendationItem({ item, description }: { item: TopRecItem; description: string }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  // Absolute cross-origin URL — the detail page is Travio Ghana's, so the
  // links open it in a new tab and keep this page (and its scroll) alive.
  // Upgrades to `#sso=…` once a handoff ticket is warm, so copy-link and
  // middle-click carry the session too and not just a plain click.
  const url = tourHref(item.id, item.slug)
  const href = useHandoffHref(url)

  // Optional because the grid renders outside the provider in some trees.
  const locationSearch = useOptionalLocationSearch()

  // Recorded synchronously on the click: the new tab takes focus right away,
  // so this must not wait on the async handoff. Scope the homepage to the
  // region the visitor just left for — switching back lands on a region-scoped
  // page instead of the global one, and the choice persists (consent-gated).
  const rememberRegion = () => {
    const region = item.region?.trim()
    if (region) locationSearch?.setLocation(region)
  }

  const paragraphs = description
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const longDescription = description.length > LONG_DESCRIPTION_CHARS

  return (
    <article className={`top-rec-item${expanded ? ' top-rec-item--expanded' : ''}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="top-rec-image"
        aria-label={item.title}
        onClick={rememberRegion}
      >
        {item.image ? (
          <OptimizedImage src={item.image} alt="" width={640} className="top-rec-img" />
        ) : (
          <span className="top-rec-image-fallback" />
        )}
      </a>
      <div className="top-rec-body">
        <h3 className="top-rec-title">
          <a href={href} target="_blank" rel="noopener" onClick={rememberRegion}>
            {item.title}
          </a>
        </h3>
        {paragraphs.length > 0 &&
          (expanded && longDescription ? (
            paragraphs.map((paragraph, index) => (
              <p className="top-rec-excerpt" key={index}>
                {paragraph}
              </p>
            ))
          ) : (
            <p className="top-rec-excerpt top-rec-excerpt--clamped">{paragraphs.join(' ')}</p>
          ))}
        {longDescription && (
          <button
            type="button"
            className="top-rec-toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? t('tourDetail.seeLess') : t('tourDetail.seeMore')}
          </button>
        )}
      </div>
    </article>
  )
}

interface Props {
  /** Cards to render, already deduped, ranked and capped by the caller. */
  items: TopRecItem[]
  /** Tour id → full description (rendered as the excerpt / See more body). */
  descriptions: Map<string, string>
  /** When there are no items yet, render the skeleton rhythm instead. */
  isLoading?: boolean
}

/**
 * The shared recommendations grid: ten tours as two-column editorial rows on
 * desktop, a one-card-at-a-time swipe rail on tablet/phones (see the CSS).
 * The homepage section and the /top-recommendations view-all page both render
 * this component, so the cards can never drift apart between the two.
 */
export default function TopRecommendationsGrid({ items, descriptions, isLoading }: Props) {
  if (items.length === 0) {
    if (!isLoading) return null
    return (
      <div className="top-recs-grid" aria-hidden="true">
        {Array.from({ length: TOP_RECOMMENDATION_COUNT }).map((_, index) => (
          <div className="top-rec-item top-rec-item--skeleton" key={index}>
            <span className="top-rec-skeleton-image" />
            <div className="top-rec-body">
              <span className="top-rec-skeleton-line top-rec-skeleton-line--title" />
              <span className="top-rec-skeleton-line" />
              <span className="top-rec-skeleton-line" />
              <span className="top-rec-skeleton-line top-rec-skeleton-line--short" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="top-recs-grid">
      {items.map((item) => (
        <TopRecommendationItem
          item={item}
          description={descriptions.get(item.id) ?? ''}
          key={item.id}
        />
      ))}
    </div>
  )
}
