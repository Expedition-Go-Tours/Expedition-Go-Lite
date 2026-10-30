import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import OptimizedImage from '@/components/shared/OptimizedImage'
import { getCategoryMeta } from './categoryMeta'
import { tourHref } from '../lib/tourPath'
import { useHandoffHref } from '../lib/ssoHandoff'
import { useOptionalLocationSearch } from '../context/LocationSearchContext'
import { getTourBlurb } from '../lib/tourBlurbs'
import type { TopRecItem } from './TopRecommendationsGrid'
import './TopRecommendationsSlider.css'

interface Props {
  items: TopRecItem[]
  /** Tour id → full description (detail endpoint). */
  descriptions: Map<string, string>
  title: string
  isLoading?: boolean
}

const SKELETON_SLIDES = 5

/**
 * The homepage "Our top recommendations" rail.
 *
 * Desktop shows five cards at a time (four ≤1300px, three ≤1050px), phones one
 * card with the next peeking in. It is a native scroll-snap rail — trackpad,
 * touch and keyboard all work for free — with the prototype's circular arrows
 * stepping one card and disabling at the ends.
 */
export default function TopRecommendationsSlider({ items, descriptions, title, isLoading }: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateArrows = useCallback(() => {
    const el = railRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 2)
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateArrows) : null
    observer?.observe(el)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      observer?.disconnect()
    }
  }, [updateArrows, items.length, isLoading])

  const step = (direction: 1 | -1) => {
    const el = railRef.current
    if (!el) return
    const first = el.querySelector<HTMLElement>('.top-recs-slide')
    if (!first) return
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0
    const delta = first.getBoundingClientRect().width + gap
    el.scrollBy({ left: direction * delta, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <>
      <div className="top-recs-head">
        <h2 className="top-recs-heading">{title}</h2>
        <div className="top-recs-actions">
          <div className="top-recs-nav">
            <button
              type="button"
              className="top-recs-nav-btn"
              onClick={() => step(-1)}
              disabled={!canPrev}
              aria-label="Previous tours"
            >
              <ChevronLeft size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="top-recs-nav-btn"
              onClick={() => step(1)}
              disabled={!canNext}
              aria-label="Next tours"
            >
              <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
          <Link to="/tours?section=Top Recommendations" className="top-recs-viewall">
            View all experiences
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>

      <div className="top-recs-rail" ref={railRef}>
        {isLoading
          ? Array.from({ length: SKELETON_SLIDES }, (_, index) => (
              <div className="top-recs-slide top-recs-slide--skeleton" key={index} aria-hidden="true">
                <div className="top-recs-skeleton-photo" />
                <div className="top-recs-skeleton-body">
                  <span className="top-recs-skeleton-line" />
                  <span className="top-recs-skeleton-line top-recs-skeleton-line--short" />
                  <span className="top-recs-skeleton-line top-recs-skeleton-line--short" />
                </div>
              </div>
            ))
          : items.map((item) => (
              <article className="top-recs-slide" key={item.id}>
                <Slide item={item} description={getTourBlurb(item.title, descriptions.get(item.id) ?? '')} />
              </article>
            ))}
      </div>
    </>
  )
}

/**
 * One card. The link leaves this domain for the tour detail page, so it opens
 * in a new tab and upgrades to an `#sso=` handoff URL once a ticket is warm —
 * exactly like the view-all grid's cards.
 */
function Slide({ item, description }: { item: TopRecItem; description: string }) {
  const href = useHandoffHref(tourHref(item.id, item.slug))
  const locationSearch = useOptionalLocationSearch()
  const category = getCategoryMeta(item.category)?.label

  const rememberRegion = () => {
    const region = item.region?.trim()
    if (region) locationSearch?.setLocation(region)
  }

  return (
    <a
      className="top-recs-card"
      href={href}
      onClick={rememberRegion}
      target="_blank"
      rel="noopener"
      aria-label={item.title}
    >
      <div className="top-recs-photo">
        {item.image ? (
          <OptimizedImage src={item.image} alt="" width={520} className="top-recs-img" />
        ) : (
          <span className="top-recs-photo-fallback" />
        )}
        {category && <span className="top-recs-tag">{category}</span>}
      </div>
      <div className="top-recs-body">
        <h3 className="top-recs-card-title">{item.title}</h3>
        {description && <p className="top-recs-desc">{description}</p>}
        <span className="top-recs-go">
          Check availability
          <span className="top-recs-go-arrow" aria-hidden="true">→</span>
        </span>
      </div>
    </a>
  )
}
