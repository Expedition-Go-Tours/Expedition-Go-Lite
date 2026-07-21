import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { TourDetail } from '../../lib/tourTypes'
import { Button } from '../../components/ui/button'
import { CalendarPicker } from '../../components/ui/apple-calendar-picker'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Users, Minus, Plus, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import './BookingWidget.css'

interface BookingWidgetProps {
  tour: TourDetail
}

const dropdownVariants = {
  initial: { opacity: 0, y: -8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.96 },
}

export default function BookingWidget({ tour }: BookingWidgetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [adults, setAdults] = useState(2)
  const [seniors, setSeniors] = useState(0)
  const [youths, setYouths] = useState(0)
  const [children, setChildren] = useState(0)
  const [infants, setInfants] = useState(0)
  const [showGuestSelector, setShowGuestSelector] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoError, setPromoError] = useState('')
  const guestRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        showGuestSelector &&
        guestRef.current &&
        !guestRef.current.contains(target)
      ) {
        setShowGuestSelector(false)
      }
      if (
        showCalendar &&
        calendarRef.current &&
        !calendarRef.current.contains(target)
      ) {
        setShowCalendar(false)
      }
    }
    if (showGuestSelector || showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showGuestSelector, showCalendar])

  const totalTravelers = adults + seniors + youths + children + infants
  const adultPrice = tour.price
  const seniorPrice = tour.price
  const youthPrice = Math.round(tour.price * 0.7)
  const childPrice = Math.round(tour.price * 0.6)
  const infantPrice = 0
  const totalPrice =
    adults * adultPrice +
    seniors * seniorPrice +
    youths * youthPrice +
    children * childPrice +
    infants * infantPrice

  const increment = (type: string) => {
    if (type === 'adults' && adults < 9) setAdults(adults + 1)
    if (type === 'seniors' && seniors < 9) setSeniors(seniors + 1)
    if (type === 'youths' && youths < 9) setYouths(youths + 1)
    if (type === 'children' && children < 9) setChildren(children + 1)
    if (type === 'infants' && infants < 9) setInfants(infants + 1)
  }

  const decrement = (type: string) => {
    if (type === 'adults' && adults > 1) setAdults(adults - 1)
    if (type === 'seniors' && seniors > 0) setSeniors(seniors - 1)
    if (type === 'youths' && youths > 0) setYouths(youths - 1)
    if (type === 'children' && children > 0) setChildren(children - 1)
    if (type === 'infants' && infants > 0) setInfants(infants - 1)
  }

  useEffect(() => {
    setIsAvailable(false)
  }, [selectedDate])

  const handleCheckAvailability = useCallback(() => {
    if (isAvailable) {
      const travelersLabel = [
        adults > 0 && `${adults} ${adults === 1 ? 'adult' : 'adults'}`,
        seniors > 0 && `${seniors} ${seniors === 1 ? 'senior' : 'seniors'}`,
        youths > 0 && `${youths} ${youths === 1 ? 'youth' : 'youths'}`,
        children > 0 && `${children} ${children === 1 ? 'child' : 'children'}`,
        infants > 0 && `${infants} ${infants === 1 ? 'infant' : 'infants'}`,
      ].filter(Boolean).join(', ')

      const dateLabel = selectedDate
        ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        : ''

      navigate('/booking', {
        state: {
          tour: {
            title: tour.title,
            image: tour.images?.[0] || '',
            provider: 'Expedition GO Tours',
            rating: tour.rating,
            reviews: tour.reviewCount,
            date: dateLabel,
            time: '9:00 AM',
            duration: tour.duration,
            travelers: travelersLabel,
            price: totalPrice,
            cancellation: tour.cancellationPolicy || 'Free cancellation up to 24 hours before',
            language: tour.languages?.[0] || 'English',
          },
        },
      })
      return
    }

    if (!selectedDate) {
      toast.error('Please select a date first')
      return
    }
    setIsChecking(true)
    setTimeout(() => {
      setIsChecking(false)
      setIsAvailable(true)
      toast.success('Date is available!')
    }, 1500)
  }, [selectedDate, isAvailable, tour, adults, seniors, youths, children, infants, totalPrice, navigate])

  const handleApplyPromo = () => {
    const code = promoCode.trim()
    if (!code) return
    if (code.length !== 8) {
      setPromoError('Promo code must be exactly 8 characters.')
      return
    }
    if (!/^[A-Z0-9]+$/.test(code)) {
      setPromoError('Promo code must contain only uppercase letters and numbers.')
      return
    }
    setPromoApplied(true)
    setPromoError('')
    toast.success('Promo code applied!')
  }

  const travelerOptions = [
    { label: 'Adults', age: 'Age 18 - 60', price: `$${adultPrice}`, count: adults, key: 'adults' },
    { label: 'Seniors', age: 'Age 61 - 80', price: `$${seniorPrice}`, count: seniors, key: 'seniors' },
    { label: 'Youths', age: 'Age 15 - 17', price: `$${youthPrice}`, count: youths, key: 'youths' },
    { label: 'Children', age: 'Age 4 - 14', price: `$${childPrice}`, count: children, key: 'children' },
    { label: 'Infants', age: 'Age 1 - 3', price: infantPrice > 0 ? `$${infantPrice}` : 'Free', count: infants, key: 'infants' },
  ]

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : t('tourDetail.selectDate')

  return (
    <div className="booking-widget-desktop">
      <div className="booking-widget-card">
        <div className="booking-price-section">
          <div className="booking-price-main">
            <span className="booking-price-from">{t('common.from')}</span>
            <span className="booking-price-amount">${tour.price}</span>
            <span className="booking-price-per">/person</span>
          </div>
        </div>

        <div className="booking-form">
          {/* Date selector */}
          <div className="booking-field" ref={calendarRef}>
            <label className="booking-label">
              <CalendarDays size={18} />
              {t('tourDetail.selectDate')}
            </label>
            <button
              type="button"
              className="booking-input"
              onClick={() => { setShowCalendar((v) => !v); setShowGuestSelector(false) }}
              aria-expanded={showCalendar}
            >
              <span>{selectedDateLabel}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  key="calendar-dropdown"
                  variants={dropdownVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50 }}
                >
                  <CalendarPicker
                    isOpen={showCalendar}
                    onClose={() => setShowCalendar(false)}
                    onDateSelect={(date) => setSelectedDate(date)}
                    selectedDate={selectedDate}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Guest selector */}
          <div className="booking-field" ref={guestRef}>
            <label className="booking-label">
              <Users size={18} />
              {t('booking.travelers')}
            </label>
            <button
              type="button"
              className="booking-input"
              onClick={() => { setShowGuestSelector((v) => !v); setShowCalendar(false) }}
              aria-expanded={showGuestSelector}
            >
              <span>{totalTravelers} {totalTravelers === 1 ? 'traveler' : 'travelers'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <AnimatePresence>
              {showGuestSelector && (
                <motion.div
                  key="guest-dropdown"
                  variants={dropdownVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="guest-selector-dropdown"
                >
                  {travelerOptions.map((opt) => {
                    const canDecrement = opt.key === 'adults' ? opt.count > 1 : opt.count > 0
                    return (
                      <div key={opt.key} className="guest-type">
                        <div className="guest-type-info">
                          <span className="guest-type-label">{opt.label}</span>
                          <span className="guest-type-desc">{opt.age}</span>
                        </div>
                        <div className="guest-type-controls">
                          <button
                            className="guest-btn"
                            onClick={() => decrement(opt.key)}
                            disabled={!canDecrement}
                            aria-label={`Remove one ${opt.label}`}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="guest-count">{opt.count}</span>
                          <button
                            className="guest-btn"
                            onClick={() => increment(opt.key)}
                            aria-label={`Add one ${opt.label}`}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Total */}
          <div className="booking-total">
            <span>Total ({totalTravelers} {totalTravelers === 1 ? 'traveler' : 'travelers'})</span>
            <span className="booking-total-amount">${totalPrice.toFixed(2)}</span>
          </div>

          {/* Promo code */}
          <div className="booking-promo">
            <div className="booking-promo-row">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase())
                  setPromoApplied(false)
                  setPromoError('')
                }}
                placeholder={t('booking.promoCode')}
                maxLength={8}
                className="booking-promo-input"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="booking-promo-btn"
              >
                Apply
              </button>
            </div>
            {promoError && <p className="booking-promo-error">{promoError}</p>}
            {promoApplied && <p className="booking-promo-success">Promo code applied!</p>}
          </div>

          {/* Submit */}
          <Button
            className="booking-submit-btn"
            onClick={handleCheckAvailability}
            disabled={isChecking}
          >
            {isChecking ? (
              <span className="booking-btn-loader">
                <svg className="booking-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                Checking...
              </span>
            ) : (
              t('tourDetail.bookNow')
            )}
          </Button>

          {/* Assistance */}
          <div className="booking-assistance">
            <p className="booking-assistance-title">{t('tourDetail.needFurtherAssistance')}</p>
            <button type="button" className="booking-assistance-btn">
              <MessageSquare size={16} />
              {t('tourDetail.startChat')}
            </button>
          </div>
        </div>

        <div className="booking-footer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{t('tourDetail.freeCancellation')}</span>
        </div>
      </div>
    </div>
  )
}
