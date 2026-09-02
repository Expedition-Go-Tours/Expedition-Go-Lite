import { useState, type MouseEvent } from 'react'
import { CalendarDays, Users, MapPin, Ticket, ChevronRight, Copy, Check } from 'lucide-react'
import { currencySymbol } from '../../lib/currencySymbol'
import type { ExpeditionBookingSummary } from '../../hooks/useExpeditionBookings'
import { bookingStatusMeta, formatMediumDate, formatTimeString, partyLabel } from '../../lib/bookingUi'

interface BookingCardProps {
  booking: ExpeditionBookingSummary
  onOpen: () => void
}

export default function BookingCard({ booking, onOpen }: BookingCardProps) {
  const [copied, setCopied] = useState(false)
  const meta = bookingStatusMeta(booking.status, booking.paymentTiming, booking.paymentStatus)
  const party = partyLabel(booking.party)
  const isPaid = booking.paymentStatus === 'SUCCEEDED'
  const symbol = booking.currency === 'GHS' ? 'GH₵' : currencySymbol(booking.currency)
  const amount = `${symbol}${booking.total.toFixed(2)}`
  const time = booking.selectedTime ? formatTimeString(booking.selectedTime) : ''

  const metaParts = [
    `${formatMediumDate(booking.travelDate)}${time ? ` · ${time}` : ''}`,
    party,
    booking.tourLocation,
  ].filter(Boolean)

  const when = `${formatMediumDate(booking.travelDate)}${time ? ` · ${time}` : ''}`

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
            <Ticket size={22} />
          </div>
        )}
      </div>

      <div className="bk-body">
        <div className="bk-title-row">
          <h3 className="bk-title">{booking.tourTitle}</h3>
          <span className={`bk-chip bk-chip-${meta.kind}`}>
            <span className="bk-chip-dot" />
            {meta.label}
          </span>
        </div>

        <p className="bk-meta">{metaParts.length > 0 ? metaParts.join(' · ') : '—'}</p>

        {/* Phone-only richer meta (desktop keeps the single .bk-meta line). */}
        <div className="bk-meta-phone" aria-hidden="true">
          <p className="bk-when">
            <CalendarDays size={13} />
            <span>{when}</span>
          </p>
          {(party || booking.tourLocation) && (
            <p className="bk-sub">
              {party && (
                <span className="bk-sub-part">
                  <Users size={12} />
                  {party}
                </span>
              )}
              {party && booking.tourLocation && <i className="bk-sub-dot" aria-hidden="true" />}
              {booking.tourLocation && (
                <span className="bk-sub-part">
                  <MapPin size={12} />
                  {booking.tourLocation}
                </span>
              )}
            </p>
          )}
        </div>

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

        <div className="bk-foot">
          <span className={`bk-amount bk-amount-desktop${isPaid ? '' : ' is-reserved'}`}>
            {isPaid ? `Paid ${amount}` : amount}
          </span>
          <span className={`bk-amount-phone${isPaid ? '' : ' is-reserved'}`}>{amount}</span>

          <div className="bk-foot-actions">
            <button
              type="button"
              className="bk-open"
              onClick={(e) => {
                e.stopPropagation()
                onOpen()
              }}
            >
              <span className="bk-open-label-desktop">View voucher / ticket</span>
              <span className="bk-open-label-mobile">Details</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
