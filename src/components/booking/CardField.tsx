import { useEffect, useRef, useState } from 'react'
import { getStripePromise } from '../../lib/stripe'

export interface CardElementHandle {
  /** Creates a Stripe PaymentMethod for the card entered in the field. */
  createPaymentMethod: () => Promise<{ paymentMethod: { id: string } | null; error?: { message?: string } }>
}

export default function CardField({
  onReady,
}: {
  onReady: (handle: CardElementHandle) => void
}) {
   const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const stripePromiseRef = useRef(getStripePromise())
  const elementsRef = useRef<any>(null)
  const cardRef = useRef<any>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || !containerRef.current) return
    if (!containerRef.current) return

    let cancelled = false
    stripePromiseRef.current.then((stripe) => {
      if (cancelled || !stripe) return
      const elements = stripe.elements()
      elementsRef.current = elements
      if (!cardRef.current) {
        cardRef.current = (elements as any).create('card', {
          style: {
            base: {
              fontSize: '14px',
              color: '#111827',
              fontFamily: 'ui-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              '::placeholder': { color: '#9CA3AF' },
            },
          },
          hidePostalCode: true,
          showIcon: true,
        })
        cardRef.current.mount(containerRef.current)
      }
      onReady({
        createPaymentMethod: async () => {
          const result: any = await (stripe as any).createPaymentMethod({ type: 'card', card: cardRef.current })
          return { paymentMethod: result?.paymentMethod ? { id: result.paymentMethod.id } : null, error: result?.error }
        },
      })
    })

    return () => {
      cancelled = true
      cardRef.current?.unmount?.()
      cardRef.current = null
    }
  }, [mounted, onReady])

  return (
    <div ref={containerRef} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100" />
  )
}
