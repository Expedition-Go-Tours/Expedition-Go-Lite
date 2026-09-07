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

function asIsoDate(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return ''
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
  return key.charAt(0).toUpperCase() + key.replace(/([A-Z])/g, ' $1').slice(1)
}

interface BookingLike {
  bookingNumber?: string
  tour?: { slug?: string }
  travelDate?: string
  selectedTime?: string | null
  travelers?: unknown
  grossAmount?: number | null
  currency?: string
  modify?: {
    allowed?: boolean
    reason?: string | null
    pendingPayment?: {
      changeId: string
      amount?: number | null
      expiresAt?: string | null
    } | null
  } | null
}

function ModifyForm({ booking, bookingId, redirectStatus }: { booking: BookingLike; bookingId: string; redirectStatus: string | null }) {
  const navigate = useNavigate()
  const tourSlug = booking.tour?.slug
  const pendingChange = booking.modify?.pendingPayment ?? null

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

  const availability = useTourAvailability(tourSlug, travelDate, travelDate)
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

  const changes = useMemo(() => {
    const c: Record<string, unknown> = {}
    if (travelDate && travelDate !== currentShape.travelDate) c.travelDate = travelDate
    if (time !== undefined && time !== currentShape.selectedTime) c.selectedTime = time
    const next = toCountMap(counts, categories)
    const changed = categories.some((k) => (next[k] ?? 0) !== (currentShape.travelers[k] ?? 0))
    if (changed) c.travelers = next
    return c
  }, [travelDate, time, counts, categories, currentShape])

  const quoteQuery = useBookingModifyQuote(bookingId, currentShape, changes)
  const quote = quoteQuery.data?.quote

  const applyModify = useApplyBookingModify()
  const discardModify = useDiscardBookingModify()

  const totalNow = countTotal(currentShape.travelers)
  const totalNext = countTotal(toCountMap(counts, categories))

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
    // Success redirects the browser; returning with redirect_status=succeeded
    // flips the phase to 'paid' and the poller below takes over.
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

  const paidPoll = useBookingModifySettled(bookingId, phase.name === 'paid')
  const pendingGone = phase.name === 'paid' && paidPoll.data && !paidPoll.data?.modify?.pendingPayment
  const settledApplied = phase.name === 'applied' || pendingGone

  const bump = (key: string, delta: number) => {
    setCounts((prev) => {
      const current = Math.max(0, prev[key] ?? 0)
      const nextVal = Math.max(0, Math.min(50, current + delta))
      if (nextVal === current) return prev
      return { ...prev, [key]: nextVal }
    })
  }

  if (settledApplied) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1 }} className="bkmod-card bkmod-result">
        <h2>Your trip has been updated ✓</h2>
        <p>
          We’ve sent you a confirmation email with the updated details.
          {quote && quote.moneyMode === 'refund' && (
            <> The difference of {fmtMoney(Math.abs(quote.delta), quote.currency)} is being refunded to your original payment method.</>
          )}
        </p>
        <div className="bkmod-actions">
          <button className="bkmod-btn bkmod-btn-primary" onClick={goBack}>Back to bookings</button>
        </div>
      </motion.div>
    )
  }

  if (phase.name === 'error') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1 }} className="bkmod-card bkmod-error">
        <h2>Something went wrong</h2>
        <p>{phase.message}</p>
        <div className="bkmod-actions">
          <button className="bkmod-btn bkmod-btn-primary" onClick={() => setPhase({ name: 'form' })}>Try again</button>
          <button className="bkmod-btn bkmod-btn-ghost" onClick={goBack}>Back to bookings</button>
        </div>
      </motion.div>
    )
  }

  if (phase.name === 'paid' && !pendingGone) {
    return (
      <div className="bkmod-card bkmod-result">
        <div className="spinner" />
        <p className="bkmod-note">Payment received — applying your change…</p>
      </div>
    )
  }

  if (phase.name === 'payment' && topupSecret) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1 }} className="bkmod-card">
        <h2>Pay the difference</h2>
        {quote && (
          <p className="bkmod-diff">
            New total {fmtMoney(quote.newTotal, quote.currency)} · pay the difference of{' '}
            <strong>{fmtMoney(quote.delta, quote.currency)}</strong>
          </p>
        )}
        <CheckoutElements
          clientSecret={topupSecret}
          returnUrl={topupReturnUrl}
          onReady={(handle) => { elementsHandleRef.current = handle }}
        />
        {payError && <p className="bkmod-form-error" role="alert">{payError}</p>}
        <div className="bkmod-actions">
          <button className="bkmod-btn bkmod-btn-primary" disabled={paying} onClick={pay}>
            {paying ? 'Processing…' : 'Pay now'}
          </button>
          <button
            className="bkmod-btn bkmod-btn-ghost"
            disabled={paying}
            onClick={() => {
              if (pendingChange?.changeId) discard(pendingChange.changeId)
              else setPhase({ name: 'form' })
            }}
          >
            Cancel change
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="bkmod-layout">
      <div className="bkmod-main">
        {pendingChange && (
          <div className="bkmod-banner">
            <p>A change for this booking is waiting to be paid ({fmtMoney(pendingChange.amount, booking.currency)}). Complete the payment in the same browser session, or discard it.</p>
            <button className="bkmod-btn bkmod-btn-ghost" onClick={() => discard(pendingChange.changeId)}>Discard pending change</button>
          </div>
        )}

        <div className="bkmod-card">
          <label className="bkmod-label" htmlFor="bkmod-date">Activity date</label>
          <input
            id="bkmod-date"
            className="bkmod-input"
            type="date"
            value={travelDate}
            min={minDate}
            onChange={(e) => setTravelDate(e.target.value)}
          />

          {day && day.status === 'full' && !slots.length && (
            <p className="bkmod-hint bkmod-warn">That date has no remaining spots — try another day.</p>
          )}
          {!day && travelDate && !availability.isFetching && !availability.isError && (
            <p className="bkmod-hint">No time slots are sold for this date.</p>
          )}
          {availability.isFetching && <p className="bkmod-hint">Checking availability for this date…</p>}

          {slots.length > 0 && (
            <>
              <label className="bkmod-label">Start time</label>
              <div className="bkmod-chips">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    className={`bkmod-chip${time === slot.time ? ' active' : ''}`}
                    onClick={() => setTime(time === slot.time ? null : slot.time)}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bkmod-card">
          <label className="bkmod-label">Travellers</label>
          {categories.length === 0 && <p className="bkmod-hint">No traveller categories are editable for this booking.</p>}
          {categories.map((key) => (
            <div className="bkmod-row" key={key}>
              <span className="bkmod-cat">{fmtLabel(key)}</span>
              <div className="bkmod-stepper">
                <button aria-label={`Remove ${fmtLabel(key)}`} onClick={() => bump(key, -1)} disabled={(counts[key] ?? 0) <= 0}>−</button>
                <span className="bkmod-count">{counts[key] ?? 0}</span>
                <button aria-label={`Add ${fmtLabel(key)}`} onClick={() => bump(key, 1)}>+</button>
              </div>
            </div>
          ))}
          <p className="bkmod-hint">
            {totalNow} → {totalNext} traveller{totalNext === 1 ? '' : 's'} · Changing the party size does not change the lead traveller.
          </p>
        </div>
      </div>

      <aside className="bkmod-summary">
        <div className="bkmod-card">
          <h3>Price summary</h3>
          <div className="bkmod-line"><span>Current total</span><span>{fmtMoney(booking.grossAmount, booking.currency)}</span></div>
          {quote ? (
            <>
              <div className="bkmod-line strong"><span>New total</span><span>{fmtMoney(quote.newTotal, quote.currency)}</span></div>
              <div className={`bkmod-line ${quote.delta > 0 ? 'up' : quote.delta < 0 ? 'down' : ''}`}>
                <span>{quote.delta > 0 ? 'Additional payment' : quote.delta < 0 ? 'You get back' : 'No price change'}</span>
                <span>{fmtMoney(Math.abs(quote.delta), quote.currency)}</span>
              </div>
              <p className="bkmod-tiny">
                {quote.moneyMode === 'refund' && 'Refunded to your original payment method.'}
                {quote.moneyMode === 'topup' && 'Paid securely by card when you confirm.'}
                {quote.moneyMode === 'paylater-update' && 'Your reserve-now-pay-later amount is updated.'}
                {quote.moneyMode === 'none' && 'Same total — no payment needed.'}
              </p>
            </>
          ) : (
            <div className="bkmod-line ghost"><span>New total</span><span>{quoteQuery.isFetching ? '…' : '—'}</span></div>
          )}
          {quoteQuery.isError && (
            <p className="bkmod-form-error">{((quoteQuery.error as Error)?.message) || 'This change is not possible.'}</p>
          )}
        </div>

        <button
          className="bkmod-btn bkmod-btn-primary bkmod-submit"
          disabled={!quote || totalNext === 0 || applyModify.isPending}
          onClick={submit}
        >
          {applyModify.isPending ? 'Updating…' : 'Confirm changes'}
        </button>
        <button className="bkmod-btn bkmod-btn-ghost" onClick={goBack}>Back to bookings</button>
      </aside>
    </div>
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
        <div className="bkmod-card"><div className="spinner" /></div>
      </div>
    )
  }

  if (!booking.bookingNumber) {
    return (
      <div className="bkmod-page">
        <div className="bkmod-card bkmod-error"><h1>Booking not found</h1><p>We could not load this booking.</p></div>
      </div>
    )
  }

  if (booking.modify && booking.modify.allowed === false) {
    return (
      <div className="bkmod-page">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bkmod-card bkmod-error">
          <h1>Changes not available</h1>
          <p>{booking.modify.reason || 'This booking cannot be edited.'}</p>
          <div className="bkmod-actions">
            <button className="bkmod-btn bkmod-btn-primary" onClick={() => navigate(`/dashboard/bookings?booking=${bookingId}`)}>Back to bookings</button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="bkmod-page">
      <div className="bkmod-head">
        <button className="bkmod-back" onClick={() => navigate(`/dashboard/bookings?booking=${bookingId}`)} aria-label="Back to bookings">←</button>
        <div>
          <p className="bkmod-kicker">Edit your trip</p>
          <h1>Booking {booking.bookingNumber}</h1>
        </div>
      </div>
      <ModifyForm booking={booking} bookingId={bookingId} redirectStatus={redirectStatus} />
    </div>
  )
}
