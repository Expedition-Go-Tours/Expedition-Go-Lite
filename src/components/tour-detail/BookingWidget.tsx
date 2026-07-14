import { useState, useRef, useEffect } from 'react'
import type { TourDetail } from '../../lib/tourTypes'
import { Button } from '../ui/button'
import { CalendarPicker } from '../ui/apple-calendar-picker'
import './BookingWidget.css'

interface BookingWidgetProps {
  tour: TourDetail
}

export default function BookingWidget({ tour }: BookingWidgetProps) {
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [infants, setInfants] = useState(0)
  const [showGuestSelector, setShowGuestSelector] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const guestRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (guestRef.current && !guestRef.current.contains(e.target as Node)) {
        setShowGuestSelector(false)
      }
    }
    if (showGuestSelector) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showGuestSelector])

  const totalGuests = adults + children + infants
  const totalPrice = tour.price * (adults + children * 0.5) // Children half price, infants free

  const increment = (type: 'adults' | 'children' | 'infants') => {
    if (totalGuests >= tour.groupSize) return
    
    if (type === 'adults') setAdults(adults + 1)
    if (type === 'children') setChildren(children + 1)
    if (type === 'infants') setInfants(infants + 1)
  }

  const decrement = (type: 'adults' | 'children' | 'infants') => {
    if (type === 'adults' && adults > 1) setAdults(adults - 1)
    if (type === 'children' && children > 0) setChildren(children - 1)
    if (type === 'infants' && infants > 0) setInfants(infants - 1)
  }

  return (
    <>
      {/* Mobile Fixed Bottom Bar */}
      <div className="booking-widget-mobile">
        <div className="booking-mobile-price">
          <span className="booking-mobile-from">From</span>
          <span className="booking-mobile-amount">${tour.price}</span>
          <span className="booking-mobile-per">/person</span>
        </div>
        <Button className="booking-mobile-btn">
          Check Availability
        </Button>
      </div>

      {/* Desktop Sticky Sidebar */}
      <div className="booking-widget-desktop">
        <div className="booking-widget-card">
          <div className="booking-price-section">
            <div className="booking-price-main">
              <span className="booking-price-from">From</span>
              <span className="booking-price-amount">${tour.price}</span>
              <span className="booking-price-per">/person</span>
            </div>
          </div>

          <div className="booking-form">
            <div className="booking-field">
              <label className="booking-label">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Select Date
              </label>
              <button className="booking-input" onClick={() => setShowCalendar(true)}>
                <span>{selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Choose a date'}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <CalendarPicker
                isOpen={showCalendar}
                onClose={() => setShowCalendar(false)}
                onDateSelect={(date) => setSelectedDate(date)}
                selectedDate={selectedDate}
              />
            </div>

            {/* Guest field */}
            <div className="booking-field" ref={guestRef}>
              <label className="booking-label">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Guests
              </label>
              <button 
                className="booking-input"
                onClick={() => setShowGuestSelector(!showGuestSelector)}
              >
                <span>{totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showGuestSelector && (
                <div className="guest-selector-dropdown">
                  <div className="guest-type">
                    <div className="guest-type-info">
                      <span className="guest-type-label">Adults</span>
                      <span className="guest-type-desc">Age 13+</span>
                    </div>
                    <div className="guest-type-controls">
                      <button 
                        className="guest-btn"
                        onClick={() => decrement('adults')}
                        disabled={adults <= 1}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      <span className="guest-count">{adults}</span>
                      <button 
                        className="guest-btn"
                        onClick={() => increment('adults')}
                        disabled={totalGuests >= tour.groupSize}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="guest-type">
                    <div className="guest-type-info">
                      <span className="guest-type-label">Children</span>
                      <span className="guest-type-desc">Age 2-12</span>
                    </div>
                    <div className="guest-type-controls">
                      <button 
                        className="guest-btn"
                        onClick={() => decrement('children')}
                        disabled={children <= 0}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      <span className="guest-count">{children}</span>
                      <button 
                        className="guest-btn"
                        onClick={() => increment('children')}
                        disabled={totalGuests >= tour.groupSize}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="guest-type">
                    <div className="guest-type-info">
                      <span className="guest-type-label">Infants</span>
                      <span className="guest-type-desc">Under 2</span>
                    </div>
                    <div className="guest-type-controls">
                      <button 
                        className="guest-btn"
                        onClick={() => decrement('infants')}
                        disabled={infants <= 0}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      <span className="guest-count">{infants}</span>
                      <button 
                        className="guest-btn"
                        onClick={() => increment('infants')}
                        disabled={totalGuests >= tour.groupSize}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {totalGuests >= tour.groupSize && (
                    <div className="guest-limit-notice">
                      Maximum group size: {tour.groupSize} guests
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="booking-total">
              <span>Total</span>
              <span className="booking-total-amount">${totalPrice.toFixed(2)}</span>
            </div>

            <Button className="booking-submit-btn">
              Check Availability
            </Button>
          </div>

          <div className="booking-footer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Free cancellation up to 24 hours before</span>
          </div>
        </div>
      </div>

    </>
  )
}
