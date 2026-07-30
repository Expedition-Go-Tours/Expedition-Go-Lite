import { useState, useRef, useEffect } from 'react'
import i18n from '../../i18n/config'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import './DetailsSection.css'

interface InfoSection {
  key: string
  title: string
  content: React.ReactNode
}

interface DetailsSectionProps {
  sections: InfoSection[]
}

function AccordionContent({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.scrollHeight)
    }
  }, [isOpen])

  return (
    <motion.div
      initial={false}
      animate={{ height: isOpen ? height : 0, opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ overflow: 'hidden' }}
      className="details-accordion-content"
    >
      <div ref={ref} className="details-accordion-body">
        {children}
      </div>
    </motion.div>
  )
}

export default function DetailsSection({ sections }: DetailsSectionProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ included: true })

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <motion.section
      key="details"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="details-section"
    >
      <div className="details-section-list">
        {sections.map((section) => {
          const isOpen = !!expanded[section.key]
          return (
            <div key={section.key}>
              <button
                type="button"
                onClick={() => toggle(section.key)}
                className="details-accordion-trigger"
              >
                {section.title}
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <AccordionContent isOpen={isOpen}>
                {section.content}
              </AccordionContent>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}

export function buildIncludedExcludedContent(
  included?: string[],
  excluded?: string[]
): React.ReactNode {
  const inc = included ?? []
  const exc = excluded ?? []
  return (
    <div className="details-included-excluded">
      {inc.length > 0 && (
        <div>
          <ul className="details-list">
            {inc.map((item, i) => (
              <li key={i} className="details-list-item included">
                <Check size={16} strokeWidth={2.5} className="details-check-icon" />
                <span>{typeof item === 'string' ? item : item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {exc.length > 0 && (
        <div>
          <h4 className="details-subsection-title">{i18n.t('tourDetail.notIncluded')}</h4>
          <ul className="details-list">
            {exc.map((item, i) => (
              <li key={i} className="details-list-item excluded">
                <X size={16} strokeWidth={2.5} className="details-x-icon" />
                <span>{typeof item === 'string' ? item : item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {inc.length === 0 && exc.length === 0 && (
        <p className="details-empty">{i18n.t('tourDetail.detailsNotAvailable')}</p>
      )}
    </div>
  )
}

function parseNumberedContent(text: string): { preamble: string; items: { num: string; content: string }[] } {
  const lines = text.split('\n')
  const items: { num: string; content: string }[] = []
  const preambleParts: string[] = []
  let inItems = false

  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(/^(\d+)\.\s+(.*)/)
    if (match) {
      inItems = true
      items.push({ num: match[1], content: match[2] })
    } else if (inItems) {
      if (items.length > 0) {
        items[items.length - 1].content += '\n' + trimmed
      }
    } else {
      preambleParts.push(trimmed)
    }
  }

  return {
    preamble: preambleParts.join('\n'),
    items,
  }
}

export function buildAboutContent(text: string): React.ReactNode {
  if (!text) {
    return <p className="details-text">{i18n.t('tourDetail.experienceComingSoon')}</p>
  }

  const { preamble, items } = parseNumberedContent(text)

  return (
    <div className="details-about">
      {preamble && <p className="details-text">{preamble}</p>}
      {items.length > 0 && (
        <ol className="details-about-list">
          {items.map((item) => (
            <li key={item.num} className="details-about-item">
              <span className="details-about-num">{item.num}.</span>
              <span>{item.content}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function buildMeetingContent(
  meetingAddress: string,
  meetingInstructions: string
): React.ReactNode {
  return (
    <div className="details-text">
      {meetingAddress && <p>{i18n.t('tourDetail.meetingPoint')}: {meetingAddress}</p>}
      {meetingInstructions && <p>{meetingInstructions}</p>}
      {!meetingAddress && !meetingInstructions && (
        <p>{i18n.t('tourDetail.pickupConfirmedAfterBooking')}</p>
      )}
    </div>
  )
}

export function buildAccessibilityContent(
  accessibilityText: string,
  restrictionsText: string,
  travelerReqsText: string
): React.ReactNode {
  return (
    <div className="details-text">
      {accessibilityText && <p>{accessibilityText}</p>}
      {restrictionsText && <p>{restrictionsText}</p>}
      {travelerReqsText && <p>{travelerReqsText}</p>}
      {!accessibilityText && !restrictionsText && !travelerReqsText && (
        <p>{i18n.t('tourDetail.contactForAccessibility')}</p>
      )}
    </div>
  )
}

export function buildCancellationContent(
  cutoffHours: number | undefined,
  refundRules: string
): React.ReactNode {
  return (
    <div className="details-text">
      {cutoffHours ? (
        <p>
          {i18n.t('tourDetail.cancellationWithHours', { hours: cutoffHours })}
        </p>
      ) : (
        <p>
          {refundRules || i18n.t('tourDetail.cancellationDefault')}
        </p>
      )}
      {refundRules && cutoffHours && <p className="details-mt-1">{refundRules}</p>}
    </div>
  )
}
