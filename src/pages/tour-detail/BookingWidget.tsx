import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { TourDetail, TravelerPricing } from '../../lib/tourTypes'
import { Button } from '../../components/ui/button'
import { CalendarPicker } from '../../components/ui/apple-calendar-picker'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Users, Minus, Plus, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '../../contexts/CurrencyContext'
import type { DayAvailability } from '../../lib/tourAvailability'
import SupportChatWidget from '../../components/SupportChatWidget'
import BookingTransition from '../../components/BookingTransition'
import { getApiBaseUrl, getAuthToken } from '../../lib/auth'
import './BookingWidget.css'

interface BookingWidgetProps {
  tour: TourDetail
  getAvailability?: (date: Date) => DayAvailability
}

const dropdownVariants = {
  initial: { opacity: 0, y: -8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.96 },
}

export default function BookingWidget({ tour, getAvailability: propGetAvailability }: BookingWidgetProps) {
  const { t } = useTranslation()
  const { currency, convertPrice } = useCurrency()
  const navigate = useNavigate()
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [infants, setInfants] = useState(0)
  const [showGuestSelector, setShowGuestSelector] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [showTransition, setShowTransition] = useState(false)
  const [transitVehicle, setTransitVehicle] = useState(0)
  const pendingNavState = useRef<unknown>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [pricingTotal, setPricingTotal] = useState<number | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const guestRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Pricing model straight from the supplier's Step 14 builder choices:
  // 'perGroup' means a flat price per headcount band (no per-traveler-type
  // pricing at all); 'perPerson' covers both sameForEveryone (uniform price
  // for every traveler type) and dependsOnAge (per-category, optionally tiered).
  const isPerGroup = tour.pricingModel === 'perGroup'
  const totalTravelers = adults + children + infants

  const doFetchPricing = useCallback(async (date: string) => {
    const tId = tour.id
    if (!tId) return
    setPricingLoading(true)
    try {
      const base = getApiBaseUrl()
      const token = await getAuthToken()
      const res = await fetch(`${base}/expedition/checkout/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tourId: tId,
          selectedDate: date,
          // For perGroup tours the backend just sums every traveler bucket
          // to get the total headcount for group-band matching (see
          // calculateTourPrice's perGroup branch) — the Zod schema still
          // requires the adults/children/infants shape, so the full
          // headcount is sent as `adults` and children/infants are omitted.
          travelers: isPerGroup
            ? { adults: totalTravelers }
            : { adults, children, infants },
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload.message || `Checkout API error (${res.status})`)
      }
      const data = payload.data ?? payload
      if (data.pricing) {
        setPricingTotal(data.pricing.total)
      }
    } catch {
      setPricingTotal(null)
    } finally {
      setPricingLoading(false)
    }
  }, [tour.id, adults, children, infants, isPerGroup, totalTravelers])

  const pricingFetched = useRef(false)
  useEffect(() => {
    if (!tour.id || pricingFetched.current) return
    pricingFetched.current = true
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    doFetchPricing(tomorrow.toISOString().slice(0, 10))
  }, [tour.id, doFetchPricing])

  useEffect(() => {
    if (!selectedDate) return
    doFetchPricing(selectedDate.toISOString().slice(0, 10))
  }, [selectedDate, adults, children, infants, doFetchPricing])

  const groupSizeBands = useMemo(() => tour.groupSizePricing || [], [tour.groupSizePricing])

  const travelerGroups = useMemo(() => {
    const pricing = tour.travelerPricing || []
    if (pricing.length > 0) return pricing
    return [{ label: 'Adult', price: tour.price || 0, minAge: null, maxAge: null }]
  }, [tour.travelerPricing, tour.price])

  const findGroup = (key: string): TravelerPricing | undefined =>
    travelerGroups.find((g) => new RegExp(key, 'i').test(g.label))

  const adultGroup = findGroup('adult')
  const childGroup = findGroup('child')
  const infantGroup = findGroup('infant')

  // Note: when isPerGroup, the guest dropdown only renders the "adults"
  // headcount counter (see travelerOptions below) — children/infants stay
  // at their initial 0 and are never exposed to the user in that mode, so
  // no explicit reset effect is needed.

  // A category's per-person price can depend on the TOTAL number of
  // travelers in the booking (GetYourGuide-style tiered pricing) —
  // mirrors the backend's calculateTourPrice() tier-matching logic so the
  // widget shows the same price the checkout call will actually charge.
  const resolveTierPrice = useCallback((group: TravelerPricing | undefined, fallback: number): number => {
    if (!group) return fallback
    if (group.tiers && group.tiers.length > 0) {
      const tier = group.tiers.find((t) => totalTravelers >= t.from && totalTravelers <= t.to)
      if (tier) return tier.pricePerPerson
    }
    return group.price
  }, [totalTravelers])

  const adultPrice = isPerGroup ? 0 : resolveTierPrice(adultGroup, tour.price)
  const childPrice = isPerGroup ? 0 : resolveTierPrice(childGroup, 0)
  const infantPrice = isPerGroup ? 0 : resolveTierPrice(infantGroup, 0)

  // Matching flat-rate band for the current headcount, when perGroup.
  const matchingGroupBand = useMemo(() => {
    if (!isPerGroup || groupSizeBands.length === 0) return undefined
    return groupSizeBands.find((b) => totalTravelers >= b.from && totalTravelers <= b.to)
  }, [isPerGroup, groupSizeBands, totalTravelers])

  const lowestGroupBand = useMemo(() => {
    if (groupSizeBands.length === 0) return undefined
    return [...groupSizeBands].sort((a, b) => a.price - b.price)[0]
  }, [groupSizeBands])

  const ageRangeLabel = (g?: TravelerPricing): string => {
    if (!g || (g.minAge == null && g.maxAge == null)) return ''
    if (g.minAge != null && g.maxAge != null) return `${g.minAge}-${g.maxAge} years`
    if (g.maxAge != null) return `Up to ${g.maxAge} years`
    return `${g.minAge}+ years`
  }

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

  const totalPrice = pricingTotal ?? 0
  const hasPricing = pricingTotal !== null

  const increment = (type: string) => {
    if (type === 'adults' && adults < 50) setAdults(adults + 1)
    if (type === 'children' && children < 9) setChildren(children + 1)
    if (type === 'infants' && infants < 9) setInfants(infants + 1)
  }

  const decrement = (type: string) => {
    if (type === 'adults' && adults > 1) setAdults(adults - 1)
    if (type === 'children' && children > 0) setChildren(children - 1)
    if (type === 'infants' && infants > 0) setInfants(infants - 1)
  }

  const handleBookNow = useCallback(() => {
    if (!selectedDate) {
      toast.error(t('booking.selectDateFirst'))
      return
    }

    const travelersLabel = [
      adults > 0 && `${adults} ${adults === 1 ? 'adult' : 'adults'}`,
      children > 0 && `${children} ${children === 1 ? 'child' : 'children'}`,
      infants > 0 && `${infants} ${infants === 1 ? 'infant' : 'infants'}`,
    ].filter(Boolean).join(', ')

    const dateLabel = selectedDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })

    // Stash the navigation payload, then play spinner → transition → booking.
    pendingNavState.current = {
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
    }

    // Pick the vehicle for this booking, cycling helicopter → tram → truck
    // across successive bookings (persisted so it advances each time).
    let bookingCount = 0
    try {
      bookingCount = parseInt(localStorage.getItem('eg_booking_count') || '0', 10) || 0
      localStorage.setItem('eg_booking_count', String(bookingCount + 1))
    } catch {
      /* ignore */
    }
    setTransitVehicle(bookingCount % 3)

    setIsBooking(true)
    // Spinner on the button for a moment, then reveal the travel transition.
    setTimeout(() => setShowTransition(true), 1100)
  }, [selectedDate, t, tour, adults, children, infants, totalPrice])

  const handleTransitionDone = useCallback(() => {
    navigate('/booking', { state: pendingNavState.current })
  }, [navigate])

  const handleApplyPromo = () => {
    const code = promoCode.trim()
    if (!code) return
    if (code.length !== 8) {
      setPromoError(t('booking.promoLengthError'))
      return
    }
    if (!/^[A-Z0-9]+$/.test(code)) {
      setPromoError(t('booking.promoFormatError'))
      return
    }
    setPromoApplied(true)
    setPromoError('')
    toast.success(t('booking.promoApplied'))
  }

  const formatPrice = (val: number) => val > 0 ? `${currency.symbol}${val}` : t('booking.free')

  const travelerOptions = isPerGroup
    ? [
        { label: t('booking.travelers'), age: t('booking.perGroupHeadcount', 'Group headcount'), price: matchingGroupBand ? formatPrice(matchingGroupBand.price) : '', count: adults, key: 'adults' },
      ]
    : [
        { label: t('booking.adults'), age: ageRangeLabel(adultGroup) || t('booking.ageAdult'), price: formatPrice(adultPrice), count: adults, key: 'adults' },
        { label: t('booking.children'), age: ageRangeLabel(childGroup) || t('booking.ageChild'), price: childPrice > 0 ? formatPrice(childPrice) : t('booking.free'), count: children, key: 'children' },
        { label: t('booking.infants'), age: ageRangeLabel(infantGroup) || t('booking.ageInfant'), price: infantPrice > 0 ? formatPrice(infantPrice) : t('booking.free'), count: infants, key: 'infants' },
      ]

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : t('tourDetail.selectDate')

  return (
    <div className="booking-widget-desktop">
      <div className="booking-widget-card">
          <div className="booking-price-section">
          <div className="booking-price-main">
            {isPerGroup ? (
              lowestGroupBand ? (
                <>
                  <span className="booking-price-from">{t('common.from')}</span>
                  <span className="booking-price-amount">
                    {`${currency.symbol}${Math.round(convertPrice(lowestGroupBand.price))}`}
                  </span>
                  <span className="booking-price-per">{t('booking.perGroup', 'per group')}</span>
                </>
              ) : null
            ) : tour.price > 0 ? (
              <>
                <span className="booking-price-from">{t('common.from')}</span>
                <span className="booking-price-amount">
                  {hasPricing && adultPrice > 0
                    ? `${currency.symbol}${Math.round(convertPrice(adultPrice))}`
                    : pricingLoading
                      ? '...'
                      : `${currency.symbol}${Math.round(convertPrice(tour.price))}`}
                </span>
                <span className="booking-price-per">{t('tourDetail.perPerson')}</span>
              </>
            ) : null}
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
                    getAvailability={(date) => {
                      const avail = propGetAvailability ? propGetAvailability(date) : 'available'
                      return avail
                    }}
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
              <span>{totalTravelers} {t('booking.traveler', { count: totalTravelers })}</span>
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
                  {isPerGroup && groupSizeBands.length > 0 && (
                    <div className="group-size-bands">
                      {groupSizeBands
                        .slice()
                        .sort((a, b) => a.from - b.from)
                        .map((band, i) => {
                          const isActive = totalTravelers >= band.from && totalTravelers <= band.to
                          const rangeLabel = Number.isFinite(band.to) ? `${band.from}-${band.to}` : `${band.from}+`
                          return (
                            <div
                              key={i}
                              className={`group-size-band${isActive ? ' group-size-band-active' : ''}`}
                            >
                              <span>{t('booking.groupOf', 'Group of {{range}}', { range: rangeLabel })}</span>
                              <span className="group-size-band-price">{formatPrice(band.price)}</span>
                            </div>
                          )
                        })}
                    </div>
                  )}
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
          {(isPerGroup ? matchingGroupBand != null : tour.price > 0) && totalTravelers > 0 && (
            <div className="booking-total">
              <span>{isPerGroup ? t('booking.groupTotal', 'Group total') : t('booking.total', { count: totalTravelers })}</span>
              <span className="booking-total-amount">
                {hasPricing
                  ? `${currency.symbol}${Math.round(convertPrice(totalPrice))}`
                  : pricingLoading
                    ? '...'
                    : isPerGroup
                      ? (matchingGroupBand ? `${currency.symbol}${Math.round(convertPrice(matchingGroupBand.price))}` : '...')
                      : `${currency.symbol}${Math.round(convertPrice(tour.price * totalTravelers))}`}
              </span>
            </div>
          )}

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
                {t('booking.apply')}
              </button>
            </div>
            {promoError && <p className="booking-promo-error">{promoError}</p>}
            {promoApplied && <p className="booking-promo-success">{t('booking.promoApplied')}</p>}
          </div>

          {/* Submit */}
          <Button
            className="booking-submit-btn"
            onClick={handleBookNow}
            disabled={isBooking}
          >
            {isBooking ? (
              <span className="booking-btn-loader">
                <svg className="booking-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                {t('booking.checking')}
              </span>
            ) : (
              t('tourDetail.bookNow')
            )}
          </Button>

          {/* Assistance */}
          <div className="booking-assistance">
            <p className="booking-assistance-title">{t('tourDetail.needFurtherAssistance')}</p>
            <button type="button" className="booking-assistance-btn" onClick={() => setShowChat(true)}>
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
      {showChat && <SupportChatWidget initialOpen />}

      <AnimatePresence>
        {showTransition && (
          <BookingTransition onDone={handleTransitionDone} vehicleIndex={transitVehicle} />
        )}
      </AnimatePresence>
    </div>
  )
}
