import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { useCheckoutDraft, useReleaseCheckoutDraft, type CheckoutDraftSummary } from '../hooks/useExpeditionBookings'
import CheckoutElements, { type CheckoutElementsHandle } from '../components/booking/CheckoutElements'
import { currencySymbol } from '../lib/currencySymbol'
import OptimizedImage from '@/components/shared/OptimizedImage'
import logoSrc from '../assets/expo_trans.png'
import { formatHeadingDate, partyLabel } from '../lib/bookingUi'
import { formatDuration } from '../hooks/useExpeditionTours'
import './CheckoutPage.css'

function formatMoney(amount: number, currency: string): string {
  const symbol = currencySymbol(currency)
  const value = Number.isFinite(amount) ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
  return `${symbol}${value}`
}

function useCountdown(expiresAt?: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!expiresAt) return { expired: false, minutes: 0, seconds: 0 }
  const ms = Math.max(0, new Date(expiresAt).getTime() - now)
  return { expired: ms <= 0, minutes: Math.floor(ms / 60000), seconds: Math.floor((ms % 60000) / 1000) }
}

/** Back arrow used in both desktop (left pane) and mobile (compact) headers. */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="co-back" onClick={onClick} aria-label="Back to booking">
      <ArrowLeft size={18} />
      <span>Back</span>
    </button>
  )
}

/** Full order summary — rendered on the desktop left pane (forest tone) and,
 *  when expanded, in the mobile collapsed summary (light tone). */
function OrderSummary({
  draft,
  holdExpired,
  minutes,
  seconds,
  light = false,
}: {
  draft: CheckoutDraftSummary
  holdExpired: boolean
  minutes: number
  seconds: number
  light?: boolean
}) {
  return (
    <div className={light ? 'co-order co-order--light' : 'co-order'}>
      <div className="co-item">
        {draft.tour.coverPhoto ? (
          <OptimizedImage src={draft.tour.coverPhoto} alt={draft.tour.title} width={80} className="co-item-img" />
        ) : (
          <div className="co-item-img co-item-img-fallback" />
        )}
        <div className="co-item-body">
          <p className="co-item-title">{draft.tour.title}</p>
          <p className="co-item-meta">
            {formatHeadingDate(draft.travelDate)}
            {draft.selectedTime ? ` · ${draft.selectedTime}` : ''}
          </p>
          <p className="co-item-meta">
            {partyLabel(draft.party)}
            {draft.tour.durationMinutes ? ` · ${formatDuration(draft.tour.durationMinutes)}` : ''}
          </p>
        </div>
        <div className="co-item-price">{formatMoney(draft.pricing.subtotal + draft.pricing.fees, draft.currency)}</div>
      </div>

      <div className="co-rules" />

      <div className="co-row">
        <span>Subtotal</span>
        <span>{formatMoney(draft.pricing.subtotal, draft.currency)}</span>
      </div>
      {draft.pricing.fees > 0 && (
        <div className="co-row">
          <span>Fees</span>
          <span>{formatMoney(draft.pricing.fees, draft.currency)}</span>
        </div>
      )}
      {draft.pricing.taxes > 0 && (
        <div className="co-row">
          <span>Taxes</span>
          <span>{formatMoney(draft.pricing.taxes, draft.currency)}</span>
        </div>
      )}
      {draft.pricing.discount > 0 && (
        <div className="co-row co-row-discount">
          <span>{draft.promoCode ? `Discount (${draft.promoCode})` : 'Discount'}</span>
          <span>-{formatMoney(draft.pricing.discount, draft.currency)}</span>
        </div>
      )}

      <div className="co-rules" />

      <div className="co-row co-row-total">
        <span>Total due</span>
        <span>{formatMoney(draft.pricing.total, draft.currency)}</span>
      </div>

      {!holdExpired && (
        <p className="co-hold" role="timer">
          Your spot is reserved for {minutes}:{String(seconds).padStart(2, '0')}
        </p>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const draftId = searchParams.get('draft') || undefined
  const { data: draft, isLoading, isError } = useCheckoutDraft(draftId)
  const release = useReleaseCheckoutDraft()
  const { expired: holdExpired, minutes, seconds } = useCountdown(draft?.expiresAt)

  const [elementsState, setElementsState] = useState({ ready: false, complete: false })
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false)
  const expiryReleasedRef = useRef(false)
  const elementsHandleRef = useRef<CheckoutElementsHandle | null>(null)

  const clientSecret = draft?.clientSecret || null
  const paymentIntentId = draft?.paymentIntentId || null

  const returnUrl = useMemo(() => {
    if (!paymentIntentId) return null
    return `${window.location.origin}/booking/confirmation?session_id=${encodeURIComponent(paymentIntentId)}`
  }, [paymentIntentId])

  const onElementsReady = useCallback((handle: CheckoutElementsHandle) => {
    elementsHandleRef.current = handle
  }, [])

  const onElementsState = useCallback((s: { ready: boolean; complete: boolean }) => {
    setElementsState(s)
  }, [])

  // Release the hold exactly once when the countdown runs out (ref guard — the
  // mutation itself is idempotent server-side).
  useEffect(() => {
    if (holdExpired && draftId && !expiryReleasedRef.current) {
      expiryReleasedRef.current = true
      release.mutate(draftId)
    }
  }, [holdExpired, draftId, release])

  const handlePay = useCallback(async () => {
    if (!elementsHandleRef.current || processing || holdExpired || !draft) return
    setProcessing(true)
    setPaymentError(null)
    const result = await elementsHandleRef.current.confirm()
    if (result.error) {
      setPaymentError(result.error.message || 'Payment could not be completed. Please try again.')
      setProcessing(false)
    }
    // On success Stripe redirects the browser — nothing more to do here.
  }, [processing, holdExpired, draft])

  const handleCancel = useCallback(() => {
    if (draftId) release.mutate(draftId)
    if (!draft) {
      navigate('/')
      return
    }
    navigate(`/${encodeURIComponent(draft.tour.slug || draft.tour.id)}/booking`)
  }, [draft, draftId, release, navigate])

  // Loading skeleton while the server summary + fresh secret resolve.
  if (isLoading || (!draft && draftId && !isError)) {
    return (
      <div className="co-page">
        <div className="co-body co-skeleton">
          <div className="co-left">
            <div className="co-skel co-skel-head" />
            <div className="co-skel co-skel-summary" />
            <div className="co-skel co-skel-line" />
            <div className="co-skel co-skel-line" />
          </div>
          <div className="co-right">
            <div className="co-skel co-skel-card" />
          </div>
        </div>
      </div>
    )
  }

  // Unavailable / expired checkout — full-page state (no split layout).
  if (isError || !draft || !clientSecret || !returnUrl) {
    return (
      <div className="co-page">
        <div className="co-state co-state-card">
          <div className="co-state-icon">
            <Lock size={22} />
          </div>
          <h1 className="co-state-title">Checkout unavailable</h1>
          <p className="co-state-body">
            {isError
              ? 'We could not load your reservation. It may have expired or already been completed.'
              : 'Your reservation could not be continued. Please start again from your tour.'}
          </p>
          <div className="co-state-actions">
            {draft?.tour && (
              <Link className="co-btn co-btn-solid" to={`/${encodeURIComponent(draft.tour.slug || draft.tour.id)}/booking`}>
                Back to booking
              </Link>
            )}
            <button type="button" className="co-btn co-btn-ghost" onClick={() => navigate('/')}>
              Return home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (holdExpired) {
    return (
      <div className="co-page">
        <div className="co-state co-state-card">
          <div className="co-state-icon co-state-icon-warn">
            <Lock size={22} />
          </div>
          <h1 className="co-state-title">Your hold expired</h1>
          <p className="co-state-body">The reserved spot has been released. Start again to rebook before it's gone.</p>
          <div className="co-state-actions">
            <Link className="co-btn co-btn-solid" to={`/${encodeURIComponent(draft.tour.slug || draft.tour.id)}/booking`}>
              Rebook this tour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const payDisabled = !elementsState.ready || !elementsState.complete || processing

  return (
    <div className="co-page">
      <div className="co-body">
        {/* LEFT — brand panel + order summary (desktop/tablet) */}
        <aside className="co-left">
          <header className="co-header">
            <BackButton onClick={handleCancel} />
            <div className="co-brand">
              <img src={logoSrc} alt="Expedition-Go" className="co-logo" />
            </div>
            <div className="co-header-spacer" />
          </header>

          <div className="co-left-inner">
            <div className="co-lockup">
              <span className="co-eyebrow">Secure checkout</span>
              <h1 className="co-title">Complete your booking</h1>
              <div className="co-total">{formatMoney(draft.pricing.total, draft.currency)}</div>
            </div>

            <OrderSummary draft={draft} holdExpired={holdExpired} minutes={minutes} seconds={seconds} />

            <p className="co-security">
              <ShieldCheck size={14} />
              Payments are securely processed by Stripe. We never store your card details.
            </p>
          </div>
        </aside>

        {/* RIGHT — payment (mobile shows only this pane) */}
        <section className="co-right" aria-label="Payment details">
          <header className="co-mobile-top">
            <BackButton onClick={handleCancel} />
            <div className="co-brand">
              <img src={logoSrc} alt="Expedition-Go" className="co-logo" />
            </div>
            <div className="co-header-spacer" />
          </header>

          {/* Mobile collapsed order summary (Stripe-like) */}
          <div className="co-mobile-summary">
            <button
              type="button"
              className="co-summary-toggle"
              aria-expanded={mobileSummaryOpen}
              onClick={() => setMobileSummaryOpen((v) => !v)}
            >
              <span className="co-summary-label">Order summary</span>
              <span className="co-summary-total">{formatMoney(draft.pricing.total, draft.currency)}</span>
              <ChevronDown size={16} className={mobileSummaryOpen ? 'co-summary-caret co-rotated' : 'co-summary-caret'} />
            </button>
            {mobileSummaryOpen && (
              <div className="co-summary-details">
                <OrderSummary draft={draft} holdExpired={holdExpired} minutes={minutes} seconds={seconds} light />
              </div>
            )}
          </div>

          <div className="co-pay-col">
            <div className="co-field">
              <label className="co-label" htmlFor="co-email">Contact email</label>
              <input
                id="co-email"
                className="co-input"
                type="email"
                readOnly
                value={draft.leadTraveler.email || ''}
              />
            </div>

            <div className="co-element-wrap">
              <span className="co-label">Card / payment method</span>
              <CheckoutElements
                clientSecret={clientSecret}
                returnUrl={returnUrl}
                email={draft.leadTraveler.email || undefined}
                onReady={onElementsReady}
                onStateChange={onElementsState}
              />
            </div>

            {paymentError && (
              <p className="co-error" role="alert">
                {paymentError}
              </p>
            )}

            <button
              type="button"
              className="co-pay"
              disabled={payDisabled}
              onClick={handlePay}
              aria-busy={processing}
            >
              {processing ? (
                <>
                  <Loader2 size={18} className="co-spin" />
                  Processing…
                </>
              ) : (
                <>Pay {formatMoney(draft.pricing.total, draft.currency)}</>
              )}
            </button>

            <p className="co-terms">
              By paying you agree to the tour's cancellation policy and our{' '}
              <Link to="/terms" className="co-link">terms</Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
