import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Ticket,
  Copy,
  Check,
  Printer,
  CalendarDays,
  Users,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Navigation,
} from 'lucide-react'
import { useChat } from '../../chat/ChatContext'
import { useExpeditionBookingDetail, useCancelBooking } from '../../hooks/useExpeditionBookings'
import { extractMeetingInfo, formatDuration } from '../../hooks/useExpeditionTours'
import { currencySymbol } from '../../lib/currencySymbol'
import {
  bookingStatusMeta,
  evaluateCancellationPolicy,
  formatFullDate,
  formatTimeString,
  partyLabel,
  toFiniteNumber,
  formatDeadlineLabel,
  type PartyCount,
} from '../../lib/bookingUi'
import BookingPointMap from './BookingPointMap'
import TourItineraryPreview from '../../pages/tour-detail/TourItineraryPreview'
import { extractItinerary } from '../../hooks/useExpeditionTours'
import './bookingTheme.css'
import './BookingWorkspace.css'

interface TravelerRow {
  name?: string
  age?: number | string
  ageGroup?: string
  specialRequests?: string
}

interface TravelersJson {
  adults?: number
  children?: number
  infants?: number
  phoneNumber?: string
  location?: string
  details?: TravelerRow[]
}

function copyText(value: string): Promise<boolean> {
  return (async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value)
        return true
      }
    } catch {
      /* fall through */
    }
    const el = document.createElement('textarea')
    el.value = value
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      document.body.removeChild(el)
    }
  })()
}

function startLabel(detail: Record<string, unknown>, pickupTime?: string | null): string {
  const slot = typeof detail.selectedTime === 'string' ? detail.selectedTime : ''
  if (slot) return formatTimeString(slot)
  if (pickupTime) return `Pickup ${formatTimeString(pickupTime)}`
  return 'Flexible'
}

const KNOW_BEFORE_PREVIEW_COUNT = 5

function KnowBeforeYouGo({
  included,
  excluded,
  notes,
  highlights,
}: {
  included: string[]
  excluded: string[]
  notes: string
  highlights: string[]
}) {
  const [expanded, setExpanded] = useState(false)
  const hasLongList = included.length > KNOW_BEFORE_PREVIEW_COUNT || excluded.length > KNOW_BEFORE_PREVIEW_COUNT
  const visibleInc = expanded ? included : included.slice(0, KNOW_BEFORE_PREVIEW_COUNT)
  const visibleExc = expanded ? excluded : excluded.slice(0, KNOW_BEFORE_PREVIEW_COUNT)
  const truncated = !expanded && hasLongList

  return (
    <section className="ws-card ws-know-before">
      <h2 className="ws-card-title">Know before you go</h2>

      {highlights.length > 0 && (
        <div className="ws-kwb-section">
          <h3 className="ws-kwb-subtitle">Highlights</h3>
          <ul className="ws-kwb-list ws-kwb-highlights">
            {highlights.map((item, i) => (
              <li key={i} className="ws-kwb-item">
                <CheckCircle2 size={15} className="ws-kwb-icon ws-kwb-icon-highlight" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {included.length > 0 && (
        <div className="ws-kwb-section">
          <h3 className="ws-kwb-subtitle">What&apos;s included</h3>
          <ul className="ws-kwb-list">
            {visibleInc.map((item, i) => (
              <li key={i} className="ws-kwb-item">
                <CheckCircle2 size={15} className="ws-kwb-icon ws-kwb-icon-inc" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {excluded.length > 0 && (
        <div className="ws-kwb-section">
          <h3 className="ws-kwb-subtitle">What&apos;s not included</h3>
          <ul className="ws-kwb-list">
            {visibleExc.map((item, i) => (
              <li key={i} className="ws-kwb-item">
                <XCircle size={15} className="ws-kwb-icon ws-kwb-icon-exc" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes && (
        <div className="ws-kwb-section">
          <h3 className="ws-kwb-subtitle">Notes from the activity provider</h3>
          <p className="ws-kwb-notes">{notes}</p>
        </div>
      )}

      {truncated && (
        <button
          type="button"
          className="ws-kwb-toggle"
          onClick={() => setExpanded(true)}
        >
          Show all <ChevronDown size={14} />
        </button>
      )}
      {expanded && hasLongList && (
        <button
          type="button"
          className="ws-kwb-toggle"
          onClick={() => setExpanded(false)}
        >
          Show less <ChevronUp size={14} />
        </button>
      )}
    </section>
  )
}

export default function BookingWorkspace({ id, onClose }: { id?: string; onClose?: () => void }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const detailQuery = useExpeditionBookingDetail(id)
  const detail = detailQuery.data as Record<string, any> | undefined
  const cancelBooking = useCancelBooking()

  const tour = detail?.tour && typeof detail.tour === 'object' ? (detail.tour as Record<string, any>) : null
  const rawSupplier =
    tour?.supplier && typeof tour.supplier === 'object'
      ? (tour.supplier as Record<string, unknown>)
      : null
  const supplierName = typeof rawSupplier?.name === 'string' ? rawSupplier.name : ''
  const supplierPhone = typeof rawSupplier?.phone === 'string' ? rawSupplier.phone : ''
  const operatorId = typeof rawSupplier?.id === 'string' ? rawSupplier.id : ''
  const operatorPhoto = typeof rawSupplier?.photoURL === 'string' ? rawSupplier.photoURL : null
  const chat = useChat()
  const travelDate = typeof detail?.travelDate === 'string' ? detail.travelDate : ''
  const meeting = useMemo(() => extractMeetingInfo(tour ?? {}), [tour])

  const travelers = ((detail?.travelers ?? {}) as TravelersJson) || {}
  const party: PartyCount = {
    adults: Number(travelers.adults) || 0,
    children: Number(travelers.children) || 0,
    infants: Number(travelers.infants) || 0,
    total:
      (travelers.details?.length ?? 0) > 0
        ? travelers.details!.length
        : (Number(travelers.adults) || 0) + (Number(travelers.children) || 0) + (Number(travelers.infants) || 0),
  }
  const leadName =
    travelers.details?.[0]?.name || (typeof detail?.leadTravelerName === 'string' ? detail.leadTravelerName : '') || ''

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
    pickup && (pickup.pickupLater || pickup.skipValidation || pickup.status === 'deferred')
  )
  const pickupTime = pickup?.time ? String(pickup.time) : null
  const pickupInstructionsText =
    typeof pickup?.instructions === 'string' ? pickup.instructions.trim() : ''
  // Customer-facing location: the exact pickup point when one is stored; the
  // supplier zone label is operator context only and is never shown to customers.
  const pickupAddressText = String(pickupAddress?.name || pickupAddress?.address || '').trim()
  const pickupPrimary = pickupAddressText || pickupLocation
  const pickupKicker = pickupAddressText
    ? 'Pickup point'
    : pickup?.areaName
      ? 'Pickup area'
      : 'Pickup location'

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
    meeting.meetingMode === 'meeting_point' && (meeting.meetingPoint || meeting.meetingPointAddress || arrivalLabel)
  const bookingIsPickup = meeting.meetingMode === 'pickup'

  const mapPoint = useMemo(() => {
    if (!pickup && !hasMeeting) return null
    if (pickup) {
      const lat = toFiniteNumber(pickup.lat)
      const lng = toFiniteNumber(pickup.lng)
      if (lat != null && lng != null) return { lat, lng }
      const aLat = pickupAddress ? toFiniteNumber(pickupAddress.lat) : null
      const aLng = pickupAddress ? toFiniteNumber(pickupAddress.lng) : null
      if (aLat != null && aLng != null) return { lat: aLat, lng: aLng }
      if (pickup?.areaName) {
        const zone = (meeting.pickupAreas as { name?: string; address?: string; lat?: number; lng?: number }[]).find(
          (a) => a && (a.name === pickup.areaName || a.address === pickup.areaName)
        )
        const zLat = toFiniteNumber(zone?.lat)
        const zLng = toFiniteNumber(zone?.lng)
        if (zLat != null && zLng != null) return { lat: zLat, lng: zLng }
      }
      return null
    }
    const mLat = meeting.meetingPointLat
    const mLng = meeting.meetingPointLng
    if (mLat != null && mLng != null) return { lat: mLat, lng: mLng }
    return null
  }, [pickup, pickupAddress, hasMeeting, meeting])

  const status = typeof detail?.status === 'string' ? detail.status : ''
  const isPaid = detail?.paymentStatus === 'SUCCEEDED'
  const meta = bookingStatusMeta(status, detail?.paymentTiming ?? null, detail?.paymentStatus ?? null)
  const activeStatus = status === 'PENDING' || status === 'CONFIRMED'

  const currency = typeof detail?.currency === 'string' ? detail.currency : 'USD'
  const gross = Number(detail?.grossAmount ?? 0) || 0

  const cancellation = useMemo(
    () =>
      evaluateCancellationPolicy(
        tour?.bookingAndTickets,
        typeof detail?.travelDate === 'string' ? detail.travelDate : undefined
      ),
    [tour, detail]
  )
  const showCancel = activeStatus && !!detail && cancellation.allowed
  const policyNote = (() => {
    if (!detail) return ''
    if (cancellation.type === 'all_sales_final' || cancellation.refundPct === 0) {
      return 'This booking is non-refundable — no refund will be issued.'
    }
    if (cancellation.allowed) {
      if (!isPaid) return 'Reserved — no payment has been taken yet.'
      if (cancellation.refundPct >= 100) {
        return cancellation.windowHours > 0 && cancellation.deadline
          ? `Free cancellation — full refund until ${formatDeadlineLabel(cancellation.deadline)}.`
          : 'Free cancellation — full refund.'
      }
      return `Cancellation available — you will receive a ${cancellation.refundPct}% refund.`
    }
    return cancellation.deadline
      ? `Free cancellation ended ${formatDeadlineLabel(cancellation.deadline)}.`
      : 'Cancellations are no longer available for this booking.'
  })()

  const copyReference = async () => {
    if (!detail?.bookingNumber) return
    if (await copyText(String(detail.bookingNumber))) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  const handleCancel = () => {
    if (!detail?.id) return
    setCancelError(null)
    const refundLine = !isPaid
      ? 'This reservation has not been charged — no payment will be taken.'
      : cancellation.refundPct <= 0
        ? 'This booking is non-refundable and no refund will be issued.'
        : cancellation.refundPct >= 100
          ? 'Free cancellation — you will receive a full refund.'
          : `A ${cancellation.refundPct}% partial refund will be issued per the cancellation policy.`
    const confirmed = window.confirm(`Cancel this booking?\n\n${refundLine}`)
    if (!confirmed) return

    cancelBooking.mutate(
      { id: detail.id, reason: 'Customer requested cancellation' },
      {
        onSuccess: closeDetail,
        onError: (err: Error) => setCancelError(err.message),
      }
    )
  }

  const closeDetail = () => {
    if (onClose) onClose()
    else navigate('/dashboard/bookings')
  }
  const back = closeDetail
  const statusMeta = meta

  // Open a SUPPLIER_CUSTOMER conversation with this booking's operator — the
  // same thread the operator opens via Bookings → "Message customer". Reuses
  // any existing thread with the operator (including a prior support thread,
  // e.g. SUPPLIER_CUSTOMER or EXPEDITION_CUSTOMER, when the operator doubles as
  // the support identity) so we never strand messages in a duplicate. Falls
  // back to the shared Expedition support channel when the tour has no
  // operator user.
  const handleMessageOperator = async () => {
    try {
      if (operatorId) {
        const existing = chat.conversations
          .filter(
            (c) =>
              (c.type === 'SUPPLIER_CUSTOMER' || c.type === 'EXPEDITION_CUSTOMER') &&
              c.participants?.some((p) => p.userId === operatorId),
          )
          .sort((a, b) => {
            const aHas = (a.messages?.length ?? 0) > 0 ? 1 : 0
            const bHas = (b.messages?.length ?? 0) > 0 ? 1 : 0
            if (aHas !== bHas) return bHas - aHas
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          })[0]

        if (existing) {
          chat.openConversation(existing.id)
          navigate(`/dashboard/chat?conversation=${existing.id}`)
          return
        }

        const conv = await chat.startChat(
          { id: operatorId, name: supplierName || 'Operator', photoURL: operatorPhoto },
          'SUPPLIER_CUSTOMER',
        )
        navigate(`/dashboard/chat?conversation=${conv.id}`)
        return
      }
      await chat.openSupportChat()
      navigate('/dashboard/chat')
    } catch {
      toast.error('Unable to open chat. Please try again.')
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="ws">
        <button type="button" className="ws-back" onClick={back}>
          <ArrowLeft size={15} /> Back to bookings
        </button>
        <div className="ws-skel-block" aria-hidden="true">
          <div className="bk-skel ws-skel-title" />
          <div className="bk-skel ws-skel-sub" />
          <div className="bk-skel ws-skel-card" />
        </div>
      </div>
    )
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="ws">
        <button type="button" className="ws-back" onClick={back}>
          <ArrowLeft size={15} /> Back to bookings
        </button>
        <div className="bk-state ws-error">
          <AlertTriangle size={26} />
          <h3>Couldn't load this booking</h3>
          <p>It may no longer be available. Head back to your bookings and try again.</p>
          <button type="button" className="bk-btn bk-btn-primary" onClick={back}>
            Back to bookings
          </button>
        </div>
      </div>
    )
  }

  const title = tour?.title || (typeof detail.tourTitle === 'string' ? detail.tourTitle : 'Booking')
  const duration = tour?.durationMinutes ? formatDuration(Number(tour.durationMinutes)) : ''

  // Extract product content for includes/excludes/itinerary/knowBeforeYouGo
  const productContent = tour?.productContent && typeof tour.productContent === 'object'
    ? (tour.productContent as Record<string, any>)
    : null
  const includedItems: string[] = Array.isArray(productContent?.included) ? productContent.included : []
  const excludedItems: string[] = Array.isArray(productContent?.excluded) ? productContent.excluded : []
  const knowBeforeYouGo = typeof productContent?.knowBeforeYouGo === 'string' ? productContent.knowBeforeYouGo
    : typeof productContent?.additionalInfo === 'string' ? productContent.additionalInfo : ''
  const highlights: string[] = Array.isArray(productContent?.highlights) ? productContent.highlights : []
  const itinerary = extractItinerary(detail.tour)

  // Drop-off info
  const btData = tour?.bookingAndTickets && typeof tour.bookingAndTickets === 'object'
    ? (tour.bookingAndTickets as Record<string, any>)
    : null
  const dropoffOption = productContent?.dropoffOption || btData?.dropoffOption || ''
  const dropoffLocationName = productContent?.dropoffLocation?.name || btData?.dropoffLocation?.name || ''
  const dropoffLocationAddr = productContent?.dropoffLocation?.address || btData?.dropoffLocation?.address || ''
  const hasDropoff = dropoffOption === 'different_location' && (dropoffLocationName || dropoffLocationAddr)

  return (
    <div className="ws">
      <button type="button" className="ws-back no-print" onClick={back}>
        <ArrowLeft size={15} /> Back to bookings
      </button>

      <header className="ws-head">
        <div className="ws-head-top">
          <span className={`bk-chip bk-chip-${statusMeta.kind}`}>
            <span className="bk-chip-dot" />
            {statusMeta.label}
          </span>
          <span className="ws-paid">{isPaid ? `Paid ${currencySymbol(currency)}${gross.toFixed(2)}` : 'Reserved'}</span>
        </div>
        <h1 className="ws-title">{title}</h1>
        {duration && (
          <p className="ws-duration"><Clock size={14} /> Duration: {duration}</p>
        )}
        <p className="ws-ref">
          <span className="ws-ref-label">Booking</span>
          <Ticket size={13} />
          <code>{detail.bookingNumber}</code>
          <button type="button" className={`bk-copy${copied ? ' is-copied' : ''}`} onClick={copyReference}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </p>
      </header>

      {policyNote && activeStatus && !showCancel && (
        <p className="ws-policy-note no-print">
          <Info size={15} /> {policyNote}
        </p>
      )}

      <div className="ws-layout">
        <div className="ws-main">
          {/* Digital ticket */}
          <section className="ws-card ws-voucher">
            <div className="ws-voucher-top">
              <span className="ws-eyebrow">Digital ticket</span>
              <span className="ws-voucher-check">
                <Ticket size={14} /> Show at check-in
              </span>
            </div>
            <div className="ws-voucher-code">
              <span className="ws-voucher-label">Booking reference</span>
              <code>{detail.bookingNumber}</code>
            </div>
            <dl className="ws-voucher-facts">
              {leadName && (
                <div>
                  <dt>Lead traveler</dt>
                  <dd>{leadName}</dd>
                </div>
              )}
              {party.total > 0 && (
                <div>
                  <dt>Travelers</dt>
                  <dd>{partyLabel(party)}</dd>
                </div>
              )}
              <div>
                <dt>Date</dt>
                <dd>{formatFullDate(travelDate)}</dd>
              </div>
            </dl>
            <button type="button" className="bk-btn bk-btn-secondary bk-btn-sm no-print" onClick={() => window.print()}>
              <Printer size={14} /> Download PDF ticket
            </button>
          </section>

          {/* Trip details */}
          <section className="ws-card">
            <h2 className="ws-card-title">Trip details</h2>
            <dl className="ws-grid">
              <div className="ws-grid-row">
                <dt><CalendarDays size={15} /> Date</dt>
                <dd>{formatFullDate(travelDate)}</dd>
              </div>
              <div className="ws-grid-row">
                <dt><Clock size={15} /> Start</dt>
                <dd>{startLabel(detail, pickupTime)}</dd>
              </div>
              <div className="ws-grid-row">
                <dt><Users size={15} /> Travelers</dt>
                <dd>
                  {partyLabel(party) || '—'}
                  {Array.isArray(travelers.details) && travelers.details.length > 1 && (
                    <span className="ws-subtext">
                      {travelers.details
                        .map(
                          (t, i) =>
                            `${t.name || `Traveler ${i + 1}`}${t.age != null ? ` (${t.age})` : ''}${t.ageGroup ? ` · ${t.ageGroup}` : ''}`
                        )
                        .join(', ')}
                    </span>
                  )}
                </dd>
              </div>
              {pickupInstructionsText && (
                <div className="ws-grid-row">
                  <dt><Info size={15} /> Additional info</dt>
                  <dd>
                    <span className="ws-subtext">{pickupInstructionsText}</span>
                  </dd>
                </div>
              )}
              {hasDropoff && (
                <div className="ws-grid-row">
                  <dt><Navigation size={15} /> Drop-off</dt>
                  <dd>
                    {dropoffLocationName && <span>{dropoffLocationName}</span>}
                    {dropoffLocationAddr && dropoffLocationAddr !== dropoffLocationName && (
                      <span className="ws-subtext">{dropoffLocationAddr}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
            {typeof detail.specialRequests === 'string' && detail.specialRequests && (
              <p className="ws-note">
                Special requests: {detail.specialRequests}
              </p>
            )}
          </section>

          {/* Know before you go */}
          {(includedItems.length > 0 || excludedItems.length > 0 || knowBeforeYouGo || highlights.length > 0) && (
            <KnowBeforeYouGo
              included={includedItems}
              excluded={excludedItems}
              notes={knowBeforeYouGo}
              highlights={highlights}
            />
          )}

          {/* Itinerary */}
          {itinerary.length > 0 && (
            <section className="ws-card ws-itinerary-card">
              <TourItineraryPreview
                itinerary={itinerary}
                meeting={meeting}
                dropoff={productContent ? {
                  dropoffOption: productContent.dropoffOption,
                  dropoffLocation: productContent.dropoffLocation?.name,
                  dropoffLocationAddress: productContent.dropoffLocation?.address,
                  dropoffDescription: productContent.dropoffDescription,
                } : undefined}
                accommodationIncluded={!!productContent?.transportationProvided}
                meals={productContent?.meals}
                dayLogistics={productContent?.dayLogistics}
              />
            </section>
          )}

          {/* Where to go */}
          {(bookingIsPickup || hasMeeting) && (
            <section className="ws-card">
              <h2 className="ws-card-title">Where to go</h2>
              {bookingIsPickup ? (
                pickupDeferred || !pickupLocation ? (
                  <div className="ws-amber">
                    <p className="ws-amber-title">
                      {pickupDeferred ? 'Pickup location not yet assigned' : 'Pickup details pending'}
                    </p>
                    <p className="ws-amber-text">
                      We&rsquo;ll contact you to arrange it, or add your location now.
                    </p>
                    {activeStatus && (
                      <button
                        type="button"
                        className="bk-btn bk-btn-primary bk-btn-sm no-print"
                        onClick={() => navigate(`/booking/${detail.id}/pickup`)}
                      >
                        Add pickup location
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {mapPoint && (
                      <BookingPointMap lat={mapPoint.lat} lng={mapPoint.lng} label={pickupAddressText || pickupLocation} />
                    )}
                    <div className="ws-loc">
                      <p className="ws-loc-kicker">
                        <MapPin size={13} /> {pickupKicker}
                      </p>
                      <p className="ws-loc-title">{pickupPrimary}</p>
                    </div>
                    {activeStatus && (
                      <button
                        type="button"
                        className="ws-link no-print"
                        onClick={() => navigate(`/booking/${detail.id}/pickup`)}
                      >
                        Update pickup
                      </button>
                    )}
                  </>
                )
              ) : hasMeeting ? (
                <>
                  {mapPoint && (
                    <BookingPointMap
                      lat={mapPoint.lat}
                      lng={mapPoint.lng}
                      label={[meeting.meetingPoint, meeting.meetingPointAddress].filter(Boolean).join(' — ')}
                    />
                  )}
                  <div className="ws-loc">
                    <p className="ws-loc-kicker">
                      <MapPin size={13} /> Meeting point
                    </p>
                    <p className="ws-loc-title">
                      {[meeting.meetingPoint, meeting.meetingPointAddress].filter(Boolean).join(' — ')}
                    </p>
                    {arrivalLabel && <p className="ws-loc-sub">{arrivalLabel}</p>}
                    {meeting.meetingPointDescription && (
                      <p className="ws-loc-sub">{meeting.meetingPointDescription}</p>
                    )}
                  </div>
                </>
              ) : null}
            </section>
          )}
        </div>

        {/* Right rail — actions + operator */}
        <aside className="ws-aside no-print">
          {/* Manage this booking */}
          <section className="ws-card ws-manage-card">
            <h2 className="ws-card-title">Manage your booking</h2>

            {/* Cancellation info */}
            {activeStatus && (
              <div className="ws-manage-section">
                <p className="ws-manage-label">Cancellation policy</p>
                {policyNote && <p className="ws-manage-policy">{policyNote}</p>}
                {cancellation.deadline && cancellation.allowed && (
                  <p className="ws-manage-deadline">
                    <Clock size={13} />
                    Deadline: {formatDeadlineLabel(cancellation.deadline)}
                  </p>
                )}
                {showCancel && (
                  <button
                    type="button"
                    className="bk-btn bk-btn-danger ws-action-btn"
                    onClick={handleCancel}
                    disabled={cancelBooking.isPending}
                  >
                    {cancelBooking.isPending ? 'Cancelling…' : 'Cancel booking'}
                  </button>
                )}
                {cancelError && <p className="ws-cancel-error">{cancelError}</p>}
              </div>
            )}

            {!activeStatus && policyNote && (
              <div className="ws-manage-section">
                <p className="ws-manage-policy">{policyNote}</p>
              </div>
            )}

            {/* Contact provider */}
            {supplierName && (
              <div className="ws-manage-section ws-manage-contact">
                <p className="ws-manage-label">Organized by</p>
                <div className="ws-operator-row">
                  {operatorPhoto ? (
                    <button
                      type="button"
                      className="ws-operator-avatar-btn"
                      onClick={handleMessageOperator}
                      title={`Message ${supplierName}`}
                    >
                      <img src={operatorPhoto} alt={supplierName} className="ws-operator-avatar" />
                      <span className="ws-operator-avatar-badge">
                        <MessageCircle size={11} />
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ws-operator-avatar-btn ws-operator-avatar-fallback"
                      onClick={handleMessageOperator}
                      title={`Message ${supplierName}`}
                    >
                      <span className="ws-operator-avatar-initial">
                        {supplierName.charAt(0).toUpperCase()}
                      </span>
                      <span className="ws-operator-avatar-badge">
                        <MessageCircle size={11} />
                      </span>
                    </button>
                  )}
                  <div className="ws-operator-info">
                    <p className="ws-manage-operator">{supplierName}</p>
                    {supplierPhone && (
                      <a className="ws-operator-phone" href={`tel:${supplierPhone}`}>
                        <Phone size={12} /> {supplierPhone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Need help? */}
          <section className="ws-card">
            <h2 className="ws-card-title">Need help?</h2>
            <p className="ws-help-text">
              For questions about meeting or pickup point, activity details, or special requests, contact your activity provider.
            </p>
            {supplierPhone && (
              <a className="ws-help-link" href={`tel:${supplierPhone}`}>
                <Phone size={14} /> {supplierPhone}
              </a>
            )}
            <button
              type="button"
              className="bk-btn bk-btn-secondary ws-action-btn"
              onClick={handleMessageOperator}
            >
              <MessageCircle size={15} /> Message your activity provider
            </button>
          </section>
        </aside>
      </div>

      {/* Footer message */}
      <div className="ws-footer-thanks">
        <p className="ws-thanks-text">
          <strong>Thanks for booking with us and enjoy your journey.</strong>
        </p>
      </div>
    </div>
  )
}
