import { useState, type MouseEvent } from 'react'
import { CalendarDays, Users, MapPin, Ticket, ChevronRight, Copy, Check, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ExpeditionBookingSummary } from '../../hooks/useExpeditionBookings'
import {
  bookingStatusMeta,
  formatMediumDate,
  formatTimeString,
  partyLabel,
} from '../../lib/bookingUi'

interface BookingCardProps {
  booking: ExpeditionBookingSummary
}

export default function BookingCard({ booking }: BookingCardProps) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const meta = bookingStatusMeta(booking.status, booking.paymentTiming, booking.paymentStatus)
  const open = () => navigate(`/dashboard/bookings/${booking.id}`)
  const party = partyLabel(booking.party)

  const copyRef = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const ref = booking.bookingNumber
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
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  const canManage = booking.status === 'PENDING' || booking.status === 'CONFIRMED'

  return (
    <article className="bk-card" onClick={open}>
      <div className="bk-media">
        {booking.tourImage ? (
          <img src={booking.tourImage} alt="" loading="lazy" />
        ) : (
          <div className="bk-media-fallback">
            <MapPin size={20} />
          </div>
        )}
      </div>

      <div className="bk-body">
        <div className="bk-top">
          <span className={`bk-chip bk-chip-${meta.kind}`}>
            <span className="bk-chip-dot" />
            {meta.label}
          </span>
          {booking.pickupDeferred && canManage && (
            <span className="bk-chip bk-chip-attention-soft">Pickup to be arranged</span>
          )}
        </div>

        <h3 className="bk-title">{booking.tourTitle}</h3>

        <p className="bk-ref">
          <Ticket size={13} />
          <code>{booking.bookingNumber}</code>
          <button
            type="button"
            className={`bk-copy${copied ? ' is-copied' : ''}`}
            onClick={copyRef}
            aria-label={`Copy booking reference ${booking.bookingNumber}`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </p>

        <div className="bk-meta">
          <span className="bk-meta-date">
            <CalendarDays size={14} />
            {formatMediumDate(booking.travelDate)}
            {booking.selectedTime && (
              <>
                <span className="bk-meta-sep">·</span>
                <span className="bk-meta-time">
                  <Clock size={12} />
                  {formatTimeString(booking.selectedTime)}
                </span>
              </>
            )}
          </span>
          {party && (
            <span className="bk-meta-item">
              <Users size={14} />
              {party}
            </span>
          )}
          {booking.tourLocation && (
            <span className="bk-meta-item">
              <MapPin size={14} />
              {booking.tourLocation}
            </span>
          )}
        </div>
      </div>

      <div className="bk-actions">
        {canManage && (
          <button type="button" className="bk-btn bk-btn-secondary" onClick={(e) => { e.stopPropagation(); open() }}>
            Manage booking
          </button>
        )}
        <button type="button" className="bk-btn bk-btn-primary" onClick={(e) => { e.stopPropagation(); open() }}>
          View voucher / ticket
          <ChevronRight size={15} />
        </button>
      </div>
    </article>
  )
}
