import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  useExpeditionBookingDetail,
  useBookingModifyQuote,
  useApplyBookingModify,
  useDiscardBookingModify,
  useBookingModifySettled,
  useTourAvailability,
  type BookingModifyChanges,
} from '../hooks/useExpeditionBookings'
import CheckoutElements, { type CheckoutElementsHandle } from '../components/booking/CheckoutElements'
import './BookingModifyPage.css'

type Phase =
  | { name: 'blocked'; reason: string }
  | { name: 'form' }
  | { name: 'payment' }
  | { name: 'paid' }
  | { name: 'applied' }
  | { name: 'error'; message: string }

interface TravelerCounts {
  [category: string]: number
}

const META_KEYS = ['phoneNumber', 'location', 'details']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function asIsoDate(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return ''
}

function parseYmd(iso: string): [number, number, number] | null {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** "Mon, Sep 9, 2026" from a YYYY-MM-DD (timezone-safe). */
function fmtDateNice(iso: string): string {
  const p = parseYmd(iso)
  if (!p) return iso || '—'
  const [y, mo, d] = p
  const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
  return `${WEEKDAYS[wd]}, ${MONTHS[mo - 1]} ${d}, ${y}`
}

/** "Sep 9" short form. */
function fmtDateShort(iso: string): string {
  const p = parseYmd(iso)
  if (!p) return iso || '—'
  return `${MONTHS[p[1] - 1]} ${p[2]}`
}

function travelerCategories(travelers: unknown): string[] {
  if (!travelers || typeof travelers !== 'object') return []
  return Object.entries(travelers as Record<string, unknown>)
    .filter(([key, val]) => !META_KEYS.includes(key) && typeof val === 'number')
    .map(([key]) => key)
}

function toCountMap(travelers: unknown, categories: string[]): TravelerCounts {
  const raw = travelers && typeof travelers === 'object' ? (travelers as Record<string, unknown>) : {}
  const out: TravelerCounts = {}
  for (const key of categories) out[key] = typeof raw[key] === 'number' ? (raw[key] as number) : 0
  return out
}

function countTotal(counts: TravelerCounts): number {
  return Object.values(counts).reduce((sum, v) => sum + (v || 0), 0)
}

function fmtMoney(amount: number | null | undefined, currency = 'USD'): string {
  const value = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

function fmtLabel(key: string): string {
  const pretty = key.charAt(0).toUpperCase() + key.replace(/([A-Z])/g, ' $1').slice(1)
  return pretty.endsWith('s') ? pretty : pretty
}

function timeLabel(value: string | null | undefined): string {
  if (!value) return 'Not set'
  if (/am|pm/i.test(value)) return value
  const m = value.match(/^(\d{1,2}):(\d{2})$/)
  if (m) {
    let h = Number(m[1])
    const mm = m[2]
    const period = h >= 12 ? 'PM' : 'AM'
    h = h % 12 === 0 ? 12 : h % 12
    return `${h}:${mm} ${period}`
  }
  return value
}

interface BookingLike {
  bookingNumber?: string
  bookingId?: string
  status?: string
  paymentTiming?: string
  paymentStatus?: string
  currency?: string
  grossAmount?: number | string | null
  travelDate?: string
  selectedTime?: string | null
  travelers?: unknown
  tour?: {
    id?: string
    slug?: string
    title?: string
    coverPhoto?: string
    durationMinutes?: number
    location?: string
    city?: string
    country?: string
    supplier?: { name?: string }
  }
  modify?: {
    allowed?: boolean
    reason?: string | null
    cutoffHours?: number | null
    deadline?: string | null
    pendingPayment?: {
      changeId: string
      amount?: number | null
      expiresAt?: string | null
    } | null
  } | null
}

function ModifyForm({ booking, bookingId, redirectStatus }: { booking: BookingLike; bookingId: string; redirectStatus: string | null }) {
  const navigate = useNavigate()
  const tour = booking.tour || {}
  const tourTitle = tour.title || 'Your trip'
  const pendingChange = booking.modify?.pendingPayment ?? null
  const currency = booking.currency || 'USD'

  const categories = useMemo(() => travelerCategories(booking.travelers), [booking.travelers])
  const [travelDate, setTravelDate] = useState(() => asIsoDate(booking.travelDate))
  const [time, setTime] = useState<string | null>(() => booking.selectedTime || null)
  const [counts, setCounts] = useState<TravelerCounts>(() => toCountMap(booking.travelers, categories))
  const [phase, setPhase] = useState<Phase>(() =>
    redirectStatus === 'succeeded'
      ? { name: 'paid' }
      : redirectStatus && redirectStatus !== 'succeeded'
        ? { name: 'error', message: 'Your payment was not completed. You can try again or discard this change.' }
        : { name: 'form' }
  )
  const [minDate] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [topupSecret, setTopupSecret] = useState<string | null>(null)
  const [topupReturnUrl, setTopupReturnUrl] = useState('')
  const elementsHandleRef = useRef<CheckoutElementsHandle | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const availability = useTourAvailability(tour.slug, travelDate, travelDate)
  const day = availability.data?.find((d) => d.date === travelDate)
  const slots = (day?.timeSlots ?? []).filter((s) => (s.remaining ?? 0) > 0)

  const currentShape = useMemo(
    () => ({
      travelDate: asIsoDate(booking.travelDate),
      selectedTime: booking.selectedTime || null,
      travelers: toCountMap(booking.travelers, categories),
    }),
    [booking.travelDate, booking.selectedTime, booking.travelers, categories]
  )

  const baseCounts = currentShape.travelers
  const activeCategories = categories.filter((k) => (baseCounts[k] ?? 0) > 0 || (counts[k] ?? 0) > 0)

  const changes: BookingModifyChanges = useMemo(() => {
    const c: BookingModifyChanges = {}
    if (travelDate && travelDate !== currentShape.travelDate) c.travelDate = travelDate
    if (time !== undefined && time !== currentShape.selectedTime) c.selectedTime = time
    const changed = categories.some((k) => (counts[k] ?? 0) !== (baseCounts[k] ?? 0))
    if (changed) {
      c.travelers = {}
      for (const k of categories) c.travelers[k] = counts[k] ?? 0
    }
    return c
  }, [travelDate, time, counts, categories, currentShape.travelDate, currentShape.selectedTime, baseCounts])

  const hasChanges = Object.keys(changes).length > 0
  const dateChanged = !!changes.travelDate
  const timeChanged = changes.selectedTime !== undefined && changes.selectedTime !== currentShape.selectedTime
  const partyChanged = !!changes.travelers

  const quoteQuery = useBookingModifyQuote(bookingId, currentShape, changes)
  const quote = quoteQuery.data?.quote
  const applyModify = useApplyBookingModify()
  const discardModify = useDiscardBookingModify()

  const paidPoll = useBookingModifySettled(bookingId, phase.name === 'paid')
  const pendingGone = phase.name === 'paid' && paidPoll.data && !paidPoll.data?.modify?.pendingPayment
  const settledApplied = phase.name === 'applied' || pendingGone

  const goBack = () => navigate(`/dashboard/bookings?booking=${bookingId}`)

  const submit = async () => {
    setPayError(null)
    try {
      const result = await applyModify.mutateAsync({ id: bookingId, changes })
      if (result.status === 'PENDING_PAYMENT' && result.payment?.clientSecret) {
        setTopupSecret(result.payment.clientSecret)
        setTopupReturnUrl(`${window.location.origin}/booking/${encodeURIComponent(bookingId)}/modify`)
        setPhase({ name: 'payment' })
        return
      }
      setPhase({ name: 'applied' })
    } catch (err) {
      setPhase({ name: 'error', message: err instanceof Error ? err.message : 'The change could not be applied. Please try again.' })
    }
  }

  const pay = async () => {
    setPaying(true)
    setPayError(null)
    const outcome = await elementsHandleRef.current?.confirm()
    if (outcome?.error?.message) {
      setPayError(outcome.error.message)
      setPaying(false)
    }
  }

  const discard = async (changeId: string) => {
    setPayError(null)
    try {
      await discardModify.mutateAsync({ id: bookingId, changeId })
      setPhase({ name: 'form' })
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Could not discard the pending change.')
    }
  }

  const bump = (key: string, delta: number) => {
    setCounts((prev) => {
      const current = Math.max(0, prev[key] ?? 0)
      const nextVal = Math.max(0, Math.min(50, current + delta))
      if (nextVal === current) return prev
      return { ...prev, [key]: nextVal }
    })
  }

  const totalNow = countTotal(baseCounts)
  const totalNext = countTotal(toCountMap(counts, categories))

  const moneyCopy = (() => {
    if (!quote) return null
    switch (quote.moneyMode) {
      case 'topup':
        return `You’ll pay the extra ${fmtMoney(quote.delta, quote.currency)} securely by card when you confirm.`
      case 'refund':
        return `${fmtMoney(Math.abs(quote.delta), quote.currency)} will be refunded to your original payment method (usually 5–10 business days).`
      case 'paylater-update':
        return `This is a reserve-now-pay-later booking — we’ll charge the updated total near your activity date.`
      default:
        return `The total stays the same — no payment needed.`
    }
  })()

  /* ---------------- Result / payment screens ---------------- */

  if (settledApplied) {
    return (
      <div className="bkmod-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1 }} className="bkmod-card bkmod-result">
          <div className="bkmod-result-icon">✓</div>
          <h2>Your trip has been updated</h2>
          <p className="bkmod-result-sub">
            {dateChanged && `New date · ${fmtDateNice(changes.travelDate!)}`}
            {dateChanged && partyChanged && <br />}
            {partyChanged && `New party · ${totalNext} traveller${totalNext === 1 ? '' : 's'}`}
          </p>
          <p>
            We’ve emailed you and the operator the updated details.
            {quote?.moneyMode === 'refund' && <> The {fmtMoney(Math.abs(quote.delta), quote.currency)} difference is being refunded to your original payment method.</>}
          </p>
          <div className="bkmod-actions bkmod-actions-center">
            <button className="bkmod-btn bkmod-btn-primary" onClick={goBack}>Back to bookings</button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (phase.name === 'error') {
    return (
      <div className="bkmod-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1 }} className="bkmod-card bkmod-result">
          <div className="bkmod-result-icon bkmod-result-icon-bad">!</div>
          <h2>We couldn’t apply that change</h2>
          <p>{phase.message}</p>
          <div className="bkmod-actions bkmod-actions-center">
            <button className="bkmod-btn bkmod-btn-primary" onClick={() => setPhase({ name: 'form' })}>Try again</button>
            <button className="bkmod-btn bkmod-btn-ghost" onClick={goBack}>Back to bookings</button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (phase.name === 'paid' && !pendingGone) {
    return (
      <div className="bkmod-center">
        <div className="bkmod-card bkmod-result">
          <div className="spinner" />
          <h2>Payment received</h2>
          <p className="bkmod-result-sub">Applying your change…</p>
        </div>
      </div>
    )
  }

  if (phase.name === 'payment' && topupSecret) {
    return (
      <div className="bkmod-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1 }} className="bkmod-card bkmod-paycard">
          <p className="bkmod-kicker">Pay the difference</p>
          <h2>{tourTitle}</h2>
          {quote && (
            <div className="bkmod-payamount">
              <span>Due now</span>
              <strong>{fmtMoney(quote.delta, quote.currency)}</strong>
            </div>
          )}
          <p className="bkmod-paynote">Your change is applied the moment this payment succeeds. Nothing else will be charged.</p>
          <CheckoutElements
            clientSecret={topupSecret}
            returnUrl={topupReturnUrl}
            onReady={(handle) => { elementsHandleRef.current = handle }}
          />
          {payError && <p className="bkmod-form-error" role="alert">{payError}</p>}
          <div className="bkmod-actions bkmod-actions-stack">
            <button className="bkmod-btn bkmod-btn-primary" disabled={paying} onClick={pay}>
              {paying ? 'Processing…' : `Pay ${fmtMoney(quote?.delta ?? 0, quote?.currency ?? currency)} now`}
            </button>
            <button
              className="bkmod-btn bkmod-btn-ghost"
              disabled={paying}
              onClick={() => {
                if (pendingChange?.changeId) discard(pendingChange.changeId)
                else setPhase({ name: 'form' })
              }}
            >
              Cancel this change
            </button>
          </div>
          <p className="bkmod-tiny">Payments are processed securely by Stripe. Your card details never touch our servers.</p>
        </motion.div>
      </div>
    )
  }

  /* ---------------- Main editor ---------------- */

  return (
    <>
      {/* Pending top-up banner */}
      {pendingChange && (
        <div className="bkmod-banner">
          <div className="bkmod-banner-text">
            <strong>A change is waiting to be paid</strong>
            <span>{fmtMoney(pendingChange.amount, currency)} is due to finish editing this booking. Complete it in this browser session or discard it.</span>
          </div>
          <button className="bkmod-btn bkmod-btn-ghost bkmod-banner-btn" onClick={() => discard(pendingChange.changeId)}>
            Discard pending change
          </button>
        </div>
      )}

      {/* Trip context */}
      <section className="bkmod-tour">
        {tour.coverPhoto ? (
          <img className="bkmod-tour-img" src={tour.coverPhoto} alt="" />
        ) : (
          <div className="bkmod-tour-img bkmod-tour-img-ph" aria-hidden="true">🎒</div>
        )}
        <div className="bkmod-tour-info">
          <p className="bkmod-tour-meta">Booking {booking.bookingNumber}</p>
          <h2>{tourTitle}</h2>
          <div className="bkmod-tour-chips">
            <span className="bkmod-chip-static">{fmtDateNice(currentShape.travelDate)}</span>
            {currentShape.selectedTime && <span className="bkmod-chip-static">{timeLabel(currentShape.selectedTime)}</span>}
            <span className="bkmod-chip-static">{totalNow} traveller{totalNow === 1 ? '' : 's'}</span>
            {tour.supplier?.name && <span className="bkmod-chip-static">Hosted by {tour.supplier.name}</span>}
          </div>
          <p className="bkmod-tour-hint">
            Plan a change below — we’ll show the new date, party and price before you confirm.
            {booking.modify?.deadline && (
              <> Free changes until {fmtDateShort(asIsoDate(booking.modify.deadline))} (24&nbsp;h before the activity).</>
            )}
          </p>
        </div>
      </section>

      <div className="bkmod-layout">
        <div className="bkmod-main">
          {/* Step 1 — date */}
          <section className="bkmod-card bkmod-step">
            <div className="bkmod-step-head">
              <span className="bkmod-step-num">1</span>
              <div>
                <h3>Choose a new date</h3>
                <p>Currently booked for {fmtDateNice(currentShape.travelDate)}{currentShape.selectedTime ? ` at ${timeLabel(currentShape.selectedTime)}` : ''}.</p>
              </div>
              {dateChanged && <span className="bkmod-step-badge">Changing</span>}
            </div>

            <div className="bkmod-step-body">
              <label className="bkmod-label" htmlFor="bkmod-date">New activity date</label>
              <input
                id="bkmod-date"
                className="bkmod-input"
                type="date"
                value={travelDate}
                min={minDate}
                onChange={(e) => setTravelDate(e.target.value)}
              />
              {dateChanged && <p className="bkmod-date-change">{fmtDateNice(currentShape.travelDate)} → {fmtDateNice(travelDate)}</p>}

              {availability.isFetching && <p className="bkmod-hint">Checking availability for {fmtDateNice(travelDate)}…</p>}

              {day && day.status === 'full' && !slots.length && (
                <p className="bkmod-warn">This date is fully booked — pick another day.</p>
              )}

              {slots.length > 0 && (
                <>
                  <label className="bkmod-label bkmod-label-gap">Start time</label>
                  <div className="bkmod-chips">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        className={`bkmod-chip${time === slot.time ? ' active' : ''}`}
                        onClick={() => setTime(time === slot.time ? null : slot.time)}
                        type="button"
                      >
                        {timeLabel(slot.time)}
                      </button>
                    ))}
                  </div>
                  {timeChanged && (
                    <p className="bkmod-date-change">{timeLabel(currentShape.selectedTime)} → {timeLabel(time)}</p>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Step 2 — travellers */}
          <section className="bkmod-card bkmod-step">
            <div className="bkmod-step-head">
              <span className="bkmod-step-num">2</span>
              <div>
                <h3>Adjust your travellers</h3>
                <p>{totalNow} traveller{totalNow === 1 ? '' : 's'} booked · the lead traveller stays the same.</p>
              </div>
              {partyChanged && <span className="bkmod-step-badge">Changing</span>}
            </div>

            <div className="bkmod-step-body">
              {activeCategories.length === 0 && (
                <p className="bkmod-hint">No traveller categories are editable for this booking.</p>
              )}
              <div className="bkmod-travellers">
                {activeCategories.map((key) => {
                  const from = baseCounts[key] ?? 0
                  const to = counts[key] ?? 0
                  const delta = to - from
                  return (
                    <div className="bkmod-traveller-row" key={key}>
                      <div className="bkmod-traveller-name">
                        <span>{fmtLabel(key)}</span>
                        {delta !== 0 && (
                          <span className={delta > 0 ? 'bkmod-delta up' : 'bkmod-delta down'}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </div>
                      <div className="bkmod-stepper">
                        <button aria-label={`Fewer ${fmtLabel(key)}`} onClick={() => bump(key, -1)} disabled={(counts[key] ?? 0) <= 0} type="button">−</button>
                        <span className="bkmod-count">{counts[key] ?? 0}</span>
                        <button aria-label={`More ${fmtLabel(key)}`} onClick={() => bump(key, 1)} type="button">+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {partyChanged && (
                <p className="bkmod-date-change">
                  {totalNow} traveller{totalNow === 1 ? '' : 's'} → {totalNext} traveller{totalNext === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Summary rail */}
        <aside className="bkmod-summary">
          <div className="bkmod-card bkmod-summary-card">
            <h3>Change summary</h3>

            {!hasChanges ? (
              <div className="bkmod-summary-empty">
                <div className="bkmod-summary-empty-icon" aria-hidden="true">✎</div>
                <p>Make a change on the left to see your new total and what happens to the price.</p>
              </div>
            ) : (
              <>
                <ul className="bkmod-changelist">
                  {dateChanged && (
                    <li><span>Date</span><em>{fmtDateShort(currentShape.travelDate)} → {fmtDateShort(changes.travelDate!)}</em></li>
                  )}
                  {timeChanged && (
                    <li><span>Start time</span><em>{timeLabel(currentShape.selectedTime)} → {timeLabel(changes.selectedTime ?? null)}</em></li>
                  )}
                  {partyChanged && (
                    <li><span>Travellers</span><em>{totalNow} → {totalNext}</em></li>
                  )}
                </ul>

                <div className="bkmod-price">
                  <div className="bkmod-price-row"><span>Current total</span><span>{fmtMoney(Number(booking.grossAmount), currency)}</span></div>

                  {quote ? (
                    <>
                      <div className="bkmod-price-row bkmod-price-row-new">
                        <span>New total</span>
                        <strong>{fmtMoney(quote.newTotal, quote.currency)}</strong>
                      </div>
                      <div className={`bkmod-price-delta ${quote.delta > 0 ? 'up' : quote.delta < 0 ? 'down' : 'flat'}`}>
                        {quote.delta > 0
                          ? <>You pay <strong>{fmtMoney(quote.delta, quote.currency)}</strong> more</>
                          : quote.delta < 0
                            ? <>You get <strong>{fmtMoney(Math.abs(quote.delta), quote.currency)}</strong> back</>
                            : <><strong>No change</strong> to the total</>}
                      </div>
                      <p className="bkmod-price-note">{moneyCopy}</p>
                    </>
                  ) : (
                    <div className="bkmod-price-loading">Calculating the new price…</div>
                  )}
                </div>

                {quoteQuery.isError && (
                  <p className="bkmod-form-error">{((quoteQuery.error as Error)?.message) || 'This change isn’t possible on the chosen date.'}</p>
                )}
              </>
            )}

            <button
              className="bkmod-btn bkmod-btn-primary bkmod-submit"
              disabled={!hasChanges || !quote || totalNext === 0 || applyModify.isPending}
              onClick={submit}
            >
              {applyModify.isPending
                ? 'Updating…'
                : quote
                  ? quote.moneyMode === 'topup'
                    ? `Confirm & pay ${fmtMoney(quote.delta, quote.currency)}`
                    : quote.moneyMode === 'refund'
                      ? `Confirm change · refund ${fmtMoney(Math.abs(quote.delta), quote.currency)}`
                      : 'Confirm changes'
                  : 'Confirm changes'}
            </button>

            {quote && quote.moneyMode === 'topup' && (
              <p className="bkmod-tiny bkmod-tiny-center">You’ll confirm the card payment on the next screen. We only charge the difference.</p>
            )}
          </div>

          <button className="bkmod-btn bkmod-btn-ghost bkmod-back-link" onClick={goBack}>Back to bookings</button>
        </aside>
      </div>
    </>
  )
}

export default function BookingModifyPage() {
  const { bookingId = '' } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectStatus = searchParams.get('redirect_status')

  const { data: detail, isLoading } = useExpeditionBookingDetail(bookingId)
  const booking = (detail ?? {}) as BookingLike

  if (isLoading) {
    return (
      <div className="bkmod-page">
        <div className="bkmod-center"><div className="bkmod-card"><div className="spinner" /></div></div>
      </div>
    )
  }

  if (!booking.bookingNumber) {
    return (
      <div className="bkmod-page">
        <div className="bkmod-center">
          <div className="bkmod-card bkmod-error-card">
            <h1>Booking not found</h1>
            <p>We couldn’t load this booking. If the problem continues, contact support.</p>
            <div className="bkmod-actions bkmod-actions-center">
              <button className="bkmod-btn bkmod-btn-primary" onClick={() => navigate('/dashboard/bookings')}>Go to my bookings</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (booking.modify && booking.modify.allowed === false) {
    return (
      <div className="bkmod-page">
        <div className="bkmod-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1 }} className="bkmod-card bkmod-error-card">
            <div className="bkmod-result-icon bkmod-result-icon-bad">!</div>
            <h1>Changes aren’t available</h1>
            <p>{booking.modify.reason || 'This booking can’t be edited right now.'}</p>
            <div className="bkmod-actions bkmod-actions-center">
              <button className="bkmod-btn bkmod-btn-primary" onClick={() => navigate(`/dashboard/bookings?booking=${bookingId}`)}>Back to bookings</button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="bkmod-page">
      <div className="bkmod-head">
        <button className="bkmod-back" onClick={() => navigate(`/dashboard/bookings?booking=${bookingId}`)} aria-label="Back to bookings">←</button>
        <div>
          <p className="bkmod-kicker">Manage your booking</p>
          <h1>Edit your trip</h1>
        </div>
      </div>
      <ModifyForm booking={booking} bookingId={bookingId} redirectStatus={redirectStatus} />
    </div>
  )
}
