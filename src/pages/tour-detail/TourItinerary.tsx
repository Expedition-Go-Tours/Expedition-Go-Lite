import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { ItineraryDay } from '../../lib/tourTypes'
import TourLocationMap from './TourLocationMap'
import './TourItinerary.css'

interface TourItineraryProps {
  itinerary: ItineraryDay[]
  coordinates?: { lat: number; lng: number }
  location?: string
  title?: string
}

export default function TourItinerary({
  itinerary,
  coordinates,
  location,
  title,
}: TourItineraryProps) {
  const { t } = useTranslation()
  const [focusedStopIndex, setFocusedStopIndex] = useState<number | null>(null)

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
      <div className="itinerary-layout">
        <div className="itinerary-stops">
          {itinerary.map((stop, index) => {
            const isLast = index === itinerary.length - 1
            const markerLabel = isLast ? t('tourDetail.end') : String(index + 1)
            const hasLocation = Boolean(coordinates)
            const isFocused = focusedStopIndex === index

            return (
              <div key={index} className="itinerary-stop">
                <div className="itinerary-stop-marker-col">
                  {hasLocation ? (
                    <button
                      type="button"
                      onClick={() => setFocusedStopIndex(isFocused ? null : index)}
                      className={`itinerary-stop-marker ${isLast ? 'end' : ''} ${isFocused ? 'focused' : ''}`}
                      aria-label={`Show stop ${markerLabel} on map`}
                      aria-pressed={isFocused}
                    >
                      {markerLabel}
                    </button>
                  ) : (
                    <span className={`itinerary-stop-marker ${isLast ? 'end' : ''}`}>
                      {markerLabel}
                    </span>
                  )}
                  {!isLast && <div className="itinerary-stop-line" />}
                </div>
                <div className="itinerary-stop-content">
                  {stop.duration && (
                    <p className="itinerary-stop-meta">{stop.duration}</p>
                  )}
                  {stop.title && (
                    <h3 className="itinerary-stop-title">{stop.title}</h3>
                  )}
                  {stop.description && (
                    <p className="itinerary-stop-desc">{stop.description}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {coordinates && (
          <aside className="itinerary-map-sidebar">
            <TourLocationMap
              coordinates={coordinates}
              location={location || ''}
              title={title || ''}
            />
          </aside>
        )}
      </div>
    </motion.section>
  )
}
