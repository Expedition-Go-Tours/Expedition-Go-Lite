import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  Mail,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { useExpeditionBookingDetail, useCancelBooking } from '../../hooks/useExpeditionBookings'
import { extractMeetingInfo } from '../../hooks/useExpeditionTours'
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

export default function BookingWorkspace() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
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
  const supplierEmail = typeof rawSupplier?.email === 'string' ? rawSupplier.email : ''
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
    const refundLine =
      cancellation.refundPct <= 0
        ? 'This booking is non-refundable and no refund will be issued.'
        : cancellation.refundPct >= 100
          ? 'Free cancellation — you will receive a full refund.'
          : `A ${cancellation.refundPct}% partial refund will be issued per the cancellation policy.`
    const confirmed = window.confirm(`Cancel this booking?\n\n${refundLine}`)
    if (!confirmed) return

    cancelBooking.mutate(
      { id: detail.id, reason: 'Customer requested cancellation' },
      {
        onSuccess: () => navigate('/dashboard/bookings'),
        onError: (err: Error) => setCancelError(err.message),
      }
    )
  }

  const back = () => navigate('/dashboard/bookings')
  const statusMeta = meta

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
            </dl>
            {typeof detail.specialRequests === 'string' && detail.specialRequests && (
              <p className="ws-note">
                Special requests: {detail.specialRequests}
              </p>
            )}
          </section>

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
                    <div className="ws-where">
                      <MapPin size={16} />
                      <div>
                        <p className="ws-where-value">{pickupLocation}</p>
                        {(() => {
                          const addrTxt = String(pickupAddress?.name || pickupAddress?.address || '').trim()
                          return addrTxt && addrTxt !== pickupLocation ? (
                            <p className="ws-where-sub">{addrTxt}</p>
                          ) : null
                        })()}
                        {pickupTime && (
                          <p className="ws-where-time">Pickup {formatTimeString(pickupTime)}</p>
                        )}
                        {typeof pickup?.instructions === 'string' && pickup.instructions && (
                          <p className="ws-where-sub">{String(pickup.instructions)}</p>
                        )}
                      </div>
                    </div>
                    {mapPoint && <BookingPointMap lat={mapPoint.lat} lng={mapPoint.lng} label={pickupLocation} />}
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
                  <div className="ws-where">
                    <MapPin size={16} />
                    <div>
                      <p className="ws-where-value">
                        {[meeting.meetingPoint, meeting.meetingPointAddress].filter(Boolean).join(' — ')}
                      </p>
                      {arrivalLabel && <p className="ws-where-sub">{arrivalLabel}</p>}
                      {meeting.meetingPointDescription && (
                        <p className="ws-where-sub">{meeting.meetingPointDescription}</p>
                      )}
                    </div>
                  </div>
                  {mapPoint && (
                    <BookingPointMap
                      lat={mapPoint.lat}
                      lng={mapPoint.lng}
                      label={meeting.meetingPoint || meeting.meetingPointAddress || ''}
                    />
                  )}
                </>
              ) : null}
            </section>
          )}
        </div>

        {/* Right rail — actions + operator */}
        <aside className="ws-aside no-print">
          {activeStatus && (
            <section className="ws-card">
              <h2 className="ws-card-title">Manage this booking</h2>
              <div className="ws-actions">
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
              </div>
              {cancelError && <p className="ws-cancel-error">{cancelError}</p>}
              {showCancel && policyNote && <p className="ws-subtext">{policyNote}</p>}
            </section>
          )}

          <section className="ws-card">
            <h2 className="ws-card-title">Need help?</h2>
            <button
              type="button"
              className="bk-btn bk-btn-secondary ws-action-btn"
              onClick={() => navigate('/dashboard/chat')}
            >
              <MessageCircle size={15} /> Message the operator
            </button>
            {supplierName && (
              <div className="ws-contact">
                <p className="ws-contact-name">{supplierName}</p>
                {supplierPhone && (
                  <a className="ws-contact-link" href={`tel:${supplierPhone}`}>
                    <Phone size={13} /> {supplierPhone}
                  </a>
                )}
                {supplierEmail && (
                  <a className="ws-contact-link" href={`mailto:${supplierEmail}`}>
                    <Mail size={13} /> {supplierEmail}
                  </a>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
