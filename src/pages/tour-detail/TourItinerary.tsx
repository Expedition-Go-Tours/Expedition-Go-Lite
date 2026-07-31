import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { ItineraryDay } from '../../lib/tourTypes'
import { formatItineraryDuration } from '../../lib/tourTypes'
import './TourItinerary.css'

interface TourItineraryProps {
  itinerary: ItineraryDay[]
}

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] as const },
})

export default function TourItinerary({ itinerary }: TourItineraryProps) {
  const { t } = useTranslation()

  if (itinerary.length === 0) {
    return (
      <section className="tour-itinerary-new">
        <h2 className="itinerary-title">{t('tourDetail.itinerary')}</h2>
        <p className="itinerary-empty">{t('tourDetail.noItinerary')}</p>
      </section>
    )
  }

  return (
    <motion.section
      key="itinerary"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="tour-itinerary-new"
    >
      <h2 className="itinerary-title">{t('tourDetail.itinerary')}</h2>

      <div className="itinerary-stops-simple">
        {itinerary.map((stop, index) => {
          const isLast = index === itinerary.length - 1
          const markerLabel = String(index + 1)
          const displayTitle = stop.locationName || stop.title
          const durationLabel = formatItineraryDuration(stop.duration, stop.durationUnit)
          const metaParts = [
            durationLabel,
            stop.activityName || (stop.additionalFee ? undefined : t('tourDetail.admissionTicketIncluded')),
          ].filter(Boolean)

          return (
            <motion.div
              key={index}
              className="itinerary-stop-simple"
              {...fadeUp(index)}
            >
              <div className="itinerary-stop-simple-marker-col">
                <span className="itinerary-stop-simple-marker">{markerLabel}</span>
                {!isLast && <div className="itinerary-stop-simple-line" />}
              </div>
              <div className="itinerary-stop-simple-content">
                {displayTitle && (
                  <h3 className="itinerary-stop-simple-title">{displayTitle}</h3>
                )}
                {stop.description && (
                  <p className="itinerary-stop-simple-desc">{stop.description}</p>
                )}
                {metaParts.length > 0 && (
                  <p className="itinerary-stop-simple-meta">{metaParts.join(' \u2022 ')}</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
