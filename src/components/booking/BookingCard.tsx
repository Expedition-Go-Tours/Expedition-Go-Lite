import { useState, type MouseEvent } from 'react'
import {
  CalendarDays,
  Users,
  MapPin,
  Ticket,
  ChevronRight,
  Copy,
  Check,
  Clock,
} from 'lucide-react'
import { currencySymbol } from '../../lib/currencySymbol'
import type { ExpeditionBookingSummary } from '../../hooks/useExpeditionBookings'
import {
  bookingStatusMeta,
  formatMediumDate,
  formatTimeString,
  partyLabel,
} from '../../lib/bookingUi'

interface BookingCardProps {
  booking: ExpeditionBookingSummary
  onOpen: () => void
}

export default function BookingCard({ booking, onOpen }: BookingCardProps) {
  const [copied, setCopied] = useState(false)
  const meta = bookingStatusMeta(booking.status, booking.paymentTiming, booking.paymentStatus)
  const party = partyLabel(booking.party)
  const isPaid = booking.paymentStatus === 'SUCCEEDED'
  const symbol = booking.currency === 'GHS' ? 'GHâ‚µ' : currencySymbol(booking.currency)
  const amount = `${symbol}${booking.total.toFixed(2)}`
  const time = booking.selectedTime ? formatTimeString(booking.selectedTime) : ''
  const canManage = booking.status === 'PENDING' || booking.status === 'CONFIRMED'

  const copyRef = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    let ok = false
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(booking.bookingNumber)
        ok = true
      }
    } catch {
      ok = false
    }
    if (!ok) {
      const el = document.createElement('textarea')
      el.value = booking.bookingNumber
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

  return (
    <article className="bk-card" onClick={onOpen}>
      <div className="bk-media">
        {booking.tourImage ? (
          <img src={booking.tourImage} alt="" loading="lazy" />
        ) : (
          <div className="bk-media-fallback">
            <Ticket size={24} />
          </div>
        )}
      </div>

      <div className="bk-body">
        <div className="bk-topline">
          <span className={`bk-chip bk-chip-${meta.kind}`}>
            <span className="bk-chip-dot" />
            {meta.label}
          </span>
          {booking.pickupDeferred && (
            <span className="bk-chip bk-chip-attention-soft">Pickup to be arranged</span>
          )}
          <span className={`bk-amount${isPaid ? '' : ' is-reserved'}`}>
            {isPaid ? `Paid ${amount}` : `${amount} reserved`}
          </span>
        </div>

        <h3 className="bk-title">{booking.tourTitle}</h3>

        <p className="bk-ref">
          <Ticket size={12} />
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

        <div className="bk-facts">
          <span className="bk-fact bk-fact-date">
            <CalendarDays size={14} />
            {formatMediumDate(booking.travelDate)}
            {time && (
              <span className="bk-fact-time">
                <Clock size={12} />
                {time}
              </span>
            )}
          </span>
          {party && (
            <span className="bk-fact">
              <Users size={14} />
              {party}
            </span>
          )}
          {booking.tourLocation && (
            <span className="bk-fact">
              <MapPin size={14} />
              {booking.tourLocation}
            </span>
          )}
        </div>

        <div className="bk-actions">
          {canManage && (
            <button
              type="button"
              className="bk-btn bk-btn-secondary bk-btn-sm bk-manage"
              onClick={(e) => {
                e.stopPropagation()
                onOpen()
              }}
            >
              Manage booking
            </button>
          )}
          <button
            type="button"
            className="bk-open"
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
          >
            View voucher / ticket
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}
