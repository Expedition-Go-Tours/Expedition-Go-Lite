import type { ComponentType, ReactNode } from 'react'
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

/**
 * Horizontal strip of icon + feature-text facts (duration, difficulty, guide, etc.)
 * shown directly below the image gallery, GetYourGuide-style.
 */
export default function TourQuickFacts({ items }: TourQuickFactsProps) {
  return (
    <div className="tour-quick-facts">
      {items.map(({ icon: Icon, title, desc, renderValue }) => (
        <div key={title} className="tour-quick-fact">
          <div className="tour-quick-fact-icon">
            <Icon className="tour-quick-fact-icon-svg" strokeWidth={1.5} />
          </div>
          <div>
            {renderValue ? renderValue() : (
              <>
                <p className="tour-quick-fact-title">{title}</p>
                {desc && <p className="tour-quick-fact-desc">{desc}</p>}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
