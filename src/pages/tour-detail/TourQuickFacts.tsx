import { useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import './TourQuickFacts.css'

export interface QuickFactItem {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  desc: string | null
  renderValue?: () => ReactNode
}

interface TourQuickFactsProps {
  items: QuickFactItem[]
}

const ACCORDION_EASE = [0.22, 1, 0.36, 1] as const

/**
 * Horizontal strip of icon + feature-text facts (duration, difficulty, guide, etc.)
 * shown directly below the image gallery, GetYourGuide-style.
 *
 * Mobile: the facts sit in a swipeable carousel (snap-to-tile, full tiles per
 * view — never cut off) with a "View all" button beneath it. AnimatePresence
 * crossfades the carousel with the full 2-up grid, which expands/collapses
 * like an accordion. Desktop always shows the full grid; the carousel and
 * toggle are hidden there.
 */
export default function TourQuickFacts({ items }: TourQuickFactsProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const toggleExpanded = () => setExpanded((prev) => !prev)

  const renderFacts = (): ReactNode =>
    items.map(({ icon: Icon, title, desc, renderValue }) => (
      <div key={title} className="tour-quick-fact">
        <div className="tour-quick-fact-icon">
          <Icon className="tour-quick-fact-icon-svg" strokeWidth={1.5} />
        </div>
        <div className="tour-quick-fact-body">
          {renderValue ? renderValue() : (
            <>
              <p className="tour-quick-fact-title">{title}</p>
              {desc && <p className="tour-quick-fact-desc">{desc}</p>}
            </>
          )}
        </div>
      </div>
    ))

  return (
    <>
      <div className={`tour-quick-facts-wrap${expanded ? ' tour-quick-facts-wrap-expanded' : ''}`}>
        <AnimatePresence mode="wait" initial={false}>
          {expanded ? (
            <motion.div
              key="facts-grid"
              className="tour-quick-facts tour-quick-facts-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: ACCORDION_EASE }}
            >
              {renderFacts()}
            </motion.div>
          ) : (
            <motion.div
              key="facts-carousel"
              className="tour-quick-facts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {renderFacts()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        className={`tour-quick-facts-toggle${expanded ? ' tour-quick-facts-toggle-open' : ''}`}
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <span>{expanded ? t('tourDetail.viewLessFacts', 'View less') : t('tourDetail.viewAllFacts', 'View all')}</span>
        <ChevronDown size={16} strokeWidth={2.25} className="tour-quick-facts-toggle-chevron" />
      </button>
    </>
  )
}
