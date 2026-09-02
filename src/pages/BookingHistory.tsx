import { useState, useEffect, useMemo, useRef, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  X,
  MapPin,
  CalendarDays,
  Clock,
  Users,
  Ticket,
  CreditCard,
  Copy,
  Check,
  ChevronDown,
  Phone,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { currencySymbol } from '../lib/currencySymbol'
import {
  useMyExpeditionBookings,
  useExpeditionBookingDetail,
  useCancelBooking,
  type ExpeditionBookingSummary,
} from '../hooks/useExpeditionBookings'
import { extractMeetingInfo, extractAvailabilitySchedule } from '../hooks/useExpeditionTours'
import { formatTime12h, openingHoursForDay } from '../lib/tourAvailability'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  createMapLibreMap,
  maplibrePinEl,
  TILE_STYLE,
  warmMapResources,
} from '../lib/mapUtils'
import './BookingHistory.css'
import './BookingConfirmationPage.css'
import OptimizedImage from '@/components/shared/OptimizedImage'

type TabStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

interface TravelersJson {
  adults?: number
  children?: number
  infants?: number
  phoneNumber?: string
  location?: string
  details?: { name?: string; age?: number | string; ageGroup?: string; specialRequests?: string }[]
}

/* ------------------------------------------------------------------ */
/* Lightweight single-pin map (same MapLibre stack as the rest of the  */
/* app). Non-interactive; tapping opens the point in Google Maps.      */
/* ------------------------------------------------------------------ */
interface PointMapProps {
  lat?: number | null
  lng?: number | null
  title?: string
}

function MiniPointMap({ lat, lng, title }: PointMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const hasCoords =
    typeof lat === 'number' && Number.isFinite(lat) &&
    typeof lng === 'number' && Number.isFinite(lng)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !hasCoords || lat == null || lng == null) return
    warmMapResources()

    let settled = false
    let map: maplibregl.Map | null = null
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true
        setState('error')
      }
    }, 10000)

    map = createMapLibreMap(el, {
      style: TILE_STYLE,
      center: [lng, lat],
      zoom: 13,
      interactive: false,
      attributionControl: false,
    })

    if (!map) {
      settled = true
      window.clearTimeout(timeout)
      setState('error')
      return
    }
    mapRef.current = map

    map.on('load', () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      setState('ready')
      map?.resize()
      new maplibregl.Marker({ element: maplibrePinEl('#179237'), anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map)
    })
    map.on('error', () => {
      if (!settled) {
        settled = true
        window.clearTimeout(timeout)
        setState('error')
      }
    })

    return () => {
      window.clearTimeout(timeout)
      if (!el.isConnected) {
        map?.remove()
        mapRef.current = null
      }
    }
  }, [lat, lng, hasCoords])

  if (!hasCoords || lat == null || lng == null) return null

  return (
    <div className="booking-point-map">
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={title ? `Open ${title} in Google Maps` : 'Open pickup location in Google Maps'}
      >
        <div className="booking-point-map-frame">
          <div ref={containerRef} className="booking-point-map-canvas" />
          {state === 'loading' && (
            <span className="booking-point-map-overlay">
              <span className="booking-point-map-spinner" /> Loading map…
            </span>
          )}
          {state === 'error' && (
            <span className="booking-point-map-overlay">View in Google Maps →</span>
          )}
        </div>
      </a>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatDateLabel(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Formats a stored time string ("09:00", "09:00 AM", "9:00 AM"). */
function formatTimeString(value?: string | null): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/am|pm/i.test(raw)) return raw
  const m = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (m) {
    let h = Number(m[1])
    const mm = m[2]
    const period = h >= 12 ? 'PM' : 'AM'
    h = h % 12 === 0 ? 12 : h % 12
    return `${h}:${mm} ${period}`
  }
  return raw
}

function toFiniteNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/* ------------------------------------------------------------------ */
/* Cancellation policy — mirrors the backend's evaluateCancellationPolicy */
/* (utils/bookingHelpers.js) so the UI never offers a cancel the API    */
/* will reject. Reads the supplier-authored policy from                */
/* tour.bookingAndTickets.cancellationPolicy (set in the product       */
/* builder's Cancellation step).                                        */
/* ------------------------------------------------------------------ */
interface CancellationVerdict {
  type: 'standard' | 'all_sales_final'
  allowed: boolean
  windowHours: number
  refundPct: number
  deadline: Date | null
}

function parseJsonish(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function evaluateCancellationPolicy(bookingAndTickets: unknown, travelDate?: string | null): CancellationVerdict {
  const bt = parseJsonish(bookingAndTickets) as Record<string, unknown> | null
  const raw = bt && typeof bt === 'object' ? bt.cancellationPolicy : undefined

  let type: CancellationVerdict['type'] = 'standard'
  let windowHours = 24
  let refundPct = 100

  if (typeof raw === 'string') {
    // Legacy label stored as a bare string.
    type = /non.?refund|all.?sales.?final/i.test(raw) ? 'all_sales_final' : 'standard'
  } else if (raw && typeof raw === 'object') {
    const pol = raw as Record<string, unknown>
    type = pol.type === 'all_sales_final' ? 'all_sales_final' : 'standard'
    windowHours = toFiniteNumber(pol.cancellationWindowHours) ?? 24
    refundPct = toFiniteNumber(pol.refundPercentage) ?? 100
  }

  if (type === 'all_sales_final') {
    return { type, allowed: true, windowHours: 0, refundPct: 0, deadline: null }
  }

  const base = travelDate ? new Date(travelDate) : null
  const valid = base && !Number.isNaN(base.getTime()) ? base : null
  if (!valid) return { type, allowed: false, windowHours, refundPct, deadline: null }

  const deadline = new Date(valid.getTime() - windowHours * 3600 * 1000)
  const hoursUntil = (valid.getTime() - Date.now()) / (3600 * 1000)
  return { type, allowed: hoursUntil >= windowHours, windowHours, refundPct, deadline }
}

function formatDeadlineLabel(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function BookingHistory() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabStatus>('ALL')
  const [selectedBooking, setSelectedBooking] = useState<ExpeditionBookingSummary | null>(null)
  const [travelersOpen, setTravelersOpen] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useMyExpeditionBookings(1, activeTab === 'ALL' ? undefined : activeTab, 100)

  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
  } = useExpeditionBookingDetail(selectedBooking?.id)

  const cancelBooking = useCancelBooking()

  const statusLabel = (status: string) => STATUS_LABELS[status] ?? status

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
        return 'status-completed'
      case 'PENDING':
      case 'CONFIRMED':
        return status === 'CONFIRMED' ? 'status-confirmed' : 'status-pending'
      case 'CANCELLED':
        return 'status-cancelled'
      default:
        return ''
    }
  }

  const travelers = (detail?.travelers ?? {}) as TravelersJson
  const participantCount =
    travelers.details?.length ??
    (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0)

  const detailTour = detail?.tour
  const meeting = useMemo(() => extractMeetingInfo(detailTour ?? {}), [detailTour])
  const schedule = useMemo(() => extractAvailabilitySchedule(detailTour ?? {}), [detailTour])

  // Booking's stored pickup snapshot (the resolved one for THIS booking).
  const pickup =
    detail?.pickup && typeof detail.pickup === 'object'
      ? (detail.pickup as Record<string, unknown>)
      : null
  const pickupAddress =
    pickup?.address && typeof pickup.address === 'object'
      ? (pickup.address as Record<string, unknown>)
      : null
  const pickupLocation = String(
    pickup?.place || pickup?.areaName || pickup?.locationName || pickupAddress?.name || pickupAddress?.address || ''
  ).trim()
  const pickupDeferred = !!(
    pickup &&
    (pickup.pickupLater || pickup.skipValidation || pickup.status === 'deferred')
  )

  const arrivalLabel = (() => {
    if (meeting.meetingMode !== 'meeting_point') return ''
    if (meeting.arrivalTimeType === 'custom') {
      return meeting.arrivalTimeCustom ? `Arrive by ${meeting.arrivalTimeCustom}` : ''
    }
    switch (meeting.arrivalTimeType) {
      case '5min': return 'Arrive 5 minutes before the activity'
      case '10min': return 'Arrive 10 minutes before the activity'
      case '15min': return 'Arrive 15 minutes before the activity'
      case '30min': return 'Arrive 30 minutes before the activity'
      case 'notified': return 'Arrival time will be notified'
      default: return ''
    }
  })()

  const hasMeeting =
    meeting.meetingMode === 'meeting_point' &&
    (meeting.meetingPoint || meeting.meetingPointAddress || arrivalLabel)

  const bookingIsPickup = meeting.meetingMode === 'pickup'

  const price = (v?: number | string | null) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  const showBreakdown =
    !!detail && (price(detail.subtotal) > 0 || price(detail.taxes) > 0 || price(detail.fees) > 0 || price(detail.discounts) > 0)

  /* ---- Scheduling (real, not generic opening hours) ---------------- */
  const openHoursNote = (() => {
    if (!detail?.travelDate) return ''
    if (schedule.scheduleType !== 'operatingHours') return ''
    const day = openingHoursForDay(schedule, new Date(detail.travelDate))
    return day ? `Open ${day}` : ''
  })()

  const startValue = (() => {
    if (detail?.selectedTime) return formatTime12h(detail.selectedTime)
    if (pickup?.time) return `Pickup ${formatTimeString(String(pickup.time))}`
    return 'Flexible'
  })()

  /* ---- Party summary ------------------------------------------------ */
  const partyBreakdown = (() => {
    const parts: string[] = []
    if (travelers.adults) parts.push(`${travelers.adults} ${travelers.adults === 1 ? 'Adult' : 'Adults'}`)
    if (travelers.children) parts.push(`${travelers.children} ${travelers.children === 1 ? 'Child' : 'Children'}`)
    if (travelers.infants) parts.push(`${travelers.infants} ${travelers.infants === 1 ? 'Infant' : 'Infants'}`)
    if (parts.length) return parts.join(' · ')
    if (participantCount > 0) return `${participantCount} ${participantCount === 1 ? 'Person' : 'People'}`
    return ''
  })()

  const leadTravelerName =
    travelers.details?.[0]?.name || (typeof detail?.leadTravelerName === 'string' ? detail.leadTravelerName : '') || ''

  /* ---- Status presentation ----------------------------------------- */
  const isPaid = selectedBooking?.paymentStatus === 'SUCCEEDED'
  const isReserved =
    !!selectedBooking && selectedBooking.paymentTiming === 'later' && !isPaid

  const pill = (() => {
    const s = selectedBooking?.status
    if (s === 'COMPLETED') return { label: 'Completed', kind: 'completed' }
    if (s === 'CANCELLED') {
      const refunded =
        !!(detail && (detail.refundedAt || (toFiniteNumber(detail.refundAmount) ?? 0) > 0))
      return refunded ? { label: 'Refunded', kind: 'refunded' } : { label: 'Cancelled', kind: 'cancelled' }
    }
    if (s === 'CONFIRMED') return { label: 'Confirmed', kind: 'confirmed' }
    if (s === 'PENDING') {
      if (isReserved) return { label: 'Reserved', kind: 'pending' }
      if (isPaid) return { label: 'Awaiting confirmation', kind: 'pending' }
      return { label: 'Pending', kind: 'pending' }
    }
    return { label: statusLabel(s ?? ''), kind: 'pending' }
  })()

  const pillNote = (() => {
    if (selectedBooking?.status === 'PENDING' && isPaid) {
      return 'Payment received — the tour operator will confirm your booking shortly.'
    }
    if (selectedBooking?.status === 'PENDING' && isReserved) {
      return 'Reserved — your card will be charged before the activity date.'
    }
    if (selectedBooking?.status === 'CANCELLED' && pill.kind === 'refunded') {
      return 'Your refund has been processed.'
    }
    return ''
  })()

  /* ---- Map point for the resolved pickup / meeting point ------------ */
  const mapPoint = useMemo(() => {
    if (pickup) {
      const lat = toFiniteNumber(pickup.lat)
      const lng = toFiniteNumber(pickup.lng)
      if (lat != null && lng != null) return { lat, lng, title: pickupLocation }
      const aLat = pickupAddress ? toFiniteNumber(pickupAddress.lat) : null
      const aLng = pickupAddress ? toFiniteNumber(pickupAddress.lng) : null
      if (aLat != null && aLng != null) return { lat: aLat, lng: aLng, title: pickupLocation }
      // Fall back to the configured zone centre (only when we know the zone).
      if (pickup?.areaName) {
        const zone = (meeting.pickupAreas as { name?: string; address?: string; lat?: number; lng?: number }[]).find(
          (a) => a && (a.name === pickup.areaName || a.address === pickup.areaName),
        )
        const zLat = toFiniteNumber(zone?.lat)
        const zLng = toFiniteNumber(zone?.lng)
        if (zLat != null && zLng != null) return { lat: zLat, lng: zLng, title: pickupLocation }
      }
      return null
    }
    if (meeting.meetingMode === 'meeting_point') {
      const mLat = meeting.meetingPointLat
      const mLng = meeting.meetingPointLng
      if (mLat != null && mLng != null) {
        return { lat: mLat, lng: mLng, title: meeting.meetingPoint || meeting.meetingPointAddress || '' }
      }
    }
    return null
  }, [pickup, pickupAddress, pickupLocation, meeting])

  const canCancelByStatus =
    selectedBooking?.status === 'PENDING' || selectedBooking?.status === 'CONFIRMED'

  const cancellation = useMemo(() => {
    if (!selectedBooking) return null
    const tour =
      detail?.tour && typeof detail.tour === 'object'
        ? (detail.tour as { bookingAndTickets?: unknown }).bookingAndTickets
        : undefined
    return evaluateCancellationPolicy(
      tour,
      typeof detail?.travelDate === 'string' ? detail.travelDate : selectedBooking.travelDate
    )
  }, [selectedBooking, detail])

  const showCancelButton =
    canCancelByStatus && !!detail && !!cancellation && cancellation.allowed

  const policyNote = (() => {
    if (!cancellation) return ''
    if (cancellation.type === 'all_sales_final' || cancellation.refundPct === 0) {
      return 'This booking is non-refundable — no refund will be issued.'
    }
    if (cancellation.allowed) {
      if (cancellation.refundPct >= 100) {
        return `Free cancellation — you will receive a full refund${
          cancellation.windowHours > 0 && cancellation.deadline
            ? ` if you cancel before ${formatDeadlineLabel(cancellation.deadline)}`
            : ''
        }.`
      }
      return `Cancellation available — you will receive a ${cancellation.refundPct}% refund.`
    }
    return cancellation.deadline
      ? `Free cancellation ended ${formatDeadlineLabel(cancellation.deadline)} — cancellations are no longer available for this booking.`
      : 'Cancellations are no longer available for this booking.'
  })()

  const canManagePickup =
    !!selectedBooking &&
    (selectedBooking.status === 'PENDING' || selectedBooking.status === 'CONFIRMED')

  const openBooking = (booking: ExpeditionBookingSummary) => {
    setTravelersOpen(false)
    setCopiedRef(false)
    setCancelError(null)
    setSelectedBooking(booking)
  }

  const closeBooking = () => {
    setSelectedBooking(null)
    setCancelError(null)
  }

  const copyBookingReference = async () => {
    if (!selectedBooking) return
    const ref = selectedBooking.bookingNumber
    let ok = false
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(ref)
        ok = true
      }
    } catch {
      ok = false
    }
    if (!ok) {
      const el = document.createElement('textarea')
      el.value = ref
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      document.body.removeChild(el)
    }
    if (ok) {
      setCopiedRef(true)
      window.setTimeout(() => setCopiedRef(false), 2000)
    }
  }

  const handleCancel = () => {
    if (!selectedBooking) return
    setCancelError(null)
    const refundLine = !cancellation
      ? 'Refunds are processed per the tour cancellation policy.'
      : cancellation.refundPct <= 0
        ? 'This booking is non-refundable and no refund will be issued.'
        : cancellation.refundPct >= 100
          ? 'Free cancellation — you will receive a full refund.'
          : `A ${cancellation.refundPct}% partial refund will be issued per the cancellation policy.`
    const confirmed = window.confirm(`Cancel this booking?\n\n${refundLine}`)
    if (!confirmed) return

    cancelBooking.mutate(
      { id: selectedBooking.id, reason: 'Customer requested cancellation' },
      {
        onSuccess: () => closeBooking(),
        onError: (err: Error) => setCancelError(err.message),
      }
    )
  }

  const tabs: { value: TabStatus; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]

  /* ---- Modal shell: focus trap + Escape + scroll lock ---------------- */
  useEffect(() => {
    if (!selectedBooking) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [selectedBooking])

  const focusables = () => {
    if (!sheetRef.current) return []
    return Array.from(
      sheetRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'))
  }

  const handleDialogKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeBooking()
      return
    }
    if (e.key !== 'Tab') return
    const els = focusables()
    if (els.length === 0) return
    const first = els[0]
    const last = els[els.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (e.shiftKey && (active === first || active === null)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  useEffect(() => {
    if (!selectedBooking) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => {
      const closeBtn = sheetRef.current?.querySelector<HTMLElement>('[data-autofocus]')
      if (closeBtn) closeBtn.focus()
      else sheetRef.current?.focus()
    }, 0)
    return () => {
      window.clearTimeout(t)
      previouslyFocused?.focus?.()
    }
  }, [selectedBooking])

  const listStatus = isError
    ? 'error'
    : isLoading
      ? 'loading'
      : 'ready'

  const sym = (c?: string) => currencySymbol(c)

  return (
    <div className="booking-history">
      <div className="booking-tabs-container">
        <div className="booking-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={`booking-tab ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
              {activeTab === tab.value && (
                <motion.div
                  layoutId="booking-tab-indicator"
                  className="booking-tab-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="booking-content">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {listStatus === 'error' && (
              <div className="empty-state">
                <div className="empty-icon">
                  <AlertTriangle size={40} />
                </div>
                <motion.h3
                  className="empty-title"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  Couldn't load your bookings
                </motion.h3>
                <motion.p
                  className="empty-text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  {(error as Error)?.message || 'Something went wrong while fetching your bookings.'}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  <Button onClick={() => refetch()} className="empty-cta">
                    Try Again
                  </Button>
                </motion.div>
              </div>
            )}

            {listStatus === 'loading' && (
              <div className="empty-state">
                <div className="loading-spinner" />
                <motion.h3
                  className="empty-title"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  Loading your bookings…
                </motion.h3>
              </div>
            )}

            {listStatus === 'ready' && bookings.length === 0 && (
              <div className="empty-state">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.2,
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                  }}
                >
                  <motion.svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="empty-icon"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <motion.polyline
                      points="12 6 12 12 16 14"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </motion.svg>
                </motion.div>

                <motion.h3
                  className="empty-title"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  No Booking History
                </motion.h3>

                <motion.p
                  className="empty-text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  You haven't made any bookings yet. Start exploring our amazing tours!
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                >
                  <Button onClick={() => (window.location.href = '/')} className="empty-cta">
                    Find an Experience
                  </Button>
                </motion.div>

                {[0, 30, 60].map((angle, i) => (
                  <motion.div
                    key={i}
                    className="clock-tick"
                    style={{
                      transform: `rotate(${angle}deg) translateY(-40px)`,
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 0.2, 0], scale: [0, 1.5, 0] }}
                    transition={{ duration: 2, delay: 1.5 + i * 0.3, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <div
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'var(--dash-accent)',
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {listStatus === 'ready' && bookings.length > 0 && (
              <div className="booking-list">
                {bookings.map((booking) => (
                  <div key={booking.id} className="booking-item">
                    <div className="booking-item-image">
                      {booking.tourImage ? (
                        <OptimizedImage src={booking.tourImage} alt={booking.tourTitle} width={200} />
                      ) : (
                        <div className="booking-item-image-placeholder" />
                      )}
                      <span className={`booking-status-badge ${getStatusColor(booking.status)}`}>
                        {statusLabel(booking.status)}
                      </span>
                      {booking.paymentTiming === 'later' && booking.paymentStatus !== 'SUCCEEDED' && (
                        <span className="booking-awaiting-payment">Awaiting payment</span>
                      )}
                      {booking.pickupDeferred && (
                        <span className="booking-awaiting-payment">Pickup to be arranged</span>
                      )}
                    </div>

                    <div className="booking-item-content">
                      <div className="booking-item-header">
                        <h3 className="booking-item-title">{booking.tourTitle}</h3>
                        <div className="booking-item-location">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{booking.tourLocation || '—'}</span>
                        </div>
                      </div>

                      <div className="booking-item-details">
                        <div className="booking-detail">
                          <span className="booking-detail-label">Date</span>
                          <span className="booking-detail-value">
                            {formatDateLabel(booking.travelDate)}
                          </span>
                        </div>
                        <div className="booking-detail">
                          <span className="booking-detail-label">Confirmation</span>
                          <span className={`booking-detail-value booking-code`}>{booking.bookingNumber}</span>
                        </div>
                        <div className="booking-detail">
                          <span className="booking-detail-label">Total</span>
                          <span className={`booking-detail-value booking-price`}>
                            {currencySymbol(booking.currency)}
                            {booking.total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="booking-item-footer">
                        <Button size="sm" className="booking-view-btn" onClick={() => openBooking(booking)}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Booking Details Sheet */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            className="booking-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            onClick={closeBooking}
          >
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Booking details for ${selectedBooking.tourTitle}`}
              tabIndex={-1}
              className="booking-sheet"
              initial={{ opacity: 0, y: 48, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 36, scale: 0.98 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 32,
                mass: 0.9,
                opacity: { duration: 0.18, ease: 'easeOut' },
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleDialogKeyDown}
            >
              {/* Hero image band */}
              <div className="booking-sheet-hero">
                {selectedBooking.tourImage ? (
                  <OptimizedImage
                    src={selectedBooking.tourImage}
                    alt={selectedBooking.tourTitle}
                    width={400}
                  />
                ) : (
                  <div className="booking-sheet-hero-placeholder" />
                )}
                <div className="booking-sheet-hero-overlay" />
                <button
                  type="button"
                  data-autofocus
                  className="booking-sheet-close"
                  onClick={closeBooking}
                  aria-label="Close booking details"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Header: status, title, location, reference */}
              <div className="booking-details-head">
                <div className="booking-details-tools">
                  <span className={`booking-pill booking-pill-${pill.kind}`}>{pill.label}</span>
                  <span aria-live="polite" className="booking-copied-txt">
                    {copiedRef ? 'Reference copied ✓' : ''}
                  </span>
                </div>
                <h2 className="booking-details-title">{selectedBooking.tourTitle}</h2>
                <p className="booking-details-loc">
                  <MapPin size={14} />
                  <span>{selectedBooking.tourLocation || '—'}</span>
                </p>

                <button
                  type="button"
                  className={`booking-ref-copy${copiedRef ? ' is-copied' : ''}`}
                  onClick={copyBookingReference}
                  aria-label={`Copy booking reference ${selectedBooking.bookingNumber}`}
                >
                  <Ticket size={13} />
                  <code>{selectedBooking.bookingNumber}</code>
                  {copiedRef ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>

              {pillNote && (
                <div className="booking-details-note">
                  <Info size={15} />
                  <span>{pillNote}</span>
                </div>
              )}

              <div className="booking-sheet-scroll">
                <div className="booking-details-body">
                  {/* Your plan */}
                  <div className="confirmation-card booking-details-card">
                    <div className="confirmation-section-title">Your plan</div>
                    <div className="confirmation-grid">
                      <div className="confirmation-grid-item">
                        <CalendarDays size={16} />
                        <div>
                          <span className="confirmation-grid-label">Date</span>
                          <span className="confirmation-grid-value">
                            {formatDateLabel(detail?.travelDate || selectedBooking.travelDate)}
                          </span>
                        </div>
                      </div>
                      <div className="confirmation-grid-item">
                        <Clock size={16} />
                        <div>
                          <span className="confirmation-grid-label">Start</span>
                          <span className={`confirmation-grid-value booking-start${detailLoading ? ' is-loading' : ''}`}>
                            {detailLoading ? '…' : startValue}
                          </span>
                          {openHoursNote && (
                            <span className="confirmation-grid-sub">{openHoursNote}</span>
                          )}
                        </div>
                      </div>
                      <div className="confirmation-grid-item confirmation-grid-item-wide">
                        <Users size={16} />
                        <div>
                          <span className="confirmation-grid-label">Travelers</span>
                          <span className="confirmation-grid-value">
                            {detailLoading ? '…' : leadTravelerName ? `${leadTravelerName}${partyBreakdown ? ` · ${partyBreakdown}` : ''}` : partyBreakdown || '…'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Where to go */}
                  {detailLoading ? (
                    <div className="confirmation-card booking-details-card">
                      <div className="confirmation-section-title">Where to go</div>
                      <p className="booking-loading-row">Loading meeting details…</p>
                    </div>
                  ) : (bookingIsPickup || hasMeeting) ? (
                    <div className="confirmation-card booking-details-card">
                      <div className="confirmation-section-title">Where to go</div>
                      {bookingIsPickup ? (
                        pickupDeferred || !pickupLocation ? (
                          <div className="booking-amber-box">
                            <p className="booking-amber-title">
                              {pickupDeferred ? 'Pickup location not yet assigned' : 'Pickup details pending'}
                            </p>
                            <p className="booking-amber-text">
                              We&rsquo;ll contact you to arrange it, or add your location now.
                            </p>
                            {canManagePickup && (
                              <button
                                type="button"
                                className="confirmation-btn-primary booking-amber-cta"
                                onClick={() => navigate(`/booking/${selectedBooking.id}/pickup`)}
                              >
                                Add pickup location
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="confirmation-grid">
                              <div className="confirmation-grid-item confirmation-grid-item-wide">
                                <MapPin size={16} />
                                <div>
                                  <span className="confirmation-grid-label">
                                    {pickup?.areaName ? 'Pickup area' : 'Pickup point'}
                                  </span>
                                  <span className="confirmation-grid-value">{pickupLocation}</span>
                                  {(() => {
                                    const addrTxt = String(
                                      pickupAddress?.name || pickupAddress?.address || ''
                                    ).trim()
                                    return addrTxt && addrTxt !== pickupLocation ? (
                                      <span className="confirmation-grid-sub">{addrTxt}</span>
                                    ) : null
                                  })()}
                                  {!!pickup?.time && (
                                    <span className="confirmation-grid-value booking-pickup-time">
                                      Pickup {formatTimeString(String(pickup.time))}
                                    </span>
                                  )}
                                  {!!pickup?.instructions && (
                                    <span className="confirmation-grid-sub">{String(pickup.instructions)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {mapPoint && (
                              <MiniPointMap lat={mapPoint.lat} lng={mapPoint.lng} title={mapPoint.title} />
                            )}
                            {canManagePickup && (
                              <button
                                type="button"
                                className="booking-text-link"
                                onClick={() => navigate(`/booking/${selectedBooking.id}/pickup`)}
                              >
                                Update pickup
                              </button>
                            )}
                          </>
                        )
                      ) : hasMeeting ? (
                        <>
                          <div className="confirmation-grid">
                            <div className="confirmation-grid-item confirmation-grid-item-wide">
                              <MapPin size={16} />
                              <div>
                                <span className="confirmation-grid-label">Meeting point</span>
                                <span className="confirmation-grid-value">
                                  {[meeting.meetingPoint, meeting.meetingPointAddress].filter(Boolean).join(' — ')}
                                </span>
                                {arrivalLabel && (
                                  <span className="confirmation-grid-sub">{arrivalLabel}</span>
                                )}
                                {meeting.meetingPointDescription && (
                                  <span className="confirmation-grid-sub">{meeting.meetingPointDescription}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {mapPoint && (
                            <MiniPointMap lat={mapPoint.lat} lng={mapPoint.lng} title={mapPoint.title} />
                          )}
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Travelers (expandable) */}
                  {detailError ? (
                    <div className="confirmation-card booking-details-card">
                      <div className="confirmation-section-title">Travelers</div>
                      <p className="booking-loading-row">Couldn't load traveler details.</p>
                    </div>
                  ) : detail && participantCount > 0 ? (
                    <div className="confirmation-card booking-details-card">
                      <div className="confirmation-section-title">Travelers</div>
                      <button
                        type="button"
                        className="booking-travelers-head"
                        aria-expanded={travelersOpen}
                        onClick={() => setTravelersOpen((v) => !v)}
                      >
                        <span className="booking-travelers-summary">
                          {leadTravelerName || partyBreakdown || 'Travelers'}
                        </span>
                        <span className="booking-travelers-meta">{partyBreakdown}</span>
                        <ChevronDown size={16} className="booking-chev" />
                      </button>
                      {travelersOpen && (
                        <div className="booking-travelers-detail">
                          <div className="confirmation-grid">
                            {(travelers.details?.length ?? 0) > 0 && (
                              <div className="confirmation-grid-item confirmation-grid-item-wide">
                                <Users size={16} />
                                <div>
                                  <span className="confirmation-grid-label">Guests</span>
                                  <span className="confirmation-grid-value">
                                    {travelers.details?.map(
                                      (t, i) =>
                                        `${t.name || `Traveler ${i + 1}`}${t.age != null ? ` (${t.age})` : ''}${t.ageGroup ? ` — ${t.ageGroup}` : ''}`
                                    ).join(', ')}
                                  </span>
                                </div>
                              </div>
                            )}
                            {travelers.phoneNumber && (
                              <div className="confirmation-grid-item">
                                <Phone size={16} />
                                <div>
                                  <span className="confirmation-grid-label">Contact</span>
                                  <span className="confirmation-grid-value">{travelers.phoneNumber}</span>
                                </div>
                              </div>
                            )}
                            {travelers.location && (
                              <div className="confirmation-grid-item">
                                <MapPin size={16} />
                                <div>
                                  <span className="confirmation-grid-label">Location</span>
                                  <span className="confirmation-grid-value">{travelers.location}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          {!!detail.specialRequests && (
                            <p className="confirmation-note">
                              Special requests: {detail.specialRequests}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Payment */}
                  <div className="confirmation-card booking-details-card">
                    <div className="confirmation-section-title">Payment</div>
                    {showBreakdown ? (
                      <div className="confirmation-price">
                        <div className="confirmation-price-row">
                          <span>Subtotal</span>
                          <span>{sym(detail.currency)}{price(detail.subtotal).toFixed(2)}</span>
                        </div>
                        {price(detail.fees) > 0 && (
                          <div className="confirmation-price-row">
                            <span>Fees</span>
                            <span>{sym(detail.currency)}{price(detail.fees).toFixed(2)}</span>
                          </div>
                        )}
                        {price(detail.taxes) > 0 && (
                          <div className="confirmation-price-row">
                            <span>Taxes</span>
                            <span>{sym(detail.currency)}{price(detail.taxes).toFixed(2)}</span>
                          </div>
                        )}
                        {price(detail.discounts) > 0 && (
                          <div className="confirmation-price-row confirmation-price-row-discount">
                            <span>Discount</span>
                            <span>-{sym(detail.currency)}{price(detail.discounts).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="confirmation-price-total">
                          <span>Total paid</span>
                          <span>
                            {sym(detail.currency)}{price(detail.grossAmount ?? selectedBooking.total).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="confirmation-price">
                        <div className="confirmation-price-total">
                          <span>Total paid</span>
                          <span>{currencySymbol(selectedBooking.currency)}{selectedBooking.total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="booking-sheet-footer">
                {cancelError && <p className="booking-cancel-error">{cancelError}</p>}
                {canCancelByStatus && detailLoading && (
                  <p className="booking-cancel-policy">Checking cancellation policy…</p>
                )}
                {canCancelByStatus && !detailLoading && cancellation && policyNote && (
                  <p className={`booking-cancel-policy${cancellation.allowed ? '' : ' is-closed'}`}>
                    {policyNote}
                  </p>
                )}
                <button
                  type="button"
                  className="confirmation-btn-primary booking-cta-primary"
                  onClick={() => navigate(`/booking/confirmation/${selectedBooking.id}`)}
                >
                  <Ticket size={16} />
                  View confirmation
                </button>
                {showCancelButton && (
                  <button
                    type="button"
                    className="confirmation-btn-ghost"
                    onClick={handleCancel}
                    disabled={cancelBooking.isPending}
                  >
                    <CreditCard size={15} />
                    {cancelBooking.isPending ? 'Cancelling…' : 'Cancel booking'}
                  </button>
                )}
                <button type="button" className="confirmation-btn-ghost" onClick={closeBooking}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
