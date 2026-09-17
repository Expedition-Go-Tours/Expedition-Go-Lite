import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { FaqItemData } from '../../lib/faq'

interface FaqItemProps {
  item: FaqItemData
  isOpen: boolean
  onToggle: () => void
}

export function FaqItem({ item, isOpen, onToggle }: FaqItemProps) {
  return (
    <div className={`sh-faq-item${isOpen ? ' open' : ''}`} id={`faq-${item.id}`}>
      <button
        type="button"
        className="sh-faq-q"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-${item.id}-answer`}
      >
        <span>{item.q}</span>
        <ChevronDown size={18} className="sh-faq-chevron" aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-${item.id}-answer`}
            className="sh-faq-a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            <p>{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface FaqAccordionProps {
  items: FaqItemData[]
  openId: string | null
  onToggle: (id: string | null) => void
}

/** Single-open accordion with stable deep-link anchors (`faq-<id>`). */
export default function FaqAccordion({ items, openId, onToggle }: FaqAccordionProps) {
  return (
    <div className="sh-faq-list">
      {items.map((item) => (
        <FaqItem
          key={item.id}
          item={item}
          isOpen={openId === item.id}
          onToggle={() => onToggle(openId === item.id ? null : item.id)}
        />
      ))}
    </div>
  )
}
