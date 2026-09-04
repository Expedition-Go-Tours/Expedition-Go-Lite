import { useEffect, useRef, useState } from 'react'
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js'
import { getStripePromise } from '../../lib/stripe'
import { checkoutElementsOptions } from './checkoutAppearance'

export interface CheckoutElementsHandle {
  /** Calls stripe.confirmPayment on the mounted Payment Element. On success the
   *  browser is redirected to `returnUrl` by Stripe; on failure an error is
   *  returned for the page to display (never expose raw card data). */
  confirm: () => Promise<{ error?: { message?: string; code?: string } }>
}

interface CheckoutElementsProps {
  clientSecret: string
  returnUrl: string
  email?: string
  onReady: (handle: CheckoutElementsHandle) => void
  onStateChange?: (state: { ready: boolean; complete: boolean }) => void
}

const UNAVAILABLE = 'Secure payment is unavailable right now — please try again shortly.'

export default function CheckoutElements({
  clientSecret,
  returnUrl,
  email,
  onReady,
  onStateChange,
}: CheckoutElementsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fatal, setFatal] = useState<string | null>(null)
  const stripeRef = useRef<Stripe | null>(null)
  const elementsRef = useRef<StripeElements | null>(null)
  const elRef = useRef<StripePaymentElement | null>(null)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container || !clientSecret) return

    const publishState = (s: { ready: boolean; complete: boolean }) => {
      if (!cancelled) onStateChange?.(s)
    }

    getStripePromise()
      .then(async (stripe) => {
        if (cancelled) return
        if (!stripe) {
          setFatal(UNAVAILABLE)
          return
        }
        stripeRef.current = stripe

        const elements = stripe.elements(checkoutElementsOptions(clientSecret))
        if (cancelled) return
        elementsRef.current = elements

        const paymentElement = elements.create('payment')
        if (cancelled) {
          paymentElement.destroy()
          return
        }
        elRef.current = paymentElement
        paymentElement.mount(container)

        paymentElement.on('ready', () => publishState({ ready: true, complete: false }))
        paymentElement.on('change', (e) =>
          publishState({ ready: true, complete: Boolean(e.complete) }),
        )

        onReady({
          confirm: async () => {
            const currentStripe = stripeRef.current
            const currentElements = elementsRef.current
            if (!currentStripe || !currentElements) {
              return { error: { message: UNAVAILABLE } }
            }
            try {
              const result = await currentStripe.confirmPayment({
                elements: currentElements,
                confirmParams: {
                  return_url: returnUrl,
                  ...(email
                    ? { payment_method_data: { billing_details: { email } } }
                    : {}),
                },
              })
              // Stripe only returns when confirmation failed (success navigates away).
              if (result.error) {
                return { error: { message: result.error.message, code: result.error.code } }
              }
              return {}
            } catch {
              return { error: { message: 'Payment could not be completed. Please try again.' } }
            }
          },
        })
      })
      .catch(() => {
        if (cancelled) return
        setFatal(UNAVAILABLE)
      })

    return () => {
      cancelled = true
      elRef.current?.unmount()
      elRef.current?.destroy()
      elRef.current = null
      elementsRef.current = null
      stripeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret, email])

  return (
    <div>
      <div
        ref={containerRef}
        className="checkout-payment-element rounded-xl border border-[var(--bv-border)] bg-white p-1 transition-colors focus-within:border-[var(--bv-accent)] focus-within:ring-2 focus-within:ring-[var(--bv-focus)]"
      />
      {fatal && (
        <p className="mt-2 text-xs font-medium text-rose-600" role="alert">
          {fatal}
        </p>
      )}
    </div>
  )
}
