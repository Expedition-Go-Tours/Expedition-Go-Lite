import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ItineraryDay } from '../../lib/tourTypes'
import './TourItinerary.css'

interface TourItineraryProps {
  itinerary: ItineraryDay[]
}

export default function TourItinerary({ itinerary }: TourItineraryProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(0)

  const toggleDay = (day: number) => {
    setExpandedDay(expandedDay === day ? null : day)
  }

  return (
    <section className="tour-itinerary">
      <h2 className="tour-section-title">Itinerary</h2>
      
      <div className="itinerary-list">
        {itinerary.map((day, index) => {
          const isExpanded = expandedDay === index
          const isLast = index === itinerary.length - 1

          return (
            <div key={index} className={`itinerary-day ${isExpanded ? 'expanded' : ''}`}>
              <button
                className="itinerary-header"
                onClick={() => toggleDay(index)}
                aria-expanded={isExpanded}
              >
                <div className="itinerary-header-left">
                  <span className="itinerary-day-badge">Day {day.day}</span>
                  <h3 className="itinerary-day-title">{day.title}</h3>
                </div>
                <motion.svg
                  className="itinerary-chevron"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </motion.svg>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    className="itinerary-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="itinerary-content-inner">
                      {day.image && (
                        <div className="itinerary-image">
                          <img src={day.image} alt={day.title} />
                        </div>
                      )}
                      
                      <p className="itinerary-description">{day.description}</p>
                      
                      {day.duration && (
                        <div className="itinerary-meta">
                          <span className="itinerary-meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {day.duration}
                          </span>
                        </div>
                      )}
                      
                      {day.activities && day.activities.length > 0 && (
                        <div className="itinerary-activities">
                          <h4>Activities</h4>
                          <ul>
                            {day.activities.map((activity, idx) => (
                              <li key={idx}>{activity}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {day.meals && day.meals.length > 0 && (
                        <div className="itinerary-meals">
                          <h4>Meals Included</h4>
                          <div className="meals-badges">
                            {day.meals.map((meal, idx) => (
                              <span key={idx} className="meal-badge">{meal}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isLast && <div className="itinerary-connector" />}
            </div>
          )
        })}
      </div>
    </section>
  )
}
