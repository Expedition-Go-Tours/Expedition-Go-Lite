import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/config'
import { motion, AnimatePresence } from 'framer-motion'
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

export default function DetailsSection({ sections }: DetailsSectionProps) {
  const { t } = useTranslation()
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
      <h2 className="details-section-title">{t('tourDetail.aboutTour')}</h2>
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
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={section.key}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="details-accordion-content"
                  >
                    <div className="details-accordion-body">
                      {section.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}

export function buildIncludedExcludedContent(
  included: string[],
  excluded: string[]
): React.ReactNode {
  return (
    <div className="details-included-excluded">
      {included.length > 0 && (
        <div>
          <ul className="details-list">
            {included.map((item, i) => (
              <li key={i} className="details-list-item included">
                <Check size={16} strokeWidth={2.5} className="details-check-icon" />
                <span>{typeof item === 'string' ? item : item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {excluded.length > 0 && (
        <div>
          <h4 className="details-subsection-title">{i18n.t('tourDetail.notIncluded')}</h4>
          <ul className="details-list">
            {excluded.map((item, i) => (
              <li key={i} className="details-list-item excluded">
                <X size={16} strokeWidth={2.5} className="details-x-icon" />
                <span>{typeof item === 'string' ? item : item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {included.length === 0 && excluded.length === 0 && (
        <p className="details-empty">{i18n.t('tourDetail.detailsNotAvailable')}</p>
      )}
    </div>
  )
}

export function buildAboutContent(text: string): React.ReactNode {
  return (
    <p className="details-text">
      {text || i18n.t('tourDetail.experienceComingSoon')}
    </p>
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
