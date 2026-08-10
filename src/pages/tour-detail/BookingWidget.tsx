import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { TourDetail, TravelerPricing } from '../../lib/tourTypes'
import { Button } from '../../components/ui/button'
import { CalendarPicker } from '../../components/ui/apple-calendar-picker'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Users, Minus, Plus, MessageSquare, Clock as ClockIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '../../contexts/CurrencyContext'
import type { DayAvailability, DayAvailabilityInfo } from '../../lib/tourAvailability'
import {
  clampGroupHeadcount,
  groupBandLabel,
  groupPricingRange,
} from '../../lib/groupPricing'
import { findActiveTier, hasTieredPricing, resolveTierPrice, tierRangeLabel } from '../../lib/tierPricing'
import { categoryKey, sumCountsToBuckets } from '../../lib/travelerBuckets'
import { validatePassengerMix } from '../../lib/passengerMix'
import SupportChatWidget from '../../components/SupportChatWidget'
import BookingTransition from '../../components/BookingTransition'
import { fetchWithAuth } from '../../lib/api'
import './BookingWidget.css'

interface BookingWidgetProps {
  tour: TourDetail
  getAvailability?: (date: Date) => DayAvailability
  getDayInfo?: (date: Date) => DayAvailabilityInfo | undefined
  availabilityLoading?: boolean
  onMonthChange?: (year: number, month: number) => void
}

interface PricingResult {
  currency?: string
  subtotal: number
  fees: number
  discounts: number
  total: number
}

const dropdownVariants = {
  initial: { opacity: 0, y: -8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.96 },
}

/** Seed the per-category counts: the first adult-like category defaults to 2, all others 0. */
function defaultCountsFor(categories: TravelerPricing[]): Record<string, number> {
  const counts: Record<string, number> = {}
  const primary = categories.findIndex((g) => /adult/i.test(g.label))
  const adultIdx = primary >= 0 ? primary : 0
  categories.forEach((g, i) => {
    counts[categoryKey(g.label)] = i === adultIdx ? 2 : 0
  })
  return counts
}

export default function BookingWidget({ tour, getAvailability: propGetAvailability, getDayInfo, availabilityLoading, onMonthChange }: BookingWidgetProps) {
  const { t } = useTranslation()
  const { currency, convertPrice } = useCurrency()
  const navigate = useNavigate()
  const [showGuestSelector, setShowGuestSelector] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [showTransition, setShowTransition] = useState(false)
  const [transitVehicle, setTransitVehicle] = useState(0)
  const pendingNavState = useRef<unknown>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [groupHeadcount, setGroupHeadcount] = useState(2)
  const guestRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Pricing model straight from the supplier's Step 14 builder choices:
  // 'perGroup' means a flat price per headcount band (no per-traveler-type
  // pricing at all); 'perPerson' covers both sameForEveryone (uniform price
  // for every traveler type) and dependsOnAge (per-category, optionally tiered).
  const isPerGroup = tour.pricingModel === 'perGroup'

  const groupSizeBands = useMemo(() => tour.groupSizePricing || [], [tour.groupSizePricing])

  const travelerGroups = useMemo(() => {
    const pricing = tour.travelerPricing || []
    if (pricing.length > 0) return pricing
    return [{ label: 'Adult', price: tour.price || 0, minAge: null, maxAge: null }]
  }, [tour.travelerPricing, tour.price])

  // Seed the dynamic per-category counts once the categories are available.
  const [prevCategories, setPrevCategories] = useState<TravelerPricing[]>([])
  if (!isPerGroup && travelerGroups.length > 0 && prevCategories !== travelerGroups) {
    setPrevCategories(travelerGroups)
    setCategoryCounts(defaultCountsFor(travelerGroups))
  }

  const totalTravelers = useMemo(() => {
    if (isPerGroup) return groupHeadcount
    return Object.values(categoryCounts).reduce((s, c) => s + (typeof c === 'number' && c > 0 ? c : 0), 0)
  }, [isPerGroup, groupHeadcount, categoryCounts])

  const travelersPayload = useMemo(() => {
    if (isPerGroup) return { adults: totalTravelers }
    return sumCountsToBuckets(categoryCounts)
  }, [isPerGroup, totalTravelers, categoryCounts])

  const doFetchPricing = useCallback(async (date: string, time?: string | null) => {
    const tId = tour.id
    if (!tId) return
    setPricingLoading(true)
    try {
      const res = await fetchWithAuth('/expedition/checkout/calculate', {
        method: 'POST',
        body: JSON.stringify({
          tourId: tId,
          selectedDate: date,
          // Fixed-slot tours must carry a concrete time slot or the backend
          // rejects the check ("A time slot must be selected").
          ...(time ? { selectedTime: time } : {}),
          // The checkout schema accepts arbitrary traveler-count keys; the
          // dynamic per-category counts (incl. seniors, students, …) are
          // sent under their own keys so the backend prices each at its own
          // rate instead of folding them into adults.
          travelers: travelersPayload,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload.message || `Checkout API error (${res.status})`)
      }
      const data = payload.data ?? payload
      if (data.pricing) {
        setPricingResult({
          currency: data.pricing.currency,
          subtotal: Number(data.pricing.subtotal) || 0,
          fees: Number(data.pricing.fees) || 0,
          discounts: Number(data.pricing.discounts) || 0,
          total: Number(data.pricing.total) || 0,
        })
      }
    } catch {
      setPricingResult(null)
    } finally {
      setPricingLoading(false)
    }
  }, [tour.id, travelersPayload])

  const pricingFetched = useRef(false)
  useEffect(() => {
    if (!tour.id || pricingFetched.current) return
    pricingFetched.current = true
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    doFetchPricing(tomorrow.toISOString().slice(0, 10))
  }, [tour.id, doFetchPricing])

  // Auto-refresh the real-time price when the date or traveler mix changes
  // (Viator re-checks on date+pax selection). Debounced so +/- taps don't
  // hammer the API; the manual Update button still forces an immediate check.
  const [priceUpdated, setPriceUpdated] = useState(false)
  const lastShownTotal = useRef<number | null>(null)
  useEffect(() => {
    if (!selectedDate) return
    const timer = setTimeout(() => {
      doFetchPricing(selectedDate.toISOString().slice(0, 10), selectedTime)
    }, 400)
    return () => clearTimeout(timer)
  }, [selectedDate, selectedTime, travelersPayload, doFetchPricing])

  // Surface a changed total after a background refresh so the traveler knows
  // the price they see now reflects the latest availability/rate.
  useEffect(() => {
    if (pricingResult == null) return
    if (lastShownTotal.current != null && lastShownTotal.current !== pricingResult.total) {
      setPriceUpdated(true)
    }
    lastShownTotal.current = pricingResult.total
  }, [pricingResult])

  const adultGroup = travelerGroups.find((g) => /adult/i.test(g.label))

  // A category's per-person price can depend on the TOTAL number of travelers
  // in the booking (GetYourGuide-style tiered pricing) — mirrors the backend's
  // calculateTourPrice() tier-matching logic (see lib/tierPricing.ts) so the
  // widget shows the same price the checkout call will actually charge.
  const unitPriceFor = useCallback(
    (g: TravelerPricing) => resolveTierPrice(g, totalTravelers, g.price ?? 0),
    [totalTravelers]
  )
  const activeTierFor = useCallback(
    (g: TravelerPricing) => findActiveTier(g, totalTravelers),
    [totalTravelers]
  )

  // Matching flat-rate band for the current headcount, when perGroup.
  const matchingGroupBand = useMemo(() => {
    if (!isPerGroup || groupSizeBands.length === 0) return undefined
    return groupSizeBands.find((b) => totalTravelers >= b.from && totalTravelers <= b.to)
  }, [isPerGroup, groupSizeBands, totalTravelers])

  const lowestGroupBand = useMemo(() => {
    if (groupSizeBands.length === 0) return undefined
    return [...groupSizeBands].sort((a, b) => a.price - b.price)[0]
  }, [groupSizeBands])

  // For per-group pricing the supplier defines flat headcount bands (e.g.
  // "Group of 1-2", "Group of 3-5"), and the checkout fails when the selected
  // headcount falls outside every band. Mirror Viator: clamp the headcount
  // into the valid band range so a price is always resolvable, and expose the
  // band boundaries so the +/- stepper stops at the edges.
  const { min: groupMinHeadcount, max: groupMaxHeadcount } = useMemo(
    () => groupPricingRange(groupSizeBands),
    [groupSizeBands]
  )

  const activeGroupBandLabel = useMemo(
    () => groupBandLabel(matchingGroupBand),
    [matchingGroupBand]
  )

  // Snap the headcount into the valid band range whenever the bands load or
  // the pricing model changes, so the widget never presents an unpriceable
  // headcount (which the checkout would reject). React-recommended "adjust
  // state during render" pattern — guarded so it only runs when the bands
  // actually change.
  const [prevGroupBands, setPrevGroupBands] = useState(groupSizeBands)
  if (isPerGroup && groupSizeBands.length > 0 && prevGroupBands !== groupSizeBands) {
    setPrevGroupBands(groupSizeBands)
    setGroupHeadcount((prev) => clampGroupHeadcount(prev, groupSizeBands))
  }

  const ageRangeLabel = (g?: TravelerPricing): string => {
    if (!g || (g.minAge == null && g.maxAge == null)) return ''
    if (g.minAge != null && g.maxAge != null) return `${g.minAge}-${g.maxAge} years`
    if (g.maxAge != null) return `Up to ${g.maxAge} years`
    return `${g.minAge}+ years`
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
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
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showGuestSelector, showCalendar])

  const totalPrice = pricingResult?.total ?? 0
  const hasPricing = pricingResult !== null

  // Client-side subtotal — mirrors what checkout will charge before any
  // discount. Used as the displayed subtotal until the API answers.
  const clientSubtotal = useMemo(() => {
    if (isPerGroup) return matchingGroupBand?.price ?? 0
    return travelerGroups.reduce((sum, g) => {
      const count = categoryCounts[categoryKey(g.label)] ?? 0
      return sum + (count > 0 ? unitPriceFor(g) * count : 0)
    }, 0)
  }, [isPerGroup, travelerGroups, categoryCounts, matchingGroupBand, unitPriceFor])

  // Passenger-mix rules (Viator parity): total min/max, disallowed categories,
  // and requires-adult supervision. Invalid mixes are surfaced and the "+"
  // steppers are disabled so a party can never be configured that checkout
  // would reject.
  const mixBounds = useMemo(
    () => ({ min: tour.minParticipants ?? null, max: tour.maxParticipants ?? null }),
    [tour.minParticipants, tour.maxParticipants]
  )
  const mixIssues = useMemo(
    () => (isPerGroup ? [] : validatePassengerMix(travelerGroups, categoryCounts, mixBounds)),
    [isPerGroup, travelerGroups, categoryCounts, mixBounds]
  )
  const canAddCount = (key: string) => {
    const category = travelerGroups.find((g) => categoryKey(g.label) === key)
    if (category?.notAllowed) return false
    if (mixBounds.max != null && totalTravelers >= mixBounds.max) return false
    if (category?.needsAdult && !mixIssues.some((i) => i.type === 'needsAdult')) return false
    // Simulate the addition and check the rules still pass.
    const next = { ...categoryCounts, [key]: (categoryCounts[key] ?? 0) + 1 }
    return validatePassengerMix(travelerGroups, next, mixBounds).length === 0
  }

  const increment = (key: string) => {
    if (isPerGroup) {
      if (groupHeadcount < groupMaxHeadcount) setGroupHeadcount(groupHeadcount + 1)
      return
    }
    if (!canAddCount(key)) return
    const category = travelerGroups.find((g) => categoryKey(g.label) === key)
    const isAdultLike = category ? /adult/i.test(category.label) : false
    const max = isAdultLike ? 50 : 9
    setCategoryCounts((prev) => ({
      ...prev,
      [key]: Math.min((prev[key] ?? 0) + 1, max),
    }))
  }

  const decrement = (key: string) => {
    if (isPerGroup) {
      if (groupHeadcount > groupMinHeadcount) setGroupHeadcount(groupHeadcount - 1)
      return
    }
    const category = travelerGroups.find((g) => categoryKey(g.label) === key)
    const isAdultLike = category ? /adult/i.test(category.label) : false
    const min = isAdultLike ? 1 : 0
    setCategoryCounts((prev) => ({
      ...prev,
      [key]: Math.max((prev[key] ?? 0) - 1, min),
    }))
  }

  const getSelectedDayInfo = useCallback((date: Date | null | undefined): DayAvailabilityInfo | undefined => {
    if (!date || !getDayInfo) return undefined
    return getDayInfo(date)
  }, [getDayInfo])

  const formatSlotTime = (time: string): string => {
    const [h, m] = time.split(':').map((n) => parseInt(n, 10))
    if (!Number.isFinite(h)) return time
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 === 0 ? 12 : h % 12
    return m ? `${hour12}:${String(m).padStart(2, '0')} ${period}` : `${hour12} ${period}`
  }

  const handleBookNow = useCallback(() => {
    if (!selectedDate) {
      toast.error(t('booking.selectDateFirst'))
      return
    }

    const selectedDay = selectedDate ? getSelectedDayInfo(selectedDate) : undefined
    const daySlots = selectedDay?.timeSlots?.length ? selectedDay.timeSlots : []
    if (daySlots.length > 0 && !selectedTime) {
      toast.error(t('booking.selectTimeFirst', 'Please select a time slot'))
      return
    }

    const travelersLabel = isPerGroup
      ? `${groupHeadcount} ${groupHeadcount === 1 ? 'traveler' : 'travelers'}`
      : travelerGroups
          .filter((g) => (categoryCounts[categoryKey(g.label)] ?? 0) > 0)
          .map((g) => {
            const count = categoryCounts[categoryKey(g.label)]
            return `${count} ${g.label.toLowerCase()}${count === 1 ? '' : 's'}`
          })
          .join(', ')

    const dateLabel = selectedDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })

    const dateISO = selectedDate.toISOString().slice(0, 10)

    // Stash the navigation payload, then play spinner → transition → booking.
    pendingNavState.current = {
      tour: {
        id: tour.id,
        slug: tour.slug,
        title: tour.title,
        image: tour.images?.[0] || '',
        provider: 'Expedition GO Tours',
        rating: tour.rating,
        reviews: tour.reviewCount,
        date: dateLabel,
        dateISO,
        time: selectedTime ? formatSlotTime(selectedTime) : '9:00 AM',
        duration: tour.duration,
        travelers: travelersLabel,
        travelersCount: travelersPayload,
        adults: travelersPayload.adults || 0,
        children: travelersPayload.children || 0,
        infants: travelersPayload.infants || 0,
        price: isPerGroup ? (matchingGroupBand?.price ?? clientSubtotal) : (pricingResult ? totalPrice : clientSubtotal),
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
  }, [selectedDate, selectedTime, t, tour, isPerGroup, groupHeadcount, travelerGroups, categoryCounts, travelersPayload, matchingGroupBand, totalPrice, clientSubtotal, pricingResult, getSelectedDayInfo])

  const handleTransitionDone = useCallback(() => {
    navigate('/booking', { state: pendingNavState.current })
  }, [navigate])

  const handleUpdatePricing = useCallback(() => {
    if (!selectedDate) {
      toast.error(t('booking.selectDateFirst'))
      return
    }
    // Close the picker so the recalculation spinner on the price/total is visible.
    setShowGuestSelector(false)
    setPriceUpdated(false)
    doFetchPricing(selectedDate.toISOString().slice(0, 10), selectedTime)
  }, [selectedDate, selectedTime, doFetchPricing, t])

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

  // When a tier is currently active for a category, show the age range plus
  // the tier's headcount band (e.g. "18-60 years · Group of 3-5") so it's
  // clear why the per-person price changed as travelers were added/removed.
  const withTierNote = (baseLabel: string, tier: ReturnType<typeof findActiveTier>): string => {
    if (!tier) return baseLabel
    return `${baseLabel} · ${t('booking.groupOf', 'Group of {{range}}', { range: tierRangeLabel(tier) })}`
  }

  const anyTieredPricing = !isPerGroup && travelerGroups.some((g) => hasTieredPricing(g))

  const travelerOptions = isPerGroup
    ? [
        {
          label: t('booking.travelers'),
          age: matchingGroupBand ? activeGroupBandLabel : t('booking.perGroupHeadcount', 'Group headcount'),
          price: matchingGroupBand ? formatPrice(matchingGroupBand.price) : '',
          lineTotal: matchingGroupBand?.price ?? 0,
          count: groupHeadcount,
          key: 'travelers' as const,
        },
      ]
    : travelerGroups.map((g) => {
        const key = categoryKey(g.label)
        const count = categoryCounts[key] ?? 0
        const unit = unitPriceFor(g)
        return {
          label: g.label,
          age: withTierNote(ageRangeLabel(g) || '', activeTierFor(g)),
          price: unit > 0 ? formatPrice(unit) : t('booking.free'),
          lineTotal: unit * count,
          count,
          key,
        }
      })

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : t('tourDetail.selectDate')

  const selectedDayInfo = getSelectedDayInfo(selectedDate)
  const selectedDaySlots = selectedDayInfo?.timeSlots?.length ? selectedDayInfo.timeSlots : []

  // Warn when the chosen traveler count exceeds what's left on the selected day.
  const remainingWarning = (() => {
    const info = getSelectedDayInfo(selectedDate)
    if (!info || info.capacityUnit !== 'people') return null
    const remaining = info.remaining
    if (remaining == null || totalTravelers <= remaining) return null
    return t('booking.tooManyTravelers', 'Only {{count}} spot(s) left on this date', { count: Math.max(0, remaining) })
  })()

  // Authoritative figure from the API when available; client mirror before that.
  const displayTotal = pricingResult ? pricingResult.total : clientSubtotal

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
                  {hasPricing && adultGroup && unitPriceFor(adultGroup) > 0
                    ? `${currency.symbol}${Math.round(convertPrice(unitPriceFor(adultGroup)))}`
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
                    onDateSelect={(date) => {
                      setSelectedDate(date)
                      setSelectedTime(null)
                    }}
                    selectedDate={selectedDate}
                    getAvailability={(date) => {
                      const avail = propGetAvailability ? propGetAvailability(date) : 'available'
                      return avail
                    }}
                    getDayCounts={(date) => {
                      if (!getDayInfo) return null
                      const info = getDayInfo(date)
                      if (!info) return null
                      return {
                        remaining: info.remaining,
                        capacity: info.capacity,
                        capacityUnit: info.capacityUnit,
                      }
                    }}
                    loading={availabilityLoading}
                    onMonthChange={onMonthChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Time slot selector — shown only when the selected day has fixed slots */}
          {selectedDate && selectedDaySlots.length > 0 && (
            <div className="booking-field">
              <label className="booking-label">
                <ClockIcon size={18} />
                {t('booking.selectTime', 'Select time')}
              </label>
              <div className="booking-slot-grid">
                {selectedDaySlots.map((slot) => {
                  const slotFull = slot.remaining <= 0
                  const isSelectedSlot = selectedTime === slot.time
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={slotFull}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`booking-slot-chip${isSelectedSlot ? ' booking-slot-chip-active' : ''}`}
                    >
                      <span className="booking-slot-time">{formatSlotTime(slot.time)}</span>
                      <span className="booking-slot-cap">
                        {slotFull
                          ? t('booking.soldOut', 'Sold out')
                          : selectedDayInfo?.capacityUnit === 'groups'
                            ? `${Math.max(0, slot.groupsRemaining ?? 0)} ${t('booking.groupSlots', 'group slots')}`
                            : `${Math.max(0, slot.remaining)} ${t('booking.spotsLeft', 'spots left')}`}
                      </span>
                    </button>
                  )
                })}
              </div>
              {selectedDayInfo?.capacityUnit === 'groups' && selectedDayInfo.maxGroupSize != null && (
                <p className="booking-slot-note">
                  {t('booking.groupBookingsNote', 'Group bookings · up to {{max}} travelers per group', { max: selectedDayInfo.maxGroupSize })}
                </p>
              )}
            </div>
          )}

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
              <span>
                {totalTravelers} {t('booking.traveler', { count: totalTravelers })}
                {isPerGroup && activeGroupBandLabel && (
                  <span className="booking-active-band">
                    {' '}· {t('booking.groupOf', 'Group of {{range}}', { range: activeGroupBandLabel })}
                  </span>
                )}
              </span>
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
                          const rangeLabel = band.from === band.to
                            ? `${band.from}`
                            : (Number.isFinite(band.to) ? `${band.from}-${band.to}` : `${band.from}+`)
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
                  {anyTieredPricing && (
                    <p className="booking-tier-hint">{t('booking.tierPricingHint', 'Per-person prices below depend on your total number of travelers.')}</p>
                  )}
                  {travelerOptions.map((opt) => {
                    const category = travelerGroups.find((g) => categoryKey(g.label) === opt.key)
                    const canDecrement = isPerGroup
                      ? groupHeadcount > groupMinHeadcount
                      : (opt.key === 'adult'
                          ? opt.count > 1
                          : opt.count > 0)
                    const canIncrement = isPerGroup
                      ? groupHeadcount < groupMaxHeadcount
                      : (opt.key === 'adult' ? opt.count < 50 : opt.count < 9)
                    const addBlocked = !isPerGroup && !canAddCount(opt.key)
                    return (
                      <div key={opt.key} className="guest-type">
                        <div className="guest-type-info">
                          <span className="guest-type-label">{opt.label}</span>
                          <span className="guest-type-desc">{opt.age}</span>
                          {category?.notAllowed && (
                            <span className="guest-type-desc">{t('booking.notAllowed', 'Not permitted on this tour')}</span>
                          )}
                        </div>
                        <div className="guest-type-price">
                          <span className="guest-type-unit">{opt.price}</span>
                          {!isPerGroup && opt.count > 0 && (
                            <span className="guest-type-line">
                              {t('booking.perPersonShort', 'per person')}
                            </span>
                          )}
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
                            disabled={!canIncrement || addBlocked}
                            aria-label={`Add one ${opt.label}`}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {mixBounds.min != null && mixBounds.max != null && (
                    <p className="booking-slot-note">
                      {t('booking.bookableRange', 'Bookable by {{min}}–{{max}} travelers', { min: mixBounds.min, max: mixBounds.max })}
                    </p>
                  )}
                  {mixIssues.length > 0 && (
                    <p className="booking-slot-warning">{mixIssues[0].message}</p>
                  )}

                  <button
                    type="button"
                    className="booking-update-btn"
                    onClick={handleUpdatePricing}
                    disabled={!selectedDate || pricingLoading}
                  >
                    {pricingLoading ? (
                      <span className="booking-btn-loader">
                        <svg className="booking-spinner" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                        </svg>
                        {t('booking.checking')}
                      </span>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        {t('booking.updatePrice', 'Update')}
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Transparent price summary — always visible so the spinner is easy to see */}
          {(isPerGroup ? matchingGroupBand != null : tour.price > 0) && totalTravelers > 0 && (
            <div className="booking-summary">
              <div className="booking-total">
                <span>{isPerGroup ? t('booking.groupTotal', 'Group total') : t('booking.totalLabel', 'Total')}</span>
                <span className="booking-total-amount">
                  {pricingLoading ? (
                    <span className="booking-price-spinner">
                      <svg className="booking-spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                      </svg>
                    </span>
                  ) : `${currency.symbol}${Math.round(convertPrice(displayTotal))}`}
                </span>
              </div>
              {priceUpdated && !pricingLoading && (
                <p className="booking-slot-note">{t('booking.priceUpdated', 'Price updated to reflect the latest availability')}</p>
              )}
            </div>
          )}

          {isPerGroup && groupSizeBands.length === 0 && (
            <p className="booking-group-unavailable">{t('booking.groupPricingUnavailable')}</p>
          )}

          {remainingWarning && (
            <p className="booking-slot-warning">{remainingWarning}</p>
          )}

          {availabilityLoading && selectedDate && (
            <p className="booking-slot-note">{t('booking.checkingAvailability', 'Checking availability…')}</p>
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
            disabled={isBooking || (!!selectedDate && selectedDaySlots.length > 0 && !selectedTime) || (!isPerGroup && mixIssues.length > 0)}
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
