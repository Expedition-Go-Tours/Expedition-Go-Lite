import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useAnimate } from 'framer-motion'
import { toast } from 'sonner'
import {
  Check, ArrowLeft, MapPin, CalendarDays, CalendarCheck, Users, Info, X,
  Phone, MessageSquare, ShieldCheck, Star, Clock, Globe,
  Car, CreditCard, Ticket,
} from 'lucide-react'
import logoSrc from '../assets/expo_trans.png'
import Footer from '../components/Footer'
import StepBadge from '../components/booking/StepBadge'
import { FieldLabel, TextInput, SelectInput } from '../components/booking/FormFields'
import LocationPicker from '../components/booking/LocationPicker'
import ChangeBookingModal from '../components/booking/ChangeBookingModal'
import ExpiredHoldModal from '../components/booking/ExpiredHoldModal'
import SignInPromptModal from '../components/booking/SignInPromptModal'
import CardField from '../components/booking/CardField'
import { useAuthUser } from '../hooks/useAuthUser'
import { setAuthReturnTo } from '../lib/auth'
import type { CardElementHandle } from '../components/booking/CardField'
import { getStripePromise } from '../lib/stripe'
import { fetchWithAuth } from '../lib/api'
import { useCreateBooking } from '../hooks/useExpeditionBookings'
import { buildE164Phone, isValidPhoneInput, COUNTRY_CODES } from '../lib/phone'
import { findPickupAreaForAddress, hasLocationOnlyAreas, isPickupLocationSatisfied, pickupZoneStatus, type PickupAreaShape } from '../lib/pickupZone'
import PickupZoneMap from '../components/booking/PickupZoneMap'
import OptimizedImage from '@/components/shared/OptimizedImage'
import {
  openingHoursForDay,
  weeklyHoursRange,
  formatTimeSlotList,
  formatTime12h,
  type TourScheduleInfo,
} from '../lib/tourAvailability'
import { freeCancellationDateLabel } from '../lib/cancellationLabel'

/* ─── Tour data from location state ─── */

// The supplier's meeting / pickup / drop-off configuration (passed from the
// tour detail page via BookingWidget). Mirrors TourDetailData's meetingInfo.
interface MeetingPickupInfo {
  meetingMode?: 'meeting_point' | 'pickup' | 'none'
  meetingPoint?: string
  meetingPointAddress?: string
  meetingPointDescription?: string
  /** Coordinates of the supplier's meeting point (Step 13), for map rendering. */
  meetingPointLat?: number | null
  meetingPointLng?: number | null
  /** Photo of the meeting point uploaded by the supplier (Step 13). */
  meetingPointPicture?: string
  arrivalTimeType?: 'none' | '5min' | '10min' | '15min' | '30min' | 'notified' | 'custom'
  arrivalTimeCustom?: string
  pickupType?: 'area' | 'address'
  /** Whether pickup happens at the activity start or before it. */
  pickupTiming?: 'at_start' | 'before_start'
  /** When the final pickup location is communicated (day before / after selection). */
  pickupFinalLocationTiming?: 'day_before' | 'after_selection'
  /** Pickup reference window before the start, e.g. '0-45' (0–45 min before). */
  referenceStartTime?: string
  pickupAreas?: PickupAreaShape[]
  pickupLocations?: { name?: string; address?: string; lat?: number | null; lng?: number | null }[]
  pickupDescription?: string
  dropoffOption?: 'same_location' | 'different_location' | 'none' | 'service'
  dropoffLocation?: string
  dropoffLocationAddress?: string
  dropoffDescription?: string
  /** Supplier's Step-14 availability scheduling ("Time slots" vs "Opening hours"). */
  scheduleType?: TourScheduleInfo['scheduleType']
  timeSlots?: TourScheduleInfo['timeSlots']
  weeklySchedule?: TourScheduleInfo['weeklySchedule']
  operatingHoursStart?: string
  operatingHoursEnd?: string
  /** Pricing model + per-category / group data (mirrors TourDetailData). */
  pricingModel?: 'perPerson' | 'perGroup'
  travelerPricing?: { label: string; price: number; minAge?: number | null; maxAge?: number | null; tiers?: { from: number; to: number; pricePerPerson: number }[] }[]
  groupSizePricing?: { from: number; to: number; price: number }[]
}

const FALLBACK_TOUR = {
  id: '',
  slug: '',
  title: 'Loading...',
  location: '',
  pickupIncluded: false,
  image: '',
  provider: 'Expedition GO Tours',
  rating: 0,
  reviews: 0,
  date: '',
  dateISO: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  time: '9:00 AM',
  duration: '',
  travelers: '1 adult',
  travelersCount: { adults: 1, children: 0, infants: 0 } as Record<string, number>,
  adults: 1,
  children: 0,
  infants: 0,
  selectedDate: '',
  selectedTime: null as string | null,
  price: 0,
  cancellation: 'Free cancellation up to 24 hours before',
  language: 'English',
  meetingMode: undefined as MeetingPickupInfo['meetingMode'],
  meetingPoint: '',
  meetingPointAddress: '',
  meetingPointDescription: '',
  meetingPointPicture: '',
  meetingPointLat: null as number | null,
  meetingPointLng: null as number | null,
  arrivalTimeType: 'none' as MeetingPickupInfo['arrivalTimeType'],
  arrivalTimeCustom: '',
  pickupType: 'area' as MeetingPickupInfo['pickupType'],
  pickupTiming: 'at_start' as MeetingPickupInfo['pickupTiming'],
  pickupFinalLocationTiming: 'day_before' as MeetingPickupInfo['pickupFinalLocationTiming'],
  referenceStartTime: '',
  pickupAreas: [] as MeetingPickupInfo['pickupAreas'],
  pickupLocations: [] as MeetingPickupInfo['pickupLocations'],
  pickupDescription: '',
  dropoffOption: 'none' as MeetingPickupInfo['dropoffOption'],
  dropoffLocation: '',
  dropoffLocationAddress: '',
  dropoffDescription: '',
  scheduleType: undefined as MeetingPickupInfo['scheduleType'],
  timeSlots: [] as NonNullable<MeetingPickupInfo['timeSlots']>,
  weeklySchedule: {} as NonNullable<MeetingPickupInfo['weeklySchedule']>,
  operatingHoursStart: '',
  operatingHoursEnd: '',
  pricingModel: 'perPerson' as MeetingPickupInfo['pricingModel'],
  travelerPricing: [] as NonNullable<MeetingPickupInfo['travelerPricing']>,
  groupSizePricing: [] as NonNullable<MeetingPickupInfo['groupSizePricing']>,
  ticketValidity: undefined as string | undefined,
}

// Time label for the date/time summary rows: time-slot tours show the chosen
// slot; opening-hours tours show the selected day's opening hours, falling back
// to the weekly range so the supplier's choice is never hidden behind a fake
// "9:00 AM" default.
function scheduleTimeLabel(tour: typeof FALLBACK_TOUR): string {
  if (tour.scheduleType === 'operatingHours') {
    if (tour.dateISO) {
      const dayHours = openingHoursForDay(tour, new Date(`${tour.dateISO}T00:00:00`))
      if (dayHours) return dayHours
    }
    const range = weeklyHoursRange(tour)
    if (range) return range
    return 'Flexible time'
  }
  return tour.time || '9:00 AM'
}

const DAY_MONTH_YEAR_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Day-Month-Year label for the summary card's Date row, e.g.
// "2026-08-20" → "20 Aug 2026". Returns null for empty/invalid input.
function formatDayMonthYear(dateISO: string): string | null {
  if (!dateISO) return null
  const date = new Date(`${dateISO}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getDate()} ${DAY_MONTH_YEAR_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

// Guards against stale persisted/cached validity labels (e.g. an old booking
// draft storing "Valid 1 days from booking") by re-pluralizing the unit to
// match the count ("Valid 1 day from booking").
function normalizeTicketValidity(label?: string): string {
  if (!label) return ''
  return label.replace(
    /\b(\d+)\s+(days?|weeks?|months?)\b/gi,
    (full, n: string, unit: string) => {
      void full
      const count = parseInt(n, 10)
      const base = unit.replace(/s$/i, '')
      return `${n} ${count === 1 ? base : `${base}s`}`
    },
  )
}

/* ─── Page entrance variants ─── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } },
}

const stepContentVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 18 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
}

/* ─── Mobile Summary Card ─── */

/* ─── Hold Timer ─── */

function CountdownDigit({ value, label }: { value: number; label: string }) {
  const [scope, animate] = useAnimate();
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      (async () => {
        await animate(scope.current, { y: ["0%", "50%"], opacity: [1, 0] }, { duration: 0.2 });
        prevRef.current = value;
        await animate(scope.current, { y: ["-50%", "0%"], opacity: [0, 1] }, { duration: 0.2 });
      })();
    }
  }, [value, animate, scope]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full overflow-hidden text-center">
        <span ref={scope} className="block text-lg font-bold text-emerald-900 tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function HoldTimer({ onExpire, lastActivityAt, isExpired }: { onExpire: () => void; lastActivityAt: React.MutableRefObject<number>; isExpired: boolean }) {
  const [seconds, setSeconds] = useState(25 * 60)
  const hasExpired = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastActivityAt.current < 30_000) {
        setSeconds(25 * 60)
        hasExpired.current = false
        return
      }
      setSeconds((s) => {
        if (s <= 1) {
          if (!hasExpired.current) {
            hasExpired.current = true
            onExpire()
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onExpire, lastActivityAt])

  const m = Math.floor(seconds / 60)
  const s = seconds % 60

  if (isExpired) {
    return (
      <motion.div variants={itemVariants} className="flex items-center gap-2.5 rounded-[1.25rem] bg-rose-50 px-5 py-3.5 text-sm font-semibold text-rose-700 shadow-sm">
        <span className="flex size-8 items-center justify-center rounded-full bg-rose-100 text-rose-500">
          <Clock className="size-4" />
        </span>
        <span>Hold expired</span>
      </motion.div>
    )
  }

  return (
    <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 rounded-[1.25rem] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm">
      <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
        <Clock className="size-4" />
      </span>
      <div className="flex items-center gap-4">
        <CountdownDigit value={m} label="min" />
        <span className="self-start pt-0.5 text-lg font-bold text-emerald-900 tabular-nums">:</span>
        <CountdownDigit value={s} label="sec" />
      </div>
    </motion.div>
  )
}

/* ─── Step wrapper ─── */

function StepCard({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <motion.div
      id={id}
      layout
      className="rounded-[1.75rem] border border-slate-200/40 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
      transition={{ type: 'spring' as const, stiffness: 120, damping: 18 }}
    >
      {children}
    </motion.div>
  )
}

/* ─── Meeting & Pickup card ─── */

// Pickup reference windows mirror the supplier's Step 13 options
// (PICKUP_TIME_OPTIONS): how long before the activity start pickup happens.
const PICKUP_REF_LABELS: Record<string, string> = {
  '0-15': 'Pickup 0–15 min before the activity starts',
  '0-30': 'Pickup 0–30 min before the activity starts',
  '0-45': 'Pickup 0–45 min before the activity starts',
  '0-60': 'Pickup up to 1 hour before the activity starts',
  '0-90': 'Pickup up to 1.5 hours before the activity starts',
  '0-120': 'Pickup up to 2 hours before the activity starts',
}
function referenceStartLabel(value?: string): string {
  if (!value) return ''
  return PICKUP_REF_LABELS[value] || `Pickup ${value} before the activity starts`
}

// Renders exactly how travellers get to (and leave) the activity, mirroring
// the supplier's Step 13 "Meeting point or pickup" configuration:
//   meeting_point → travellers go to the starting point themselves
//   pickup       → travellers are picked up (areas / locations + description)
//   none / n/a   → neutral note (pickup arranged after booking, if any)
// Drop-off is appended when the supplier configured one.
// `embedded` renders it as a sub-section (no outer card border/background) so
// it can sit inside the tour summary card without a nested box.
function MeetingPickupCard({ tour, embedded = false, onOpenMap }: {
  tour: typeof FALLBACK_TOUR
  embedded?: boolean
  /** Opens the map modal (a pin per pickup spot). */
  onOpenMap?: () => void
}) {
  const mode = tour.meetingMode

  const arrivalLabel = () => {
    if (mode !== 'meeting_point') return ''
    if (tour.arrivalTimeType === 'custom') {
      return tour.arrivalTimeCustom ? `Arrive by ${tour.arrivalTimeCustom}` : ''
    }
    switch (tour.arrivalTimeType) {
      case '5min': return 'Arrive 5 minutes before the activity'
      case '10min': return 'Arrive 10 minutes before the activity'
      case '15min': return 'Arrive 15 minutes before the activity'
      case '30min': return 'Arrive 30 minutes before the activity'
      case 'notified': return 'Arrival time will be notified'
      default: return ''
    }
  }

  const hasStart = mode === 'meeting_point' || mode === 'pickup'

  const pickupAreas = Array.isArray(tour.pickupAreas) ? tour.pickupAreas.filter((a) => a && (a.name || a.address)) : []
  const pickupLocations = Array.isArray(tour.pickupLocations) ? tour.pickupLocations.filter((l) => l && (l.name || l.address)) : []

  const hasMeetingPoint = mode === 'meeting_point' && !!(tour.meetingPoint || tour.meetingPointAddress || arrivalLabel() || tour.meetingPointDescription)
  const hasPickup = mode === 'pickup' && (pickupAreas.length > 0 || pickupLocations.length > 0 || !!tour.pickupDescription || !!tour.referenceStartTime)

  // No meeting point / pickup configured at all — fall back to the neutral note.
  if (!hasStart) {
    if (embedded) {
      return <p className="text-sm text-slate-400">Pickup details will be provided after booking confirmation.</p>
    }
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/20 p-4">
        <p className="text-sm text-slate-400">Pickup details will be provided after booking confirmation.</p>
      </div>
    )
  }

  return (
    <div className={embedded ? 'px-3 pt-3 pb-3' : 'overflow-hidden rounded-xl border border-slate-200/40 bg-slate-50/30'}>
      <div className={`space-y-3 text-sm text-slate-600 ${embedded ? '' : 'px-4 py-3'}`}>
        {mode === 'meeting_point' && hasMeetingPoint && (
          <div className="space-y-2">
            {tour.meetingPoint && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                <span><strong className="font-semibold text-slate-800">Meeting point:</strong> {tour.meetingPoint}</span>
              </p>
            )}
            {tour.meetingPointAddress && tour.meetingPointAddress !== tour.meetingPoint && !tour.meetingPoint?.includes(tour.meetingPointAddress) && (
              <p className="pl-[22px] text-slate-400">{tour.meetingPointAddress}</p>
            )}
            {arrivalLabel() && (
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-semibold text-slate-700">
                  <Clock className="size-3.5 text-emerald-600" />
                  Arrival time
                </p>
                <p className="pl-[22px] text-slate-500">{arrivalLabel()}</p>
              </div>
            )}
            {tour.meetingPointDescription && (
              <p className="pl-[22px] leading-relaxed text-slate-500">{tour.meetingPointDescription}</p>
            )}
            </div>
        )}

        {mode === 'pickup' && hasPickup && (
          <div className="space-y-2">
            {pickupAreas.length + pickupLocations.length > 0 && (
              <button
                type="button"
                onClick={onOpenMap}
                className="flex w-full items-center gap-2 font-semibold text-slate-700 transition-colors hover:text-emerald-700"
              >
                <Car className="size-3.5 shrink-0 text-emerald-600" />
                <span>Pickup locations ({pickupAreas.length + pickupLocations.length})</span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 underline underline-offset-2">
                  Show on map
                  <MapPin className="size-3.5" />
                </span>
              </button>
            )}
            {tour.pickupDescription && (
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-semibold text-slate-700">
                  <Info className="size-3.5 text-emerald-600" />
                  Pickup info
                </p>
                <p className="flex items-start gap-2 pl-[22px] leading-relaxed text-slate-500">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#179237]" />
                  <span>{tour.pickupDescription}</span>
                </p>
              </div>
            )}
            {referenceStartLabel(tour.referenceStartTime) && (
              <p className="flex items-start gap-2 pl-[22px] text-slate-500">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#179237]" />
                <span>{referenceStartLabel(tour.referenceStartTime)}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Meeting point / pickup photo ─── */

// Meeting-point / pickup photo uploaded by the supplier (Step 13). Rendered
// separately from the meeting/pickup info so it can sit after the map. Tapping
// it opens the full-size image. Renders nothing when no photo is configured.
function MeetingPointPhoto({ src }: { src?: string }) {
  const [showPhoto, setShowPhoto] = useState(false)
  if (!src) return null

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowPhoto(true)}
        className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-slate-200/60"
        aria-label="View meeting point photo"
      >
        <OptimizedImage
          src={src}
          alt="Meeting point"
          width={800}
          className="max-h-40 w-full object-cover"
        />
      </button>
      <AnimatePresence>
        {showPhoto && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPhoto(false)}
          >
            <button
              type="button"
              onClick={() => setShowPhoto(false)}
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close photo"
            >
              <X size={20} />
            </button>
            <img
              src={src}
              alt="Meeting point"
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

<<<<<<< HEAD
/* ─── Location map (meeting point / pickup) ─── */

// Classic map pin (filled body + white center dot), colored per marker.
function MapPinIcon({ color }: { color: string }) {
  return (
    <svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true" className="drop-shadow">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill={color} />
      <circle cx="13" cy="13" r="5" fill="#fff" />
    </svg>
  )
}

// Key-free base map (same style the supplier's pickup geoshape drawer uses).
const TILE_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

const ZONE_FILL = 'rgba(23, 146, 55, 0.14)'
const ZONE_LINE = '#179237'
const EXCL_FILL = 'rgba(220, 38, 38, 0.10)'
const EXCL_LINE = '#dc2626'

type LatLngTuple = [number, number]

function polygonFeature(poly: LatLngTuple[]) {
  return {
    type: 'Feature' as const,
    properties: {} as Record<string, never>,
    geometry: {
      type: 'Polygon' as const,
      // GeoJSON uses [lng, lat]; the supplier stores vertices as [lat, lng].
      coordinates: [poly.map(([lat, lng]) => [lng, lat] as [number, number])],
    },
  }
}

function polyListToFeatureCollection(polys: LatLngTuple[][]) {
  return { type: 'FeatureCollection' as const, features: polys.map(polygonFeature) }
}

/**
 * Zone map for the booking form. When the tour carries any coordinates
 * (drawn geoshapes, meeting point or pickup pins, or the traveller's chosen
 * location) it renders a MapLibre map with the supplier's service zones in
 * green, exclusion zones hatched red, and the traveller's point in blue —
 * GetYourGuide-style.
 *
 * Legacy tours with names/addresses only fall back to the OSM embed looked
 * up by the address string.
 */
function LocationMap({
  tour,
  userMarker,
  onUserPointChange,
}: {
  tour: typeof FALLBACK_TOUR
  userMarker?: { lat: number | null; lng: number | null } | null
  /** Drag-end write-back so the traveller can reposition the blue pin directly on the map. */
  onUserPointChange?: (lat: number, lng: number) => void
}) {
  const [osmFailed, setOsmFailed] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const embedRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<MapLibreMarker[]>([])
  const mapReadyRef = useRef(false)
  const mapFailTimerRef = useRef<number | null>(null)
  const onUserPointChangeRef = useRef(onUserPointChange)
  useEffect(() => {
    onUserPointChangeRef.current = onUserPointChange
  }, [onUserPointChange])

  const toNumber = (v: unknown): number | null => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  // Markers from the supplier's Step-13 config: the meeting point (meeting
  // point mode) or the pickup areas/locations (pickup mode).
  const tourMarkers = useMemo(() => {
    const pts: { lat: number; lng: number }[] = []
    if (tour.meetingMode === 'meeting_point') {
      const lat = toNumber(tour.meetingPointLat)
      const lng = toNumber(tour.meetingPointLng)
      if (lat != null && lng != null) pts.push({ lat, lng })
    }
    if (tour.meetingMode === 'pickup') {
      for (const a of tour.pickupAreas || []) {
        if (!a) continue
        const lat = toNumber(a.lat)
        const lng = toNumber(a.lng)
        if (lat != null && lng != null) pts.push({ lat, lng })
      }
      for (const l of tour.pickupLocations || []) {
        if (!l) continue
        const lat = toNumber(l.lat)
        const lng = toNumber(l.lng)
        if (lat != null && lng != null) pts.push({ lat, lng })
      }
    }
    return pts
  }, [tour.meetingMode, tour.meetingPointLat, tour.meetingPointLng, tour.pickupAreas, tour.pickupLocations])

  // The traveller's typed pickup location (blue pin).
  const userPoint = useMemo(() => {
    const lat = toNumber(userMarker?.lat)
    const lng = toNumber(userMarker?.lng)
    return lat != null && lng != null ? { lat, lng } : null
  }, [userMarker?.lat, userMarker?.lng])

  // Drawn geoshapes + exclusion zones (supplier's Step-13 zone drawer).
  const zones = useMemo(
    () => (tour.pickupAreas || []).filter((a): a is PickupAreaShape & { polygon: LatLngTuple[] } =>
      !!a && Array.isArray(a.polygon) && a.polygon.length >= 3),
    [tour.pickupAreas],
  )
  const exclusions = useMemo(
    () => (tour.pickupAreas || [])
      .flatMap((a) => (Array.isArray(a?.exclusions) ? a.exclusions : []))
      .filter((e): e is LatLngTuple[] => Array.isArray(e) && e.length >= 3),
    [tour.pickupAreas],
  )

  // Anything with real coordinates → render the MapLibre zone map.
  const hasMapData = zones.length > 0 || exclusions.length > 0 || tourMarkers.length > 0 || userPoint != null

  // Textual fallback when the supplier only entered names/addresses (no
  // coordinates): still render a map by asking Google to locate the address.
  const fallbackQuery = useMemo(() => {
    if (tour.meetingMode === 'meeting_point') {
      return tour.meetingPointAddress || tour.meetingPoint || ''
    }
    if (tour.meetingMode === 'pickup') {
      const area = (tour.pickupAreas || []).find((a) => a && (a.address || a.name))
      if (area) return area.address || area.name || ''
      const loc = (tour.pickupLocations || []).find((l) => l && (l.address || l.name))
      if (loc) return loc.address || loc.name || ''
      return tour.pickupDescription || ''
    }
    return ''
  }, [tour.meetingMode, tour.meetingPointAddress, tour.meetingPoint, tour.pickupAreas, tour.pickupLocations, tour.pickupDescription])

  // Add/refresh the map pins: a green pin per supplier pickup spot (areas +
  // locations) plus the traveller's draggable blue pin. Keyed off the map
  // object only — not `mapReady` — so pins render as soon as the map exists,
  // even if the tile style's `load` event is delayed or lost (which otherwise
  // leaves a bare map with no markers).
  const addPins = useCallback((map: MapLibreMap) => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    for (const p of tourMarkers) {
      const el = document.createElement('div')
      el.style.cssText = 'filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.3)); cursor: default;'
      el.innerHTML = `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill="#179237"/><circle cx="13" cy="13" r="5" fill="#fff"/></svg>`
      const marker = new MapLibreMarker({ element: el, anchor: 'bottom' })
      markersRef.current.push(marker.setLngLat([p.lng, p.lat]).addTo(map))
    }
    if (userPoint) {
      const el = document.createElement('div')
      el.style.cssText = 'filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.3)); cursor: grab;'
      el.innerHTML = `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.8 20.2 0 13 0z" fill="#2563eb"/><circle cx="13" cy="13" r="5" fill="#fff"/></svg>`
      const marker = new MapLibreMarker({ element: el, anchor: 'bottom', draggable: true })
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat()
        onUserPointChangeRef.current?.(lat, lng)
      })
      markersRef.current.push(marker.setLngLat([userPoint.lng, userPoint.lat]).addTo(map))
    }
  }, [tourMarkers, userPoint])

  // MapLibre: build once, live-update overlays on selection changes.
  useEffect(() => {
    if (mapFailed || !hasMapData || !containerRef.current) return
    if (mapRef.current) return

    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: TILE_STYLE,
        center: [tourMarkers[0]?.lng ?? userPoint?.lng ?? -0.187, tourMarkers[0]?.lat ?? userPoint?.lat ?? 5.6037],
        zoom: 5,
      })
    } catch {
      // No WebGL / unsupported device → degrade to the textual fallback.
      window.setTimeout(() => setMapFailed(true), 0)
      return
    }

    map.addControl(new MapLibreNavigationControl({ showCompass: false }), 'top-right')

    // Add the pins as soon as the map object exists — markers render once
    // tiles load, so they must not wait on the style `load` event below
    // (a slow/hung tile server would otherwise leave a bare map with no pins).
    addPins(map)

    map.on('load', () => {
      if (!mapRef.current) return
      if (mapFailTimerRef.current != null) {
        window.clearTimeout(mapFailTimerRef.current)
        mapFailTimerRef.current = null
      }
      try {
        // Guard the source/layer adds so a re-entry (StrictMode remount or a
        // second load pass) can never throw and block readiness.
        if (!map.getSource('gz-zones')) {
          map.addSource('gz-zones', { type: 'geojson', data: polyListToFeatureCollection(zones.map((z) => z.polygon)) })
          map.addLayer({ id: 'gz-zones-fill', type: 'fill', source: 'gz-zones', paint: { 'fill-color': ZONE_FILL } })
          map.addLayer({ id: 'gz-zones-line', type: 'line', source: 'gz-zones', paint: { 'line-color': ZONE_LINE, 'line-width': 2 } })
        }
        if (!map.getSource('gz-excl')) {
          map.addSource('gz-excl', { type: 'geojson', data: polyListToFeatureCollection(exclusions) })
          map.addLayer({ id: 'gz-excl-fill', type: 'fill', source: 'gz-excl', paint: { 'fill-color': EXCL_FILL } })
          map.addLayer({
            id: 'gz-excl-line',
            type: 'line',
            source: 'gz-excl',
            paint: { 'line-color': EXCL_LINE, 'line-width': 2, 'line-dasharray': [2, 1] },
          })
        }

        const bounds = new MapLibreLngLatBounds()
        for (const z of zones) for (const [lat, lng] of z.polygon) bounds.extend([lng, lat])
        for (const e of exclusions) for (const [lat, lng] of e) bounds.extend([lng, lat])
        for (const m of [...tourMarkers, ...(userPoint ? [userPoint] : [])]) bounds.extend([m.lng, m.lat])
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 0 })
        }
      } catch {
        // A source/layer failure must not block readiness — the pins added
        // above already render and the map stays usable without the overlays.
      }

      mapReadyRef.current = true
      setMapReady(true)
      map.resize()
    })

    // Base tiles can 404 occasionally (overlays still render over the blank
    // base), but a failing style/server should not leave a permanent blank
    // box in the checkout — degrade to the textual fallback instead.
    map.on('error', () => {
      if (!mapReadyRef.current && mapFailTimerRef.current == null) {
        mapFailTimerRef.current = window.setTimeout(() => setMapFailed(true), 8000)
      }
    })

    mapRef.current = map
    return () => {
      if (mapFailTimerRef.current != null) {
        window.clearTimeout(mapFailTimerRef.current)
        mapFailTimerRef.current = null
      }
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
      mapReadyRef.current = false
      setMapReady(false)
    }
    // Zone/pin sources are managed by the live-update effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFailed, hasMapData])

  // Keep the map sized when its container changes — e.g. when the map opens
  // inside the pickup-locations modal (or after entrance animations). Mirrors
  // the supplier platform's PickupGeoshapePreview resize handling so tiles and
  // pins always render instead of showing a blank box. Runs off the map
  // object (not `mapReady`) so it works even before the style's `load` event.
  useEffect(() => {
    const el = containerRef.current
    const map = mapRef.current
    if (!el || !map || !hasMapData) return undefined
    const resize = () => map.resize()
    resize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [hasMapData])

  // Live-update the overlays as the traveller picks a location.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !hasMapData) return

    const zoneSource = map.getSource('gz-zones') as GeoJSONSource | undefined
    if (zoneSource) {
      zoneSource.setData(polyListToFeatureCollection(zones.map((z) => z.polygon)))
    }
    const exclSource = map.getSource('gz-excl') as GeoJSONSource | undefined
    if (exclSource) {
      exclSource.setData(polyListToFeatureCollection(exclusions))
    }

    // Refresh all pins — a green pin per supplier pickup spot (areas/locations),
    // plus the traveller's draggable blue pin. Not gated on `mapReady`: the
    // map object alone is enough, so pins render as soon as tiles do.
    addPins(map)
  }, [zones, exclusions, addPins, hasMapData])

  // Legacy name/address-only config: OSM embed, located by the address text.
  const markers = useMemo(() => [...tourMarkers, ...(userPoint ? [userPoint] : [])], [tourMarkers, userPoint])
  // Identity key for the traveller's pin (avoids re-narrowing the guarded
  // `userPoint` binding inside the mapView closure below).
  const userPointKey = userPoint ? `${userPoint.lat.toFixed(6)},${userPoint.lng.toFixed(6)}` : ''

  const mapView = useMemo(() => {
    if (hasMapData || markers.length === 0 || containerWidth <= 0) return null
    const H = 200
    const W = containerWidth
    const lats = markers.map((m) => m.lat)
    const lngs = markers.map((m) => m.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const cLat = (minLat + maxLat) / 2
    const cLng = (minLng + maxLng) / 2
    // Degrees-per-pixel must be equal in both axes so the bbox matches the
    // container aspect; use the larger of the two so every marker fits.
    const wDeg = Math.max(maxLng - minLng, 0.001) + 0.01
    const hDeg = Math.max(maxLat - minLat, 0.001) + 0.01
    const dpp = Math.max(wDeg / W, hDeg / H)
    const bbW = dpp * W
    const bbH = dpp * H
    const bbMinLng = cLng - bbW / 2
    const bbMaxLng = cLng + bbW / 2
    const bbMinLat = cLat - bbH / 2
    const bbMaxLat = cLat + bbH / 2
    const bbox = `${bbMinLng}%2C${bbMinLat}%2C${bbMaxLng}%2C${bbMaxLat}`
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`
    const pins = markers.map((m) => {
      const isUser = userPointKey === `${m.lat.toFixed(6)},${m.lng.toFixed(6)}`
      return {
        lat: m.lat,
        lng: m.lng,
        x: ((m.lng - bbMinLng) / bbW) * 100,
        y: (1 - (m.lat - bbMinLat) / bbH) * 100,
        isUser,
      }
    })
    return { embedUrl, pins }
  }, [hasMapData, markers, containerWidth, userPointKey])

  const mapPoint = userPoint ?? markers[0] ?? null
  const mapsLink = mapPoint
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mapPoint.lat},${mapPoint.lng}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery || tour.meetingPointAddress || tour.meetingPoint || '')}`

  useEffect(() => {
    if (hasMapData) return
    const el = embedRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasMapData])

  if (!hasMapData && !fallbackQuery) return null

  return (
    <div className="p-3">
      <div className="relative overflow-hidden rounded-lg border border-slate-200/40">
        {hasMapData && !mapFailed ? (
          <>
            {/* MapLibre adds `position: relative` to the container via its own
                stylesheet, which would override Tailwind's `absolute` and collapse
                `absolute inset-0` to 0 height. Use an explicit-height block instead
                (same pattern as the supplier platform's map previews). */}
            <div ref={containerRef} className="h-[400px] w-full" />
            {mapReady && (
              <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5 rounded-lg bg-white/90 px-2.5 py-2 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: ZONE_LINE }} /> Pickup zone
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: EXCL_LINE }} /> No pickup
                </span>
              </div>
            )}
          </>
        ) : mapView && !osmFailed ? (
          <>
            <iframe
              title="Location map"
              src={mapView.embedUrl}
              className="absolute inset-0 h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onError={() => setOsmFailed(true)}
            />
            {mapView.pins.map((p, i) => (
              <span
                key={i}
                className="absolute z-10"
                style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -100%)' }}
              >
                <MapPinIcon color={p.isUser ? '#2563eb' : '#179237'} />
              </span>
            ))}
          </>
        ) : (
          <div ref={embedRef} className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50 px-4 text-center">
            <MapPin className="size-5 shrink-0 text-slate-300" />
            <p className="text-xs leading-relaxed text-slate-500">
              {tour.meetingPointAddress || tour.meetingPoint || fallbackQuery || 'Meeting location will be confirmed after booking.'}
            </p>
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              Open in Google Maps
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

=======
>>>>>>> 6b3f240f6498d388a71ba84fa6d60598c7efac67
/* ─── Step 1 – Lead Traveler Details ─── */

function ContactDetailsStep({
  data, onChange, onNext, valid, step, onNavigate, hasError, disabled,
}: {
  data: { firstName: string; lastName: string; email: string; countryCode: string; phone: string }
  onChange: (key: string, value: string | boolean) => void
  onNext: () => void
  valid: { firstName: boolean; lastName: boolean; email: boolean; phone: boolean; all: boolean }
  step: number
  onNavigate: (n: number) => void
  hasError: boolean
  disabled?: boolean
}) {
  const isActive = step === 1
  const isCompleted = step > 1
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const handleBlur = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }))

  const error = (key: string, field: string) =>
    touched[key] && !valid[key as keyof typeof valid]
      ? `Please enter your ${field.toLowerCase()}`
      : undefined

  return (
    <StepCard id="booking-step-1">
      <div className="border-b border-slate-100/60 px-7 py-6 sm:px-9">
        <button
          type="button"
          onClick={() => onNavigate(1)}
          aria-label="Go to Lead Traveler Details"
          className="flex w-full items-start gap-4 text-left transition-opacity hover:opacity-80"
        >
          <StepBadge number={1} active={isActive} completed={isCompleted} error={hasError} />
          <div className="pt-0.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Lead Traveler Details</h2>
            <p className="mt-0.5 text-sm text-slate-400">The lead traveler&apos;s name and contact details</p>
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key="contact-active"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-5 p-7 sm:p-9"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel required tooltip="Enter your legal first name as it appears on your ID or passport.">First Name</FieldLabel>
                <TextInput
                  value={data.firstName}
                  onChange={(e) => onChange('firstName', e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                  placeholder="e.g. Richard"
                  valid={valid.firstName}
                  error={error('firstName', 'first name')}
                />
              </div>
              <div>
                <FieldLabel required tooltip="Enter your surname or family name as it appears on your ID.">Last Name</FieldLabel>
                <TextInput
                  value={data.lastName}
                  onChange={(e) => onChange('lastName', e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                  placeholder="e.g. Boochie"
                  valid={valid.lastName}
                  error={error('lastName', 'last name')}
                />
              </div>
            </div>

            <div>
              <FieldLabel required tooltip="Your booking confirmation, receipt and important updates will be sent here.">Email</FieldLabel>
              <TextInput
                type="email"
                value={data.email}
                onChange={(e) => onChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="e.g. richard@example.com"
                valid={valid.email}
                error={touched.email && !valid.email ? 'Please enter a valid email address' : undefined}
              />
            </div>

            <div>
              <FieldLabel required tooltip="The tour operator may use this to contact you about pickup or last-minute changes.">Phone Number</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-[1.2fr_2fr]">
                <SelectInput value={data.countryCode} onChange={(e) => onChange('countryCode', e.target.value)} options={COUNTRY_CODES} />
                <TextInput
                  type="tel"
                  value={data.phone}
                  onChange={(e) => onChange('phone', e.target.value.replace(/\D/g, ''))}
                  onBlur={() => handleBlur('phone')}
                  placeholder="e.g. 024 123 4567"
                  valid={valid.phone}
                  error={
                    touched.phone && !valid.phone
                      ? 'Enter a valid phone number for the selected country, e.g. 024 123 4567'
                      : undefined
                  }
                />
              </div>
            </div>

            {!valid.all && (Object.keys(touched).length > 0 || hasError) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg bg-rose-50 px-4 py-2.5 text-center text-xs font-semibold text-rose-600"
              >
                Please fill in all required fields correctly before proceeding.
              </motion.p>
            )}

            <div className="flex justify-end pt-2">
              <motion.button
                onClick={onNext}
                disabled={!valid.all || disabled}
                whileTap={{ scale: 0.97 }}
                className={`inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold shadow-sm transition ${
                  valid.all && !disabled
                    ? 'bg-emerald-600 text-white hover:brightness-110 cursor-pointer'
                    : 'cursor-not-allowed bg-slate-200 text-white'
                }`}
              >
                {disabled ? 'Hold Expired' : 'Next'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {isCompleted && (
          <motion.div
            key="contact-completed"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2 p-7 sm:p-9"
          >
            <p className="text-sm font-semibold text-slate-900">{data.firstName} {data.lastName}</p>
            <p className="text-sm text-slate-400">{data.email}</p>
            <p className="text-sm text-slate-400">{data.countryCode} {data.phone}</p>
            {hasError && (
              <p className="pt-1 text-xs font-semibold text-rose-500">There are errors in this step — please review.</p>
            )}
            <button type="button" onClick={() => onNavigate(1)} className="mt-1 text-sm font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
              Edit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </StepCard>
  )
}

/* ─── Step 2 – Activity Details ─── */

function ActivityDetailsStep({
  tour, onNext, step, onNavigate, hasError, disabled,
  contact, onContactChange, showPickupLocation, locationValid,
}: {
  tour: typeof FALLBACK_TOUR
  onNext: () => void
  step: number
  onNavigate: (n: number) => void
  hasError: boolean
  disabled?: boolean
  contact: { location: string; pickupLater: boolean; pickupLat: number | null; pickupLng: number | null; pickupArea: string }
  onContactChange: (key: string, value: string | boolean | number | null) => void
  showPickupLocation: boolean
  locationValid: boolean
}) {
  const isActive = step === 2
  const isCompleted = step > 2
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const handleBlur = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }))

  // Zone-aware pickup feedback — mirrors the backend's geoUtils verdict.
  const pickupAreasList = useMemo(
    () => (Array.isArray(tour.pickupAreas) ? tour.pickupAreas.filter((a): a is PickupAreaShape & { name: string } => !!a && !!a.name) : []),
    [tour.pickupAreas],
  )
  const zonesDrawn = useMemo(
    () => pickupAreasList.some((a) => !!a && Array.isArray(a.polygon) && a.polygon.length >= 3),
    [pickupAreasList],
  )
  const hasPointAreas = useMemo(() => hasLocationOnlyAreas(tour.pickupAreas || []), [tour.pickupAreas])
  const geofenced = zonesDrawn || hasPointAreas
  const zoneStatus = useMemo(
    () =>
      showPickupLocation && !contact.pickupLater
        ? pickupZoneStatus({ name: contact.location, lat: contact.pickupLat, lng: contact.pickupLng }, tour.pickupAreas || [])
        : 'none',
    [showPickupLocation, contact.pickupLater, contact.location, contact.pickupLat, contact.pickupLng, tour.pickupAreas],
  )
  const matchedArea = useMemo(
    () =>
      contact.pickupLat != null && contact.pickupLng != null && (zoneStatus === 'in_area' || zoneStatus === 'excluded')
        ? findPickupAreaForAddress({ lat: contact.pickupLat, lng: contact.pickupLng, name: contact.location }, tour.pickupAreas || [])
        : null,
    [zoneStatus, contact.pickupLat, contact.pickupLng, contact.location, tour.pickupAreas],
  )
  const compactTime = (t?: string) => (t ? t.replace('-', '–') : '')

  const locationInvalidMessage = !locationValid && touched.location
    ? zoneStatus === 'excluded'
      ? `This address is inside a no-pickup zone${matchedArea?.name ? ` for \u201C${matchedArea.name}\u201D` : ''} — choose a different address or pickup zone.`
      : zoneStatus === 'outside'
        ? 'This address is not inside your pickup area — choose a different address.'
        : zoneStatus === 'no_coords' && geofenced && contact.location.trim().length >= 3
          ? 'Pick an address from the suggestions so we can confirm it is inside a pickup zone.'
          : geofenced
            ? 'Enter the pickup address or choose a pickup zone below.'
            : 'Please enter your pickup location'
    : undefined

  const handlePickupAreaSelect = (name: string) => {
    if (contact.pickupArea === name) {
      onContactChange('pickupArea', '')
    } else {
      onContactChange('pickupArea', name)
      onContactChange('location', '')
      onContactChange('pickupLat', null)
      onContactChange('pickupLng', null)
    }
  }

  // The pickup-locations map lives in a modal; the "Pickup locations (N)" link
  // opens it (a pin per pickup spot) via the PickupZoneMap below.
  const [showMapModal, setShowMapModal] = useState(false)
  const handleOpenMap = () => setShowMapModal(true)
  const handleCloseMap = () => setShowMapModal(false)

  const meetingSummaryCard = (
    <div className="overflow-hidden rounded-xl border border-slate-200/40 bg-slate-50/30">
      {/* Meeting & pickup — embedded so the summary card carries the start/end
          details; the timing/hours are already shown in the date row above. */}
      <MeetingPickupCard tour={tour} embedded onOpenMap={handleOpenMap} />
    </div>
  )

  // Location map — shows the supplier's pickup zones / meeting point, plus the
  // traveller's picked pickup location when one is selected.
  const locationMap = (
    <PickupZoneMap
      tour={tour}
      userMarker={{ lat: contact.pickupLat, lng: contact.pickupLng }}
      onUserPointChange={(lat, lng) => {
        onContactChange('pickupLat', lat)
        onContactChange('pickupLng', lng)
        onContactChange('pickupArea', '')
      }}
    />
  )

const pickupSpotCount = (Array.isArray(tour.pickupAreas) ? tour.pickupAreas.filter((a) => a && (a.name || a.address)).length : 0)
    + (Array.isArray(tour.pickupLocations) ? tour.pickupLocations.filter((l) => l && (l.name || l.address)).length : 0)

  // The map preview renders for meeting-point tours and any pickup tour that
  // has geographic data (drawn zones or location-only points). Location-only
  // tours keep their selectable list — the map is the pin preview + draggable
  // pickup pin + live zone verdict. Pickup tours with no areas render no map.
  const showZoneMap =
    tour.meetingMode === 'meeting_point' ||
    zonesDrawn ||
    (tour.meetingMode === 'pickup' && hasPointAreas)

  const pickupPhoto = <MeetingPointPhoto src={tour.meetingPointPicture} />

  return (
    <>
    <StepCard id="booking-step-2">
      <div className="border-b border-slate-100/60 px-7 py-6 sm:px-9">
        <button
          type="button"
          onClick={() => onNavigate(2)}
          aria-label="Go to Meeting and Pickup Info"
          className="flex w-full items-start gap-4 text-left transition-opacity hover:opacity-80"
        >
          <StepBadge number={2} active={isActive} completed={isCompleted} error={hasError} />
          <div className="pt-0.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Meeting and Pickup Info</h2>
              {tour.meetingMode === 'pickup' || tour.meetingMode === 'meeting_point' ? (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  tour.meetingMode === 'pickup'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {tour.meetingMode === 'pickup' ? 'Pickup' : 'Meeting point'}
                </span>
              ) : null}
            </div>
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key="activity-active"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-5 p-7 sm:p-9"
          >
            {meetingSummaryCard}

            {showPickupLocation && (
              <div className="space-y-4">
                {/* GetYourGuide-style pickup selection — drawn zones are selectable
                    chips; location-only areas (a saved point, no zone) are a
                    list. The map preview below shows a pin per spot. The
                    address is validated against the same geoshapes the server
                    checks. */}
                {!contact.pickupLater && (zonesDrawn || hasPointAreas) && pickupAreasList.length > 0 && (
                  <div>
                    <FieldLabel tooltip={
                      zonesDrawn
                        ? 'Pick the zone closest to where you are staying — the exact pickup point is confirmed with you directly.'
                        : 'Pick the pickup point closest to where you are staying — the exact pickup time is confirmed with you directly.'
                    }>
                      {zonesDrawn ? 'Choose your pickup zone' : 'Choose your pickup point'}
                    </FieldLabel>
                    {zonesDrawn ? (
                      <div className="flex flex-wrap gap-2">
                        {pickupAreasList.map((a) => {
                          const selected = contact.pickupArea === a.name
                          return (
                            <button
                              key={a.name}
                              type="button"
                              onClick={() => handlePickupAreaSelect(a.name)}
                              aria-pressed={selected}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                                selected
                                  ? 'border-[#179237] bg-[#179237] text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#179237]/60 hover:text-[#179237]'
                              }`}
                            >
                              <MapPin className="size-3.5 shrink-0" />
                              {a.name}
                              {a.time && !selected && (
                                <span className="text-[10px] font-semibold text-slate-400">pickup {compactTime(a.time)} min before</span>
                              )}
                              {a.time && selected && (
                                <span className="text-[10px] font-semibold text-white/80">pickup {compactTime(a.time)} min before</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {pickupAreasList.map((a) => {
                          const selected = contact.pickupArea === a.name
                          return (
                            <li key={a.name}>
                              <button
                                type="button"
                                onClick={() => handlePickupAreaSelect(a.name)}
                                aria-pressed={selected}
                                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                                  selected
                                    ? 'border-[#179237] bg-[#179237]/5 ring-1 ring-[#179237]/40'
                                    : 'border-slate-200 bg-white hover:border-[#179237]/50'
                                }`}
                              >
                                <MapPin className={`mt-0.5 size-4 shrink-0 ${selected ? 'text-[#179237]' : 'text-slate-400'}`} />
                                <span className="min-w-0 flex-1">
                                  <span className={`block text-sm font-semibold ${selected ? 'text-[#179237]' : 'text-slate-800'}`}>{a.name}</span>
                                  {a.address && a.address !== a.name && (
                                    <span className="block truncate text-xs text-slate-500">{a.address}</span>
                                  )}
                                </span>
                                {a.time && (
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${selected ? 'bg-[#179237]/10 text-[#179237]' : 'bg-slate-100 text-slate-600'}`}>
                                    pickup {compactTime(a.time)} min before
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}

                <div>
                  <FieldLabel required={!contact.pickupLater} tooltip="Where should the tour operator pick you up? Search for your address and pick a suggestion so we can confirm you are inside a pickup zone.">Pickup Location</FieldLabel>
                  {contact.pickupLater ? (
                    <div className="space-y-2">
                      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/20 px-4 py-3 text-sm text-slate-400">
                        Pickup location will be chosen later.
                      </p>
                      <p className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-800">
                        Please remember to verify your pickup location before the activity/experience date.
                      </p>
                    </div>
                  ) : (
                    <>
                      <LocationPicker
                        value={contact.location}
                        onChange={(v) => onContactChange('location', v)}
                        onCoordsChange={(lat, lng) => {
                          onContactChange('pickupLat', lat)
                          onContactChange('pickupLng', lng)
                          // A chosen address supersedes any picked zone.
                          if (lat != null && lng != null) onContactChange('pickupArea', '')
                        }}
                        onBlur={() => handleBlur('location')}
                        placeholder="e.g. Accra, Ghana"
                        valid={locationValid}
                        error={locationInvalidMessage}
                      />

                      {/* Live zone verdict — GetYourGuide-style reassurance. */}
                      {!contact.pickupArea && zoneStatus === 'in_area' && matchedArea && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3.5 py-2.5">
                          <Check className="mt-0.5 size-4 shrink-0 text-[#179237]" />
                          <div className="text-sm text-emerald-900">
                            <p className="font-semibold">
                              Good news — you{'’'}re in the <span className="underline underline-offset-2">{matchedArea.name}</span> pickup zone!
                            </p>
                            {matchedArea.time && (
                              <p className="mt-0.5 text-xs text-emerald-700">
                                Pickup {compactTime(matchedArea.time)} min before the activity starts
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {!contact.pickupArea && zoneStatus === 'outside' && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/70 bg-rose-50/60 px-3.5 py-2.5">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" />
                          <p className="text-sm text-rose-700">
                            This address isn{'’'}t inside any of the pickup zones. Pick a zone above or choose an address we cover.
                          </p>
                        </div>
                      )}
                      {!contact.pickupArea && zoneStatus === 'excluded' && matchedArea && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/70 bg-rose-50/60 px-3.5 py-2.5">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" />
                          <p className="text-sm text-rose-700">
                            This address falls inside a no-pickup zone{matchedArea.name ? ` for \u201C${matchedArea.name}\u201D` : ''} — choose a different address or zone.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!contact.pickupLater && contact.pickupArea && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3.5 py-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[#179237]" />
                    <div className="min-w-0 flex-1 text-sm text-emerald-900">
                      <p className="font-semibold">
                        Pickup zone: <span className="underline underline-offset-2">{contact.pickupArea}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-700">
                        The exact pickup point and time are confirmed with you directly.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePickupAreaSelect(contact.pickupArea)}
                      className="shrink-0 rounded p-1 text-emerald-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                      aria-label={`Remove pickup zone ${contact.pickupArea}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={!!contact.pickupLater}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onContactChange('location', '')
                        onContactChange('pickupArea', '')
                      }
                      onContactChange('pickupLater', e.target.checked)
                    }}
                    className="mt-0.5 size-4 shrink-0 rounded border-slate-300 bg-white text-[#179237] accent-[#179237] [color-scheme:light] focus:ring-[#179237]/20"
                  />
                  <span className="text-sm text-slate-600">Choose a pick up location later</span>
                </label>
              </div>
            )}

            {showZoneMap && locationMap}
            {pickupPhoto}

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/40 bg-slate-50/30 px-4 py-3">
              <Globe className="size-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Tour Language</span>
              <span className="text-sm text-slate-400">{tour.language}</span>
            </div>

            {!locationValid && (Object.keys(touched).length > 0 || hasError) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg bg-rose-50 px-4 py-2.5 text-center text-xs font-semibold text-rose-600"
              >
                Please fill in all required fields correctly before proceeding.
              </motion.p>
            )}

            <div className="flex justify-end pt-2">
              <motion.button
                onClick={onNext}
                disabled={!locationValid || disabled}
                whileTap={{ scale: 0.97 }}
                className={`inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold shadow-sm transition ${
                  locationValid && !disabled
                    ? 'bg-emerald-600 text-white hover:brightness-110 cursor-pointer'
                    : 'cursor-not-allowed bg-slate-200 text-white'
                }`}
              >
                {disabled ? 'Hold Expired' : 'Next'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {!isActive && (
          <motion.div
            key="activity-collapsed"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 p-7 sm:p-9"
          >
            {meetingSummaryCard}
            {showZoneMap && locationMap}
            {pickupPhoto}
            {hasError && (
              <p className="pt-1 text-xs font-semibold text-rose-500">There are errors in this step — please review.</p>
            )}
            {isCompleted && (
              <button type="button" onClick={() => onNavigate(2)} className="text-sm font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
                Edit
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </StepCard>

      {/* Pickup locations map modal — opens from the "Pickup locations (N)" link. */}
      <AnimatePresence>
        {showMapModal && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseMap}
          >
            <motion.div
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-bold text-slate-900">
                  Pickup locations ({pickupSpotCount})
                </h3>
                <button
                  type="button"
                  onClick={handleCloseMap}
                  className="grid size-9 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close map"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-3">
                {locationMap}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ─── Step 3 – Payment Details ─── */

function PaymentDetailsStep({
  data, onChange, tour, onBook, step, onNavigate, disabled, isBooking,
}: {
  data: { paymentTiming: string; paymentMethod: string }
  onChange: (key: string, value: string) => void
  tour: typeof FALLBACK_TOUR
  onBook: (paymentMethodId: string, timing?: 'now' | 'later') => void
  step: number
  onNavigate: (n: number) => void
  disabled?: boolean
  isBooking?: boolean
}) {
  const isActive = step === 3
  const isCompleted = step > 3
  const [cardHandle, setCardHandle] = useState<CardElementHandle | null>(null)
  const [creating, setCreating] = useState(false)

  const buttonLabel = data.paymentTiming === 'later' ? 'Reserve Now' : 'Pay Now'

  const paymentSummary = (
    <div className="space-y-2 text-sm text-slate-600">
      <p><span className="font-semibold text-slate-800">When to pay:</span> {data.paymentTiming === 'now' ? `Pay now — $${tour.price.toFixed(2)}` : 'Reserve now, pay later'}</p>
    </div>
  )

  return (
    <StepCard id="booking-step-3">
      <div className="border-b border-slate-100/60 px-7 py-6 sm:px-9">
        <button
          type="button"
          onClick={() => onNavigate(3)}
          aria-label="Go to Payment Details"
          className="flex w-full items-start gap-4 text-left transition-opacity hover:opacity-80"
        >
          <StepBadge number={3} active={isActive} completed={isCompleted} />
          <div className="pt-0.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Payment Details</h2>
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key="payment-active"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6 p-7 sm:p-9"
          >
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">Choose when to pay</p>
              <div className="space-y-2">
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                  data.paymentTiming === 'now'
                    ? 'border-emerald-300 bg-emerald-50/30 shadow-sm'
                    : 'border-slate-200/60 bg-white hover:border-slate-300'
                }`}>
                  <div className={`grid size-5 shrink-0 place-items-center rounded-full border-2 transition ${
                    data.paymentTiming === 'now' ? 'border-emerald-500' : 'border-slate-300'
                  }`}>
                    {data.paymentTiming === 'now' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="size-2.5 rounded-full bg-emerald-500"
                      />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">Pay now</span>
                  <span className="shrink-0 text-sm font-bold text-slate-900">${tour.price.toFixed(2)}</span>
                  <input type="radio" name="paymentTiming" className="sr-only" checked={data.paymentTiming === 'now'} onChange={() => onChange('paymentTiming', 'now')} />
                </label>

                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all sm:items-center ${
                  data.paymentTiming === 'later'
                    ? 'border-emerald-300 bg-emerald-50/30 shadow-sm'
                    : 'border-slate-200/60 bg-white hover:border-slate-300'
                }`}>
                  <div className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition sm:mt-0 ${
                    data.paymentTiming === 'later' ? 'border-emerald-500' : 'border-slate-300'
                  }`}>
                    {data.paymentTiming === 'later' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="size-2.5 rounded-full bg-emerald-500"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-slate-900">Reserve now, pay later</span>
                    <p className="text-xs text-slate-400">Book your spot and pay nothing today</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-bold text-slate-900">$0.00</span>
                    <p className="text-[10px] text-slate-400">now</p>
                  </div>
                  <input type="radio" name="paymentTiming" className="sr-only" checked={data.paymentTiming === 'later'} onChange={() => onChange('paymentTiming', 'later')} />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/40 bg-slate-50/30 p-6 text-center">
              <p className="text-2xl font-bold text-slate-900 tracking-tight">${tour.price.toFixed(2)}</p>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                {freeCancellationDateLabel(tour.cancellation || '', tour.selectedDate || tour.dateISO || '')}
              </div>
            </div>

            <CardField onReady={setCardHandle} />

            <p className="text-xs leading-relaxed text-slate-400">
              By clicking &quot;{buttonLabel}&quot;, you agree to our{' '}
              <a href="#" className="font-semibold underline text-slate-500 hover:text-slate-700">Terms</a> &amp;{' '}
              <a href="#" className="font-semibold underline text-slate-500 hover:text-slate-700">Privacy and Cookies Statement</a>
              , plus the tour operator&apos;s rules &amp; regulations.
            </p>

            <motion.button
              onClick={async () => {
                if (!cardHandle) {
                  toast.error('Please enter your card details to continue.')
                  return
                }
                setCreating(true)
                try {
                  const { paymentMethod, error } = await cardHandle.createPaymentMethod()
                  if (error || !paymentMethod) {
                    toast.error(error?.message || 'Please check your card details and try again.')
                    return
                  }
                  onBook(paymentMethod.id, data.paymentTiming as 'now' | 'later')
                } finally {
                  setCreating(false)
                }
              }}
              disabled={disabled || creating || isBooking}
              whileTap={{ scale: 0.97 }}
              className={`relative w-full rounded-full py-3.5 text-sm font-bold text-white shadow-sm transition ${
                disabled || creating || isBooking
                  ? 'cursor-not-allowed bg-slate-300'
                  : 'bg-emerald-600 hover:brightness-110'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isBooking ? 'booking' : creating ? 'creating' : disabled ? 'expired' : buttonLabel}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="inline-block"
                >
                  {isBooking ? 'Booking…' : creating ? 'Creating…' : disabled ? 'Hold Expired' : buttonLabel}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <p className="text-[11px] leading-relaxed text-slate-400">
              Your booking is facilitated by our platform, but a third-party tour operator provides the
              tour/activity directly to you. By clicking &quot;Book Now&quot;, you consent to receive
              special offers, tips and other updates from us, from which you can unsubscribe at any time.
            </p>
          </motion.div>
        )}

        {!isActive && (
          <motion.div
            key="payment-collapsed"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 p-7 sm:p-9"
          >
            {paymentSummary}
            {isCompleted && (
              <button type="button" onClick={() => onNavigate(3)} className="text-sm font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
                Edit
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </StepCard>
  )
}

/* ─── Tour card ─── */

function BookingTourCard({ tour, onChangeClick }: { tour: typeof FALLBACK_TOUR; onChangeClick: () => void }) {
  const { t } = useTranslation()
  const stars = useMemo(() => {
    const full = Math.floor(tour.rating)
    return Array.from({ length: 5 }, (_, i) => i < full)
  }, [tour.rating])

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/40 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
      <div className="flex gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight text-slate-900 line-clamp-2">{tour.title}</h3>
          <p className="mt-0.5 text-xs text-slate-400">By <span className="font-semibold text-slate-600">{tour.provider}</span></p>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-sm font-bold text-slate-900">{tour.rating}</span>
            <div className="flex items-center gap-0.5">
              {stars.map((filled, i) => (
                <Star key={i} className={`size-3 ${filled ? 'fill-emerald-500 text-emerald-500' : 'text-slate-200'}`} />
              ))}
            </div>
            <span className="text-xs text-slate-400">({tour.reviews})</span>
          </div>
        </div>
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/40">
          <OptimizedImage src={tour.image} alt={tour.title} className="h-full w-full object-cover" width={400} />
        </div>
      </div>

      <div className="border-t border-slate-100/60 px-5 py-3 space-y-2">
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">Destination</span>
            <span className="text-slate-400"> · {tour.location || t('tourDetail.defaultLocation')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="size-3.5 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">Date</span>
            <span className="text-slate-400"> · {formatDayMonthYear(tour.selectedDate || tour.dateISO || '') || tour.date}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="size-3.5 shrink-0 text-emerald-600" />
          <span className="font-semibold text-slate-700">
            {tour.scheduleType === 'fixedTimeSlot' && tour.selectedTime
              ? 'Time'
              : tour.scheduleType === 'fixedTimeSlot' ? 'Time slots' : 'Opening hours'}
          </span>
          <span>
            {tour.scheduleType === 'fixedTimeSlot' && tour.selectedTime
              ? formatTime12h(tour.selectedTime)
              : tour.scheduleType === 'fixedTimeSlot'
                ? (formatTimeSlotList(tour.timeSlots) || scheduleTimeLabel(tour))
                : scheduleTimeLabel(tour)}
          </span>
        </div>
        {tour.duration && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="size-3.5 shrink-0 text-emerald-600" />
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">Duration</span>
              <span className="text-slate-400"> · {tour.duration}</span>
            </p>
          </div>
        )}
        {tour.travelers && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users className="size-3.5 shrink-0 text-emerald-600" />
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">Travelers</span>
              <span className="text-slate-400"> · {tour.travelers}</span>
            </p>
          </div>
        )}
        {tour.language && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Globe className="size-3.5 shrink-0 text-emerald-600" />
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">Language</span>
              <span className="text-slate-400"> · {tour.language}</span>
            </p>
          </div>
        )}
        {tour.ticketValidity && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Ticket className="size-3.5 shrink-0 text-emerald-600" />
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">Ticket validity</span>
              <span className="text-slate-400"> · {normalizeTicketValidity(tour.ticketValidity)}</span>
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100/60 px-5 py-3">
        <span className="text-sm font-semibold text-slate-700">Total</span>
        <span className="text-2xl font-extrabold text-slate-900 tracking-tight">${tour.price.toFixed(2)}</span>
      </div>

      <div className="border-t border-slate-100/60 px-5 py-3">
        <button onClick={onChangeClick} className="text-sm font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
          Change
        </button>
      </div>

      <div className="border-t border-slate-100/60 px-5 py-3 space-y-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">Cancellation policy</span>
            {' • '}
            <span>{freeCancellationDateLabel(tour.cancellation || '', tour.selectedDate || tour.dateISO || '')}</span>
          </p>
        </div>
        <div className="flex items-start gap-2">
          <CreditCard className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">Reserve now, pay later</span>
            {' • '}
            <span>Book your spot and pay nothing today</span>
          </p>
        </div>
        <div className="flex items-start gap-2">
          <CalendarCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">Book ahead</span>
            {' • '}
            <span>Reserve now to secure your preferred date and time</span>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Sidebar (contact / pricing summary) ─── */

function BookingSidebar({
  tour, promoCode, setPromoCode, onApplyPromo, discount, finalPrice,
  contact, step,
}: {
  tour: typeof FALLBACK_TOUR
  promoCode: string
  setPromoCode: (v: string) => void
  onApplyPromo: () => void
  discount: number
  finalPrice: number
  contact: { firstName: string; lastName: string; email: string; countryCode: string; phone: string; location: string; pickupLater: boolean; pickupArea: string }
  step: number
}) {
  const showPricing = step === 3

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      {step > 1 && contact.firstName && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
          className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
        >
          <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Lead Traveler Details</p>
          <div className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800">{contact.firstName} {contact.lastName}</p>
              <p className="text-xs text-slate-400">{contact.email}</p>
              <p className="text-xs text-slate-400">{buildE164Phone(contact.countryCode, contact.phone) ?? contact.phone}</p>
              {contact.location && <p className="text-xs text-slate-400">{contact.location}</p>}
              {contact.pickupArea && !contact.location && <p className="text-xs text-slate-400">Pickup zone: {contact.pickupArea}</p>}
              {contact.pickupLater && !contact.location && (
                <p className="text-xs text-slate-400">Pickup location: to be chosen later</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {showPricing && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
          className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
        >
          <p className="mb-3 text-sm font-semibold text-slate-800">Promo Code</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              className="flex-1 rounded-xl border border-slate-200/60 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              onClick={onApplyPromo}
              className="rounded-full border border-slate-200/60 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-400 hover:text-emerald-600"
            >
              Apply
            </button>
          </div>
        </motion.div>
      )}

      {showPricing && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
          className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Total</span>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">${tour.price.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-emerald-600">Promo discount</span>
                <span className="font-semibold text-emerald-600">-${discount.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                <span className="text-sm font-semibold text-slate-700">Final total</span>
                <span className="text-2xl font-extrabold text-emerald-600 tracking-tight">${finalPrice.toFixed(2)}</span>
              </div>
            </>
          )}
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        <p className="text-sm font-bold text-slate-900">Need help?</p>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <a href="tel:+18337642166" className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-emerald-600 transition-colors">
            <Phone className="size-4" /> +1 833 764 2166
          </a>
          <button type="button" className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-emerald-600 transition-colors">
            <MessageSquare className="size-4" /> Chat now
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Main Page ─── */

const STORAGE_KEY = 'booking_draft'

const DEFAULT_CONTACT = { firstName: '', lastName: '', email: '', countryCode: '+233', phone: '', location: '', pickupLater: false, pickupLat: null as number | null, pickupLng: null as number | null, pickupArea: '' }
const DEFAULT_PAYMENT = { paymentTiming: 'now' as 'now' | 'later', paymentMethod: 'card' }

interface EditableTourState {
  date: string
  time: string
  travelers: string
  travelersCount: Record<string, number>
  adults: number
  children: number
  infants: number
  selectedDate: string
  selectedTime: string | null
  price: number
}

interface BookingDraftData {
  tour?: unknown
  tourId?: string
  contact?: Partial<typeof DEFAULT_CONTACT>
  editableTour?: EditableTourState
  step?: number
  payment?: Partial<typeof DEFAULT_PAYMENT>
}

function readBookingDraft(): BookingDraftData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as BookingDraftData) : null
  } catch {
    return null
  }
}

function buildEditableTour(tour: typeof FALLBACK_TOUR): EditableTourState {
  const travelersCount =
    tour.travelersCount && typeof tour.travelersCount === 'object'
      ? (tour.travelersCount as Record<string, number>)
      : { adults: 1, children: 0, infants: 0 }
  return {
    date: String(tour.dateISO || tour.selectedDate || tour.date || ''),
    time: scheduleTimeLabel(tour),
    travelers: String(tour.travelers || '1 adult'),
    travelersCount,
    adults: Number(tour.adults) || 1,
    children: Number(tour.children) || 0,
    infants: Number(tour.infants) || 0,
    selectedDate: String(tour.selectedDate || tour.dateISO || ''),
    selectedTime: (tour.selectedTime as string | null | undefined) ?? null,
    price: Number(tour.price) || 0,
  }
}

export default function BookingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Read the persisted draft once so every piece of booking state can be
  // initialized synchronously from it. Restored data is therefore present from
  // the very first render — a refresh or the sign-in round-trip never starts
  // the form over from empty (no fragile mount-effect restore ordering).
  const draft = useMemo(() => readBookingDraft(), [])
  const freshTour = location.state?.tour

  // Restore the tour from router state when arriving fresh from a tour detail
  // page, otherwise fall back to the persisted draft (refresh / sign-in
  // round-trip) so the booking never loses its tour context.
  const [tour] = useState(() => freshTour || draft?.tour || FALLBACK_TOUR)

  // Only restore the form fields when we're NOT arriving fresh (i.e. this is a
  // sign-in/refresh round-trip) and the stored draft belongs to this tour —
  // otherwise a draft from a previous booking would bleed its data in.
  const canRestore = !freshTour && Boolean(draft) && draft?.tourId === (tour.id || tour.slug)

  const user = useAuthUser()

  const [step, setStep] = useState(() =>
    canRestore && typeof draft?.step === 'number' && draft.step >= 1 && draft.step <= 3 ? draft.step : 1,
  )
  const [attempted, setAttempted] = useState<Record<number, boolean>>({})
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)

  const [contact, setContact] = useState(() =>
    canRestore && draft?.contact ? { ...DEFAULT_CONTACT, ...draft.contact } : DEFAULT_CONTACT,
  )

  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false)
  const [editableTour, setEditableTour] = useState<EditableTourState>(() =>
    canRestore && draft?.editableTour ? draft.editableTour : buildEditableTour(tour),
  )
  const [payment, setPayment] = useState(() =>
    canRestore && draft?.payment ? { ...DEFAULT_PAYMENT, ...draft.payment } : DEFAULT_PAYMENT,
  )
  const [isBooking, setIsBooking] = useState(false)

  const [isActive, setIsActive] = useState(false)

  const [isExpired, setIsExpired] = useState(false)
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const lastActivityAt = useRef(0)

  // Bring a restored later step into view (mount-only; no state changes).
  useEffect(() => {
    if (canRestore && step > 1) {
      requestAnimationFrame(() => {
        document.getElementById(`booking-step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Save draft to localStorage on field changes (also persists the tour on
     first arrival so a refresh / sign-in round-trip can restore it). */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tour,
        tourId: tour.id || tour.slug,
        contact,
        editableTour,
        step,
        payment,
      }))
    } catch { /* ignore */ }
  }, [tour, contact, editableTour, step, payment])

  const clearDraft = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  /* Validation */
  // The pickup location option only renders for tours where pickup is included
  // (the supplier's Step-13 "pickup" mode or the pickupIncluded flag).
  // Meeting-point / self-guided tours ('meeting_point' or 'none') have
  // travellers make their own way, so the field is hidden there.
  const showPickupLocation = tour.meetingMode === 'pickup' || tour.pickupIncluded === true

  // Geoshape-aware pickup validation (mirrors the backend's geoUtils verdict):
  // once the supplier has drawn service zones, a typed address only counts
  // when it resolves inside a zone (or the traveller picks a named zone).
  // Legacy tours without drawn zones keep the old name-only rule.
  const zonesDrawn = useMemo(
    () => (tour.pickupAreas || []).some((a: PickupAreaShape) => !!a && Array.isArray(a.polygon) && a.polygon.length >= 3),
    [tour.pickupAreas],
  )
  const hasPointAreas = useMemo(
    () => hasLocationOnlyAreas(tour.pickupAreas || []),
    [tour.pickupAreas],
  )
  const pickupZoneStatusValue = useMemo(
    () =>
      showPickupLocation && !contact.pickupLater
        ? pickupZoneStatus({ name: contact.location, lat: contact.pickupLat, lng: contact.pickupLng }, tour.pickupAreas || [])
        : 'none',
    [showPickupLocation, contact.pickupLater, contact.location, contact.pickupLat, contact.pickupLng, tour.pickupAreas],
  )
  const pickupLocationValid = useMemo(
    () =>
      !showPickupLocation ||
      isPickupLocationSatisfied({
        pickupLater: contact.pickupLater,
        pickedArea: contact.pickupArea,
        typed: contact.location,
        status: pickupZoneStatusValue,
        zonesDrawn,
        hasLocationOnlyAreas: hasPointAreas,
      }),
    [showPickupLocation, contact.pickupLater, contact.pickupArea, contact.location, pickupZoneStatusValue, zonesDrawn, hasPointAreas],
  )

  const contactValid = useMemo(() => ({
    firstName: contact.firstName.trim().length > 1,
    lastName: contact.lastName.trim().length > 1,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email),
    phone: isValidPhoneInput(contact.countryCode, contact.phone),
    all: contact.firstName.trim().length > 1 && contact.lastName.trim().length > 1 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && isValidPhoneInput(contact.countryCode, contact.phone),
  }), [contact])

  // The pickup location lives in the Meeting and Pickup Info step, so it's
  // validated here rather than in the Lead Traveler Details step. A pickup
  // location isn't required when the traveller opts to choose it later, or for
  // tours without pickup (meeting-point / self-guided).
  const locationValid = pickupLocationValid

  const trackActivity = () => { lastActivityAt.current = Date.now() }

  const handleContactChange = (key: string, value: string | boolean | number | null) => {
    trackActivity()
    setContact((prev) => ({ ...prev, [key]: value }))
  }
  const handlePaymentChange = (key: string, value: string) => {
    trackActivity()
    setPayment((prev) => ({ ...prev, [key]: value }))
  }

  const scrollToStep = (n: number) => {
    requestAnimationFrame(() => {
      document.getElementById(`booking-step-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  /* Clickable-step navigation with validation: jumping forward is only allowed
     when every preceding step is valid. If a previous step has errors, navigate
     to it instead, flag it and tell the user what's wrong. */
  const goToStep = (target: number) => {
    if (target < 1 || target > 3) return

    if (target > step) {
      if (!contactValid.all) {
        setAttempted((p) => ({ ...p, 1: true }))
        setStep(1)
        scrollToStep(1)
        return
      }
      if (target > 2 && !locationValid) {
        setAttempted((p) => ({ ...p, 2: true }))
        setStep(2)
        scrollToStep(2)
        return
      }
    }

    setStep(target)
    if (target !== step) scrollToStep(target)
  }

  const contactHasError = !contactValid.all && attempted[1] === true
  const meetingHasError = !locationValid && attempted[2] === true

  const handleExpire = () => {
    setIsExpired(true)
    setShowExpiredModal(true)
  }

  const handleRehold = () => {
    lastActivityAt.current = Date.now()
    setIsExpired(false)
    setShowExpiredModal(false)
    trackActivity()
  }

  const handleSignInPrompt = () => {
    setShowSignInPrompt(false)
    setAuthReturnTo('/booking')
    navigate('/login')
  }

  const handleSaveAndLeave = () => {
    clearDraft()
    navigate('/')
  }

  const createBooking = useCreateBooking()

  // Poll the backend until the webhook reconciles the booking after the
  // server-side Stripe confirm. We do NOT optimistically show success: a
  // card that needs 3DS can still fail, and the webhook arrives async.
  // Reserve-now-pay-later reservations count as success once the booking is
  // committed (PENDING until the deferred charge is collected).
  const pollBooking = useCallback(async (bookingId: string) => {
    if (!bookingId) return
    setIsActive(true)
    const maxAttempts = 30
    try {
      for (let i = 0; i < maxAttempts; i++) {
        let booking: { status?: string; paymentStatus?: string; paymentTiming?: 'now' | 'later'; id: string } | null = null
        try {
          const res = await fetchWithAuth(`/expedition/bookings/${encodeURIComponent(bookingId)}`)
          const payload = await res.json().catch(() => ({}))
          booking = payload.data?.booking ?? payload.data ?? null
        } catch (e: unknown) {
          if (e && typeof e === 'object' && 'status' in e && (e as { status?: number }).status === 404) {
            // Booking not yet committed on the read path — keep polling briefly.
            booking = null
          }
        }

        if (booking) {
          const { status, paymentStatus, paymentTiming } = booking
          // Success: paid, confirmed, OR a reserve-now-pay-later reservation
          // that's secured (status PENDING / paymentStatus PENDING until the
          // deferred charge lands).
          const payLaterReserved = paymentTiming === 'later' && status === 'PENDING' && paymentStatus === 'PENDING'
          if (paymentStatus === 'SUCCEEDED' || status === 'CONFIRMED' || payLaterReserved) {
            toast.success(payLaterReserved ? 'Reservation confirmed!' : 'Booking confirmed!')
            clearDraft()
            queryClient.invalidateQueries({ queryKey: ['expedition', 'bookings'] })
            navigate(`/booking/confirmation/${encodeURIComponent(booking.id)}`)
            return
          }
          if (paymentStatus === 'FAILED' || status === 'CANCELLED') {
            toast.error('Your booking could not be confirmed — your card was not charged.')
            return
          }
        }

        await new Promise((r) => setTimeout(r, 2000))
      }

      // Webhook still hasn't landed — tell the user it's still processing (not
      // a success) and let the backend's stale-PENDING cleanup reconcile later.
      console.warn('[Booking] polling timed out; booking still settling. Backend cleanup will reconcile.')
    } finally {
      setIsActive(false)
    }
  }, [navigate, queryClient])

  const handleBook = useCallback(async (paymentMethodId: string, timing?: 'now' | 'later') => {
    if (isBooking || isActive) return
    if (!user) {
      setShowSignInPrompt(true)
      return
    }
    if (!paymentMethodId) {
      toast.error('Please enter your card details to continue.')
      return
    }
    const paymentTiming = timing ?? payment.paymentTiming ?? 'now'

    setIsBooking(true)
    try {
      // Lead traveler's phone (Lead Traveler Details step) is the booking
      // contact for pickup and last-minute updates.
      const phoneNumber = buildE164Phone(contact.countryCode, contact.phone)
      if (!phoneNumber) {
        toast.error('Please enter a valid international phone number, e.g. +233 24 123 4567.')
        return
      }
      const fullName = `${contact.firstName} ${contact.lastName}`.trim()
      const detailsName = fullName || undefined
      const details = detailsName ? [{ name: detailsName, age: 30, ageGroup: 'adult' }] : []

      // Authoritative per-category map (adults/children/infants + any supplier
      // categories like seniors/students) so every category is priced at its
      // own rate on confirm.
      const counts: Record<string, number> = editableTour.travelersCount || { adults: 1, children: 0, infants: 0 }

      // Resolved pickup selection, validated and snapshotted server-side by
      // confirmBooking (resolvePickupSelection). A named zone is sent when the
      // traveller picked one of the supplier's zones; otherwise the
      // autocomplete-resolved address + coordinates (coords stay out of the
      // legacy travelers payload on purpose).
      const hasPickupAddress = contact.pickupLat != null && contact.pickupLng != null && contact.location.trim().length > 0
      const pickupSelection =
        showPickupLocation && !contact.pickupLater && (contact.pickupArea || hasPickupAddress)
          ? {
              // Drawn geoshapes mean the server validates against zone
              // polygons (area mode) — never the location-list mode.
              mode: zonesDrawn ? 'area' : tour.pickupType || 'area',
              ...(!hasPickupAddress && contact.pickupArea ? { areaName: contact.pickupArea } : {}),
              ...(hasPickupAddress
                ? { address: { name: contact.location.trim(), address: contact.location.trim(), lat: contact.pickupLat, lng: contact.pickupLng } }
                : {}),
            }
          : undefined

      const payload = {
        tourId: tour.id || tour.slug,
        selectedDate: editableTour.selectedDate || editableTour.date,
        ...(editableTour.selectedTime ? { selectedTime: editableTour.selectedTime } : {}),
        ...(pickupSelection ? { pickup: pickupSelection } : {}),
        travelers: {
          ...counts,
          phoneNumber,
          // Only send a pickup location when one was collected (pickup-mode
          // tours); meeting-point tours leave it out entirely.
          ...(contact.location.trim() ? { location: contact.location.trim() } : {}),
          ...(contact.pickupLater ? { pickupLater: true } : {}),
          details,
        },
        paymentMethodId,
        paymentTiming,
        specialRequests: '',
      }

      const result = await createBooking.mutateAsync(payload)
      const intent = result?.paymentIntent

      // If the backend needs a 3DS challenge, complete it client-side before
      // polling for the settled booking state.
      if (intent?.requiresAction && intent.clientSecret) {
        toast('Please complete the 3D Secure verification…')
        const stripe = await getStripePromise()
        if (stripe) {
          await stripe.handleCardAction(intent.clientSecret)
        }
      }

      await pollBooking(result?.booking?.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed. Please try again.'
      toast.error(msg)
    } finally {
      setIsBooking(false)
    }
  }, [createBooking, contact, editableTour, tour, showPickupLocation, zonesDrawn, isBooking, isActive, pollBooking, user, payment.paymentTiming])

  const handleApplyPromo = useCallback(() => {
    const code = promoCode.trim().toUpperCase()
    if (code === 'SAVE10') {
      setDiscount(Math.min(editableTour.price * 0.1, editableTour.price))
    } else if (code === 'SAVE20') {
      setDiscount(Math.min(editableTour.price * 0.2, editableTour.price))
    } else {
      setDiscount(0)
      if (code) toast.error('Invalid promo code')
    }
  }, [promoCode, editableTour.price])

  const finalPrice = editableTour.price - discount
  const activeTour = { ...tour, ...editableTour, price: finalPrice }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="relative flex items-center justify-center px-4 pt-5 sm:justify-between sm:px-6 lg:px-8">
        <motion.button
          onClick={() => navigate(-1)}
          whileTap={{ scale: 0.97 }}
          aria-label="Back"
          className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex size-10 items-center justify-center rounded-full border border-slate-200/60 bg-white text-slate-400 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600 sm:hidden"
        >
          <ArrowLeft className="size-4" />
        </motion.button>
        <a href="/" className="inline-flex items-center gap-2">
          <img src={logoSrc} alt="Expedition-GO" className="h-[140px] w-auto sm:h-[110px]" />
        </a>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-1 sm:px-6 lg:px-8">
          <motion.button
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.97 }}
            aria-label="Back"
            className="mb-2 hidden size-10 items-center justify-center rounded-full border border-slate-200/60 bg-white text-slate-400 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600 sm:inline-flex"
          >
            <ArrowLeft className="size-4" />
          </motion.button>

          <div className="rounded-[2.5rem] bg-[#f9fafb] p-4 sm:p-6 lg:p-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="sticky top-0 z-10 mb-6 bg-[#f9fafb] pt-4 md:hidden">
              <HoldTimer onExpire={handleExpire} lastActivityAt={lastActivityAt} isExpired={isExpired} />
            </div>

            <div className="grid gap-8 md:grid-cols-[1fr_380px]">
              <div className="min-w-0 space-y-6">
                {/* On mobile the tour card leads, then the form follows. */}
                <div className="md:hidden">
                  <BookingTourCard tour={activeTour} onChangeClick={() => setIsChangeModalOpen(true)} />
                </div>
                <ContactDetailsStep
                  data={contact}
                  onChange={handleContactChange}
                  onNext={() => goToStep(2)}
                  valid={contactValid}
                  step={step}
                  onNavigate={goToStep}
                  hasError={contactHasError}
                  disabled={isExpired}
                />
                <ActivityDetailsStep
                  tour={activeTour}
                  onNext={() => goToStep(3)}
                  step={step}
                  onNavigate={goToStep}
                  hasError={meetingHasError}
                  disabled={isExpired}
                  contact={{ location: contact.location, pickupLater: contact.pickupLater, pickupLat: contact.pickupLat, pickupLng: contact.pickupLng, pickupArea: contact.pickupArea }}
                  onContactChange={handleContactChange}
                  showPickupLocation={showPickupLocation}
                  locationValid={locationValid}
                />
                <PaymentDetailsStep
                  data={payment}
                  onChange={handlePaymentChange}
                  tour={activeTour}
                  onBook={handleBook}
                  step={step}
                  onNavigate={scrollToStep}
                  disabled={isExpired}
                  isBooking={isBooking}
                />
              </div>

              <aside className="md:sticky md:top-28 md:self-start">
                <div className="space-y-4">
                  <div className="hidden md:block">
                    <HoldTimer onExpire={handleExpire} lastActivityAt={lastActivityAt} isExpired={isExpired} />
                  </div>
                  <div className="hidden md:block">
                    <BookingTourCard tour={activeTour} onChangeClick={() => setIsChangeModalOpen(true)} />
                  </div>
                  <BookingSidebar
                    tour={activeTour}
                    promoCode={promoCode}
                    setPromoCode={setPromoCode}
                    onApplyPromo={handleApplyPromo}
                    discount={discount}
                    finalPrice={finalPrice}
                    contact={{ firstName: contact.firstName, lastName: contact.lastName, email: contact.email, countryCode: contact.countryCode, phone: contact.phone, location: contact.location, pickupLater: contact.pickupLater, pickupArea: contact.pickupArea }}
                    step={step}
                  />
                </div>
              </aside>
            </div>
          </motion.div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isChangeModalOpen && (
          <ChangeBookingModal
            tour={activeTour}
            isOpen={isChangeModalOpen}
            onClose={() => setIsChangeModalOpen(false)}
            initialTravelers={(activeTour.adults || 0) + (activeTour.children || 0) + (activeTour.infants || 0)}
            initialDate={editableTour.selectedDate || ''}
            travelersCount={editableTour.travelersCount}
            onReserve={(updates) => setEditableTour((prev) => {
              // The modal prices a specific travellers mix; use that exact
              // payload so the displayed total matches what gets confirmed.
              const payload = updates.travelersPayload ?? { ...(prev.travelersCount || {}), adults: updates.travelersCount || 1 }
              return {
                ...prev,
                ...updates,
                travelersCount: payload,
                adults: typeof payload.adults === 'number' ? payload.adults : (prev.adults || 0),
                children: typeof payload.children === 'number' ? payload.children : (prev.children || 0),
                infants: typeof payload.infants === 'number' ? payload.infants : (prev.infants || 0),
                price: updates.price,
              }
            })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExpiredModal && (
          <ExpiredHoldModal
            contact={contact}
            onRehold={handleRehold}
            onSaveAndLeave={handleSaveAndLeave}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignInPrompt && (
          <SignInPromptModal
            onSignIn={handleSignInPrompt}
            onClose={() => setShowSignInPrompt(false)}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
