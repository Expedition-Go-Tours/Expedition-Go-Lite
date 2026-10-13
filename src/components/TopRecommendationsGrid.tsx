import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
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
 * Full-description dialog for touch layouts and the view-all page's "See
 * more" toggle. Mirrors the site's other dialogs (ConfirmDialog): Escape and
 * the backdrop close, Tab is trapped inside the panel, the body scroll locks
 * while open, and focus moves in and is restored on close. AnimatePresence
 * plays the rise-and-fade on open and the same transition in reverse on close
 * (the ✕ button included), so the exit reads as deliberate as the entry.
 * Portaled to <body> so transformed page wrappers can't break the fixed
 * positioning.
 */
function DescriptionDialog({
  open,
  title,
  paragraphs,
  onClose,
}: {
  open: boolean
  title: string
  paragraphs: string[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  // Server-rendered markup never needs the portal.
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="top-rec-modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            ref={panelRef}
            className="top-rec-modal"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="top-rec-modal-head">
              <h2 className="top-rec-modal-title">{title}</h2>
              <button
                ref={closeRef}
                type="button"
                className="top-rec-modal-close"
                onClick={onClose}
                aria-label={t('common.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="top-rec-modal-body">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/**
 * One recommendation row: image and title (both link to the tour's detail page
 * on Travio Ghana) and the description excerpt. On the homepage's editorial
 * layout the desktop excerpt is clamped with an inline "See more" / "See less"
 * toggle; on the view-all page's "cards" layout the toggle sits on the card's
 * left edge and opens the whole description in a dialog. On touch layouts
 * (≤1023px — the layouts where the toggle is hidden) the clamped text itself
 * is the affordance and opens that same dialog.
 *
 * The text is the tour's full description from the detail endpoint (the same
 * source the tour detail page renders); the collapsed state simply clamps it
 * to three lines.
 */
function TopRecommendationItem({
  item,
  description,
  layout,
}: {
  item: TopRecItem
  description: string
  layout: 'editorial' | 'cards'
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [fullTextOpen, setFullTextOpen] = useState(false)
  // Mirrors the CSS rule that hides the "See more" toggle below 1024px.
  const [isCompact, setIsCompact] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(max-width: 1023px)').matches,
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(max-width: 1023px)')
    const handler = (e: MediaQueryListEvent) => setIsCompact(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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
  // Only when there is more text than the clamp reveals — the same gate the
  // "See more" toggle uses, which these layouts don't render.
  const tappableExcerpt = isCompact && longDescription && paragraphs.length > 0
  // The view-all cards never expand in place — the toggle opens the dialog.
  const seeMoreOpensDialog = layout === 'cards'

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
          (tappableExcerpt ? (
            <button
              type="button"
              className="top-rec-excerpt top-rec-excerpt--clamped top-rec-excerpt--tap"
              onClick={() => setFullTextOpen(true)}
            >
              {paragraphs.join(' ')}
            </button>
          ) : expanded && longDescription ? (
            paragraphs.map((paragraph, index) => (
              <p className="top-rec-excerpt" key={index}>
                {paragraph}
              </p>
            ))
          ) : (
            <p className="top-rec-excerpt top-rec-excerpt--clamped">{paragraphs.join(' ')}</p>
          ))}
        {longDescription && !isCompact && (
          <button
            type="button"
            className="top-rec-toggle"
            onClick={() =>
              seeMoreOpensDialog ? setFullTextOpen(true) : setExpanded((value) => !value)
            }
            {...(seeMoreOpensDialog
              ? { 'aria-haspopup': 'dialog' as const }
              : { 'aria-expanded': expanded })}
          >
            {!seeMoreOpensDialog && expanded ? t('tourDetail.seeLess') : t('tourDetail.seeMore')}
          </button>
        )}
      </div>
      <DescriptionDialog
        open={fullTextOpen}
        title={item.title}
        paragraphs={paragraphs}
        onClose={() => setFullTextOpen(false)}
      />
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
  /**
   * "editorial" (default) = the homepage section's image-beside-text rows.
   * "cards" = the stacked mobile card design in a plain grid at desktop
   * widths (the All Tours Top Recommendations section). Both share the
   * ≤1023px swipe rail.
   */
  layout?: 'editorial' | 'cards'
}

/**
 * The shared recommendations grid: ten tours as two-column editorial rows on
 * desktop, a one-card-at-a-time swipe rail on tablet/phones (see the CSS).
 * The homepage section and the All Tours Top Recommendations section both
 * render this component, so the cards can never drift apart between them.
 */
export default function TopRecommendationsGrid({ items, descriptions, isLoading, layout = 'editorial' }: Props) {
  const gridClass = layout === 'cards' ? 'top-recs-grid top-recs-grid--cards' : 'top-recs-grid'

  if (items.length === 0) {
    if (!isLoading) return null
    return (
      <div className={gridClass} aria-hidden="true">
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
    <div className={gridClass}>
      {items.map((item) => (
        <TopRecommendationItem
          item={item}
          description={descriptions.get(item.id) ?? ''}
          layout={layout}
          key={item.id}
        />
      ))}
    </div>
  )
}
