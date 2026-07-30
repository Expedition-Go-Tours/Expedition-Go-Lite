import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Clock, MapPin } from 'lucide-react'
import type { ItineraryDay } from '../../lib/tourTypes'
import { formatItineraryDuration } from '../../lib/tourTypes'
import './TourItinerary.css'

interface TourItineraryProps {
  itinerary: ItineraryDay[]
}

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.4, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] as const },
})

export default function TourItinerary({ itinerary }: TourItineraryProps) {
  const { t } = useTranslation()

  if (itinerary.length === 0) {
    return (
      <section className="tour-itinerary-new">
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
      <div className="itinerary-stops-full">
        {itinerary.map((stop, index) => {
          const isLast = index === itinerary.length - 1
          const markerLabel = isLast ? t('tourDetail.end') : String(index + 1)
          const displayTitle = stop.locationName || stop.title
          const durationLabel = formatItineraryDuration(stop.duration, stop.durationUnit)

          return (
            <motion.div
              key={index}
              className="itinerary-stop"
              {...fadeUp(index)}
            >
              <div className="itinerary-stop-marker-col">
                <span className={`itinerary-stop-marker ${isLast ? 'end' : ''}`}>
                  <span className="marker-ring" />
                  <span className="marker-text">{markerLabel}</span>
                </span>
                {!isLast && <div className="itinerary-stop-line" />}
              </div>
              <div className="itinerary-stop-glass">
                <div className="itinerary-stop-content">
                  <div className="itinerary-stop-header">
                    {stop.time && (
                      <span className="itinerary-stop-time">
                        <Clock size={12} />
                        {stop.time}
                      </span>
                    )}
                    {durationLabel && (
                      <span className="itinerary-stop-duration">{durationLabel}</span>
                    )}
                    {stop.type && (
                      <span className={`itinerary-stop-badge ${stop.type}`}>
                        {stop.type === 'activity' ? t('tourDetail.activity') : t('tourDetail.transfer')}
                      </span>
                    )}
                    {stop.importance === 'major' && (
                      <span className="itinerary-stop-badge major">{t('tourDetail.highlight')}</span>
                    )}
                  </div>
                  {displayTitle && (
                    <h3 className="itinerary-stop-title">{displayTitle}</h3>
                  )}
                  {stop.title && stop.title !== displayTitle && (
                    <p className="itinerary-stop-subtitle">{stop.title}</p>
                  )}
                  {stop.description && stop.description !== displayTitle && (
                    <p className="itinerary-stop-desc">{stop.description}</p>
                  )}
                  {stop.locationAddress && (
                    <p className="itinerary-stop-address">
                      <MapPin size={12} />
                      {stop.locationAddress}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
