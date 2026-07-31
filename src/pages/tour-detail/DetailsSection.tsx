import i18n from '../../i18n/config'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import './DetailsSection.css'

interface InfoSection {
  key: string
  title: string
  content: React.ReactNode
}

interface DetailsSectionProps {
  sections: InfoSection[]
}

export default function DetailsSection({ sections }: DetailsSectionProps) {
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
        {sections.map((section) => (
          <div key={section.key} className="details-row">
            <h3 className="details-row-heading">{section.title}</h3>
            <div className="details-row-content">
              {section.content}
            </div>
          </div>
        ))}
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
  if (inc.length === 0 && exc.length === 0) {
    return <p className="details-empty">{i18n.t('tourDetail.detailsNotAvailable')}</p>
  }
  return (
    <div className="details-included-excluded">
      {inc.length > 0 && (
        <ul className="details-list">
          {inc.map((item, i) => (
            <li key={i} className="details-list-item included">
              <Check size={16} strokeWidth={2.5} className="details-check-icon" />
              <span>{typeof item === 'string' ? item : item}</span>
            </li>
          ))}
        </ul>
      )}
      {exc.length > 0 && (
        <ul className="details-list">
          {exc.map((item, i) => (
            <li key={i} className="details-list-item excluded">
              <X size={16} strokeWidth={2.5} className="details-x-icon" />
              <span>{typeof item === 'string' ? item : item}</span>
            </li>
          ))}
        </ul>
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
        <ul className="details-about-list">
          {items.map((item) => (
            <li key={item.num} className="details-about-item">
              {item.content}
            </li>
          ))}
        </ul>
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
