import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ItineraryDay } from '../../lib/tourTypes'
import { formatItineraryDuration } from '../../lib/tourTypes'
import './TourItineraryPreview.css'

const PREVIEW_COUNT = 3

interface TourItineraryPreviewProps {
  itinerary: ItineraryDay[]
}

export default function TourItineraryPreview({ itinerary }: TourItineraryPreviewProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (itinerary.length === 0) return null

  const isLong = itinerary.length > PREVIEW_COUNT
  const previewStops = itinerary.slice(0, PREVIEW_COUNT)
  const extraStops = itinerary.slice(PREVIEW_COUNT)

  const stopMeta = (stop: ItineraryDay) => {
    const durationLabel = formatItineraryDuration(stop.duration, stop.durationUnit)
    return [
      durationLabel,
      stop.activityName || (stop.additionalFee ? undefined : t('tourDetail.admissionTicketIncluded')),
    ].filter(Boolean).join(' \u2022 ')
  }

  const renderStop = (stop: ItineraryDay, index: number) => {
    const isLast = index === itinerary.length - 1
    const displayTitle = stop.locationName || stop.title
    return (
      <div className="itinerary-stop-simple">
        <div className="itinerary-stop-simple-marker-col">
          <span className="itinerary-stop-simple-marker">{index + 1}</span>
          {!isLast && <div className="itinerary-stop-simple-line" />}
        </div>
        <div className="itinerary-stop-simple-content">
          {displayTitle && (
            <h3 className="itinerary-stop-simple-title">{displayTitle}</h3>
          )}
          {stop.description && (
            <p className="itinerary-stop-simple-desc">{stop.description}</p>
          )}
          {stopMeta(stop) && (
            <p className="itinerary-stop-simple-meta">{stopMeta(stop)}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="itinerary-preview">
      <h2 className="overview-section-title">{t('tourDetail.itineraryPreview')}</h2>
      <div className="itinerary-preview-body">
        <div className={`itinerary-preview-stops-wrap${isLong && !expanded ? ' has-fade' : ''}`}>
          <div className="itinerary-stops-simple">
            {previewStops.map((stop, i) => (
              <div key={`preview-${i}-${stop.title}`}>{renderStop(stop, i)}</div>
            ))}
          </div>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="extra"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div className="itinerary-stops-simple">
                  {extraStops.map((stop, i) => (
                    <div key={`extra-${i}-${stop.title}`}>{renderStop(stop, PREVIEW_COUNT + i)}</div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {isLong && !expanded && <div className="itinerary-preview-fade" />}
        </div>
        {isLong && (
          <button
            type="button"
            className="itinerary-preview-toggle"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? t('tourDetail.seeLess') : t('tourDetail.viewFullItinerary')}
          </button>
        )}
      </div>
    </section>
  )
}
