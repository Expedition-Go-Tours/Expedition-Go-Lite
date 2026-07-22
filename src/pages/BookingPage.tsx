import { useState, useMemo, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Check, ArrowLeft, MapPin, CalendarDays, Users,
  Phone, MessageSquare, ShieldCheck, Star, Clock, Globe,
} from 'lucide-react'
import logoSrc from '../assets/expo_trans.png'
import Footer from '../components/Footer'
import StepBadge from '../components/booking/StepBadge'
import { FieldLabel, TextInput, SelectInput } from '../components/booking/FormFields'
import ChangeBookingModal from '../components/booking/ChangeBookingModal'
import BookingConfirmationDialog from '../components/booking/BookingConfirmationDialog'

/* ─── Constants ─── */

const COUNTRY_CODES = [
  { label: 'Ghana (+233)', value: '+233' },
  { label: 'United States (+1)', value: '+1' },
  { label: 'United Kingdom (+44)', value: '+44' },
  { label: 'Nigeria (+234)', value: '+234' },
  { label: 'South Africa (+27)', value: '+27' },
  { label: 'Germany (+49)', value: '+49' },
  { label: 'France (+33)', value: '+33' },
  { label: 'Canada (+1)', value: '+1' },
]

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', logos: ['Mastercard', 'Amex', 'JCB', 'Discover', 'Visa'] },
  { id: 'paypal', label: 'PayPal' },
  { id: 'googlepay', label: 'Google Pay' },
]

/* ─── Demo fallback ─── */

const DEMO_TOUR = {
  title: 'Experience the Beauty, History and the Culture Of Accra in a Day',
  image: 'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=600&q=80',
  provider: 'Expedition GO Tours',
  rating: 4.9,
  reviews: 248,
  date: 'Tuesday, June 2, 2026',
  time: '9:00 AM',
  duration: '6h',
  travelers: '1 adult',
  price: 80,
  cancellation: 'Free cancellation before 9:00 AM on June 1 (tour local time)',
  language: 'English - Guide',
}

/* ─── Page entrance variants ─── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
}

const stepContentVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
}

/* ─── Mobile Summary Card ─── */

function MobileSummaryCard({ tour, onChangeClick }: { tour: typeof DEMO_TOUR; onChangeClick: () => void }) {
  return (
    <motion.div variants={itemVariants} className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/40">
          <img src={tour.image} alt={tour.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight text-slate-900 line-clamp-2">{tour.title}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{tour.date} &bull; {tour.time}</p>
          <p className="mt-0.5 text-xs text-slate-400">{tour.travelers}</p>
        </div>
        <button onClick={onChangeClick} className="shrink-0 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
          Change
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-sm font-semibold text-slate-700">Total</span>
        <span className="text-xl font-bold text-slate-900 tracking-tight">${tour.price.toFixed(2)}</span>
      </div>
    </motion.div>
  )
}

/* ─── Hold Timer ─── */

function HoldTimer() {
  const [seconds, setSeconds] = useState(4 * 60 + 22)
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(interval)
  }, [])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return (
    <motion.div variants={itemVariants} className="flex items-center gap-2.5 rounded-[1.25rem] bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-800 shadow-sm">
      <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Clock className="size-4" />
      </span>
      <span>Holding your spot for {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
    </motion.div>
  )
}

/* ─── Step wrapper ─── */

function StepCard({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  return (
    <motion.div
      layout
      className="overflow-hidden rounded-[1.75rem] border border-slate-200/40 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
    >
      {children}
    </motion.div>
  )
}

/* ─── Step 1 – Contact Details ─── */

function ContactDetailsStep({
  data, onChange, onNext, valid, step, setStep,
}: {
  data: { firstName: string; lastName: string; email: string; countryCode: string; phone: string }
  onChange: (key: string, value: string | boolean) => void
  onNext: () => void
  valid: { firstName: boolean; lastName: boolean; email: boolean; phone: boolean; all: boolean }
  step: number
  setStep: (s: number) => void
}) {
  const isActive = step === 1
  const isCompleted = step > 1
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const handleBlur = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }))

  const error = (key: string, field: string) =>
    touched[key] && !valid[key as keyof typeof valid]
      ? `Please enter your ${field.toLowerCase()}`
      : undefined

  return (
    <StepCard isActive={isActive}>
      <div className="border-b border-slate-100/60 px-7 py-6 sm:px-9">
        <div className="flex items-start gap-4">
          <StepBadge number={1} active={isActive} completed={isCompleted} />
          <div className="pt-0.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Contact Details</h2>
            <p className="mt-0.5 text-sm text-slate-400">Confirmation will be sent here</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key="contact-active"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-5 p-7 sm:p-9"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel required tooltip="Enter your legal first name as it appears on your ID or passport.">First Name</FieldLabel>
                <TextInput
                  value={data.firstName}
                  onChange={(e) => onChange('firstName', e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                  placeholder="e.g. Richard"
                  valid={valid.firstName}
                  error={error('firstName', 'first name')}
                />
              </div>
              <div>
                <FieldLabel required tooltip="Enter your surname or family name as it appears on your ID.">Last Name</FieldLabel>
                <TextInput
                  value={data.lastName}
                  onChange={(e) => onChange('lastName', e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                  placeholder="e.g. Boochie"
                  valid={valid.lastName}
                  error={error('lastName', 'last name')}
                />
              </div>
            </div>

            <div>
              <FieldLabel required tooltip="Your booking confirmation, receipt and important updates will be sent here.">Email</FieldLabel>
              <TextInput
                type="email"
                value={data.email}
                onChange={(e) => onChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                valid={valid.email}
                error={touched.email && !valid.email ? 'Please enter a valid email address' : undefined}
              />
            </div>

            <div>
              <FieldLabel required tooltip="The tour operator may use this to contact you about pickup or last-minute changes.">Phone Number</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-[1.2fr_2fr]">
                <SelectInput value={data.countryCode} onChange={(e) => onChange('countryCode', e.target.value)} options={COUNTRY_CODES} />
                <TextInput
                  type="tel"
                  value={data.phone}
                  onChange={(e) => onChange('phone', e.target.value.replace(/\D/g, ''))}
                  onBlur={() => handleBlur('phone')}
                  valid={valid.phone}
                  error={error('phone', 'phone number')}
                />
              </div>
            </div>

            {!valid.all && Object.keys(touched).length > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-500 text-center">
                Please fill in all required fields correctly before proceeding.
              </motion.p>
            )}

            <div className="flex justify-end pt-2">
              <motion.button
                onClick={onNext}
                disabled={!valid.all}
                whileTap={{ scale: 0.97 }}
                className={`inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold shadow-sm transition ${
                  valid.all
                    ? 'bg-emerald-600 text-white hover:brightness-110 cursor-pointer'
                    : 'cursor-not-allowed bg-slate-200 text-white'
                }`}
              >
                Next
              </motion.button>
            </div>
          </motion.div>
        )}

        {isCompleted && (
          <motion.div
            key="contact-completed"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2 p-7 sm:p-9"
          >
            <p className="text-sm font-semibold text-slate-900">{data.firstName} {data.lastName}</p>
            <p className="text-sm text-slate-400">{data.email}</p>
            <p className="text-sm text-slate-400">{data.countryCode} {data.phone}</p>
            <button type="button" onClick={() => setStep(1)} className="mt-1 text-sm font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
              Edit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </StepCard>
  )
}

/* ─── Step 2 – Activity Details ─── */

function ActivityDetailsStep({
  data, onChange, tour, onNext, valid, step, setStep,
}: {
  data: { leadFirstName: string; leadLastName: string }
  onChange: (key: string, value: string) => void
  tour: typeof DEMO_TOUR
  onNext: () => void
  valid: { leadFirstName: boolean; leadLastName: boolean; all: boolean }
  step: number
  setStep: (s: number) => void
}) {
  const isActive = step === 2
  const isCompleted = step > 2
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const handleBlur = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }))

  const error = (key: string, field: string) =>
    touched[key] && !valid[key as keyof typeof valid]
      ? `Please enter the ${field.toLowerCase()}`
      : undefined

  const tourSummaryCard = (
    <div className="flex gap-3 rounded-xl border border-slate-200/40 bg-slate-50/30 p-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/20">
        <img src={tour.image} alt={tour.title} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="min-w-0">
        <div className="flex items-start gap-1.5">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
          <p className="text-xs font-medium text-emerald-700">{tour.cancellation}</p>
        </div>
        <h3 className="mt-1 text-sm font-bold text-slate-900 line-clamp-2">{tour.title}</h3>
        <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{tour.title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{tour.date} &bull; {tour.time}</p>
        <p className="mt-0.5 text-xs text-slate-400">{tour.travelers}</p>
      </div>
    </div>
  )

  return (
    <StepCard isActive={isActive}>
      <div className="border-b border-slate-100/60 px-7 py-6 sm:px-9">
        <div className="flex items-start gap-4">
          <StepBadge number={2} active={isActive} completed={isCompleted} />
          <div className="pt-0.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Activity Details</h2>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key="activity-active"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-5 p-7 sm:p-9"
          >
            {tourSummaryCard}

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">Lead Traveler</p>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel required tooltip="The main participant for this tour. This name will be used on the booking confirmation.">First Name</FieldLabel>
                  <TextInput
                    value={data.leadFirstName}
                    onChange={(e) => onChange('leadFirstName', e.target.value)}
                    onBlur={() => handleBlur('leadFirstName')}
                    valid={valid.leadFirstName}
                    error={error('leadFirstName', 'lead traveler first name')}
                  />
                </div>
                <div>
                  <FieldLabel required tooltip="The main participant's surname or family name.">Last Name</FieldLabel>
                  <TextInput
                    value={data.leadLastName}
                    onChange={(e) => onChange('leadLastName', e.target.value)}
                    onBlur={() => handleBlur('leadLastName')}
                    valid={valid.leadLastName}
                    error={error('leadLastName', 'lead traveler last name')}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/40 bg-slate-50/30 px-4 py-3">
              <Globe className="size-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Tour Language</span>
              <span className="text-sm text-slate-400">{tour.language}</span>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/20 p-4">
              <p className="text-xs text-slate-400">Pickup details will be provided after booking confirmation.</p>
            </div>

            {!valid.all && Object.keys(touched).length > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-500 text-center">
                Please fill in all required fields correctly before proceeding.
              </motion.p>
            )}

            <div className="flex justify-end pt-2">
              <motion.button
                onClick={onNext}
                disabled={!valid.all}
                whileTap={{ scale: 0.97 }}
                className={`inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold shadow-sm transition ${
                  valid.all
                    ? 'bg-emerald-600 text-white hover:brightness-110 cursor-pointer'
                    : 'cursor-not-allowed bg-slate-200 text-white'
                }`}
              >
                Next
              </motion.button>
            </div>
          </motion.div>
        )}

        {!isActive && (
          <motion.div
            key="activity-collapsed"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 p-7 sm:p-9"
          >
            {tourSummaryCard}
            {isCompleted && (
              <button type="button" onClick={() => setStep(2)} className="text-sm font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
                Edit
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </StepCard>
  )
}

/* ─── Step 3 – Payment Details ─── */

function PaymentDetailsStep({
  data, onChange, tour, onBook, step, setStep,
}: {
  data: { paymentTiming: string; paymentMethod: string }
  onChange: (key: string, value: string) => void
  tour: typeof DEMO_TOUR
  onBook: () => void
  step: number
  setStep: (s: number) => void
}) {
  const isActive = step === 3
  const isCompleted = step > 3

  const buttonLabel = data.paymentTiming === 'later' ? 'Reserve Now' : 'Pay Now'

  const paymentSummary = (
    <div className="space-y-2 text-sm text-slate-600">
      <p><span className="font-semibold text-slate-800">When to pay:</span> {data.paymentTiming === 'now' ? `Pay now — $${tour.price.toFixed(2)}` : 'Reserve now, pay later'}</p>
      <p><span className="font-semibold text-slate-800">Payment method:</span> {PAYMENT_METHODS.find((m) => m.id === data.paymentMethod)?.label || 'Credit / Debit Card'}</p>
    </div>
  )

  return (
    <StepCard isActive={isActive}>
      <div className="border-b border-slate-100/60 px-7 py-6 sm:px-9">
        <div className="flex items-start gap-4">
          <StepBadge number={3} active={isActive} completed={isCompleted} />
          <div className="pt-0.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Payment Details</h2>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key="payment-active"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6 p-7 sm:p-9"
          >
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">Choose when to pay</p>
              <div className="space-y-2">
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                  data.paymentTiming === 'now'
                    ? 'border-emerald-300 bg-emerald-50/30 shadow-sm'
                    : 'border-slate-200/60 bg-white hover:border-slate-300'
                }`}>
                  <div className={`grid size-5 shrink-0 place-items-center rounded-full border-2 transition ${
                    data.paymentTiming === 'now' ? 'border-emerald-500' : 'border-slate-300'
                  }`}>
                    {data.paymentTiming === 'now' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="size-2.5 rounded-full bg-emerald-500"
                      />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">Pay now</span>
                  <span className="shrink-0 text-sm font-bold text-slate-900">${tour.price.toFixed(2)}</span>
                  <input type="radio" name="paymentTiming" className="sr-only" checked={data.paymentTiming === 'now'} onChange={() => onChange('paymentTiming', 'now')} />
                </label>

                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all sm:items-center ${
                  data.paymentTiming === 'later'
                    ? 'border-emerald-300 bg-emerald-50/30 shadow-sm'
                    : 'border-slate-200/60 bg-white hover:border-slate-300'
                }`}>
                  <div className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition sm:mt-0 ${
                    data.paymentTiming === 'later' ? 'border-emerald-500' : 'border-slate-300'
                  }`}>
                    {data.paymentTiming === 'later' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="size-2.5 rounded-full bg-emerald-500"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-slate-900">Reserve now, pay later</span>
                    <p className="text-xs text-slate-400">Book your spot and pay nothing today</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-bold text-slate-900">$0.00</span>
                    <p className="text-[10px] text-slate-400">now</p>
                  </div>
                  <input type="radio" name="paymentTiming" className="sr-only" checked={data.paymentTiming === 'later'} onChange={() => onChange('paymentTiming', 'later')} />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/40 bg-slate-50/30 p-6 text-center">
              <p className="text-2xl font-bold text-slate-900 tracking-tight">${tour.price.toFixed(2)}</p>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                {tour.cancellation}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              By clicking &quot;{buttonLabel}&quot;, you agree to our{' '}
              <a href="#" className="font-semibold underline text-slate-500 hover:text-slate-700">Terms</a> &amp;{' '}
              <a href="#" className="font-semibold underline text-slate-500 hover:text-slate-700">Privacy and Cookies Statement</a>
              , plus the tour operator&apos;s rules &amp; regulations.
            </p>

            <motion.button
              onClick={onBook}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-full bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={buttonLabel}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="inline-block"
                >
                  {buttonLabel}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <p className="text-[11px] leading-relaxed text-slate-400">
              Your booking is facilitated by our platform, but a third-party tour operator provides the
              tour/activity directly to you. By clicking &quot;Book Now&quot;, you consent to receive
              special offers, tips and other updates from us, from which you can unsubscribe at any time.
            </p>
          </motion.div>
        )}

        {!isActive && (
          <motion.div
            key="payment-collapsed"
            variants={stepContentVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 p-7 sm:p-9"
          >
            {paymentSummary}
            {isCompleted && (
              <button type="button" onClick={() => setStep(3)} className="text-sm font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
                Edit
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </StepCard>
  )
}

/* ─── Sidebar ─── */

function BookingSidebar({
  tour, promoCode, setPromoCode, onApplyPromo, onChangeClick, discount, finalPrice,
  contact, activity, step,
}: {
  tour: typeof DEMO_TOUR
  promoCode: string
  setPromoCode: (v: string) => void
  onApplyPromo: () => void
  onChangeClick: () => void
  discount: number
  finalPrice: number
  contact: { firstName: string; lastName: string; email: string; phone: string }
  activity: { leadFirstName: string; leadLastName: string }
  step: number
}) {
  const stars = useMemo(() => {
    const full = Math.floor(tour.rating)
    return Array.from({ length: 5 }, (_, i) => i < full)
  }, [tour.rating])

  const showPricing = step === 3

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/40 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex gap-4 p-5">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold leading-tight text-slate-900 line-clamp-2">{tour.title}</h3>
            <p className="mt-0.5 text-xs text-slate-400">By <span className="font-semibold text-slate-600">{tour.provider}</span></p>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-sm font-bold text-slate-900">{tour.rating}</span>
              <div className="flex items-center gap-0.5">
                {stars.map((filled, i) => (
                  <Star key={i} className={`size-3 ${filled ? 'fill-emerald-500 text-emerald-500' : 'text-slate-200'}`} />
                ))}
              </div>
              <span className="text-xs text-slate-400">({tour.reviews})</span>
            </div>
          </div>
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/40">
            <img src={tour.image} alt={tour.title} className="h-full w-full object-cover" loading="lazy" />
          </div>
        </div>

        <div className="border-t border-slate-100/60 px-5 py-3 space-y-2">
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-300" />
            <span className="line-clamp-2">{tour.title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays className="size-3.5 shrink-0 text-slate-300" />
            <span>{tour.date} &bull; {tour.time}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="size-3.5 shrink-0 text-slate-300" />
            <span>{tour.travelers}</span>
          </div>
        </div>

        <div className="border-t border-slate-100/60 px-5 py-3">
          <button onClick={onChangeClick} className="text-sm font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
            Change
          </button>
        </div>

        <div className="border-t border-slate-100/60 px-5 py-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p className="text-xs text-slate-500">{tour.cancellation}</p>
          </div>
        </div>
      </div>

      {step > 1 && contact.firstName && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
        >
          <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Contact Details</p>
          <div className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800">{contact.firstName} {contact.lastName}</p>
              <p className="text-xs text-slate-400">{contact.email}</p>
              <p className="text-xs text-slate-400">{contact.phone}</p>
            </div>
          </div>
        </motion.div>
      )}

      {step > 2 && activity.leadFirstName && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
        >
          <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Lead Traveler</p>
          <div className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800">{activity.leadFirstName} {activity.leadLastName}</p>
            </div>
          </div>
        </motion.div>
      )}

      {showPricing && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
        >
          <p className="mb-3 text-sm font-semibold text-slate-800">Promo Code</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              className="flex-1 rounded-xl border border-slate-200/60 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              onClick={onApplyPromo}
              className="rounded-full border border-slate-200/60 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-400 hover:text-emerald-600"
            >
              Apply
            </button>
          </div>
        </motion.div>
      )}

      {showPricing && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Total</span>
            <span className="text-xl font-bold text-slate-900 tracking-tight">${tour.price.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-emerald-600">Promo discount</span>
                <span className="font-semibold text-emerald-600">-${discount.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                <span className="text-sm font-semibold text-slate-700">Final total</span>
                <span className="text-xl font-bold text-emerald-600 tracking-tight">${finalPrice.toFixed(2)}</span>
              </div>
            </>
          )}
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="rounded-[1.75rem] border border-slate-200/40 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        <p className="text-sm font-bold text-slate-900">Need help?</p>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <a href="tel:+18337642166" className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-emerald-600 transition-colors">
            <Phone className="size-4" /> +1 833 764 2166
          </a>
          <button type="button" className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-emerald-600 transition-colors">
            <MessageSquare className="size-4" /> Chat now
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Main Page ─── */

export default function BookingPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const tour = location.state?.tour || DEMO_TOUR

  const [step, setStep] = useState(1)
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)

  const [contact, setContact] = useState({ firstName: '', lastName: '', email: '', countryCode: '+233', phone: '' })
  const [activity, setActivity] = useState({ leadFirstName: '', leadLastName: '' })
  const [payment, setPayment] = useState({ paymentTiming: 'now', paymentMethod: 'card' })

  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false)
  const [editableTour, setEditableTour] = useState({
    date: tour.date, time: tour.time, travelers: tour.travelers, price: tour.price,
  })
  const [bookingConfirmation, setBookingConfirmation] = useState<{
    date: string; travelers: number; tour: { title: string; image: string; rating: number; reviews: number; duration: string }
  } | null>(null)

  /* Validation */
  const contactValid = useMemo(() => ({
    firstName: contact.firstName.trim().length > 1,
    lastName: contact.lastName.trim().length > 1,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email),
    phone: contact.phone.trim().length >= 7 && contact.phone.trim().length <= 20,
    all: contact.firstName.trim().length > 1 && contact.lastName.trim().length > 1 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && contact.phone.trim().length >= 7,
  }), [contact])

  const activityValid = useMemo(() => ({
    leadFirstName: activity.leadFirstName.trim().length > 1,
    leadLastName: activity.leadLastName.trim().length > 1,
    all: activity.leadFirstName.trim().length > 1 && activity.leadLastName.trim().length > 1,
  }), [activity])

  const handleContactChange = (key: string, value: string | boolean) => setContact((prev) => ({ ...prev, [key]: value }))
  const handleActivityChange = (key: string, value: string) => setActivity((prev) => ({ ...prev, [key]: value }))
  const handlePaymentChange = (key: string, value: string) => setPayment((prev) => ({ ...prev, [key]: value }))

  const handleBook = async () => {
    if (payment.paymentTiming === 'now') {
      return
    }

    const payload = {
      tourId: tour.title,
      selectedDate: editableTour.date,
      travelers: { adults: 1, phoneNumber: contact.phone, details: [{ name: `${activity.leadFirstName} ${activity.leadLastName}`.trim() || `${contact.firstName} ${contact.lastName}`, ageGroup: 'adult' }] },
    }
    console.log('Booking payload:', payload)
    toast.success('Booking confirmed!')

    setBookingConfirmation({
      tour: { title: tour.title, image: tour.image, rating: tour.rating, reviews: tour.reviews, duration: tour.duration },
      date: editableTour.date,
      travelers: 1,
    })
  }

  const handleApplyPromo = useCallback(() => {
    const code = promoCode.trim().toUpperCase()
    if (code === 'SAVE10') {
      const amount = editableTour.price * 0.1
      setDiscount(Math.min(amount, editableTour.price))
    } else if (code === 'SAVE20') {
      const amount = editableTour.price * 0.2
      setDiscount(Math.min(amount, editableTour.price))
    } else {
      setDiscount(0)
      if (code) toast.error('Invalid promo code')
    }
  }, [promoCode, editableTour.price])

  const finalPrice = editableTour.price - discount
  const activeTour = { ...tour, ...editableTour, price: finalPrice }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 pt-5">
        <a href="/" className="inline-flex items-center gap-2">
          <img src={logoSrc} alt="Expedition-GO" style={{ height: 110 }} className="w-auto" />
        </a>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-5 sm:px-6 lg:px-8">
          <motion.button
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.97 }}
            className="group mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white px-5 py-2 text-sm font-medium text-slate-400 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600"
          >
            <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
            Back
          </motion.button>

          <div className="rounded-[2.5rem] bg-[#f9fafb] p-4 sm:p-6 lg:p-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="mb-6 md:hidden">
              <MobileSummaryCard tour={activeTour} onChangeClick={() => setIsChangeModalOpen(true)} />
            </div>

            <div className="grid gap-8 md:grid-cols-[1fr_380px]">
              <div className="min-w-0 space-y-6">
                <ContactDetailsStep
                  data={contact}
                  onChange={handleContactChange}
                  onNext={() => contactValid.all ? setStep(2) : undefined}
                  valid={contactValid}
                  step={step}
                  setStep={setStep}
                />
                <ActivityDetailsStep
                  data={activity}
                  onChange={handleActivityChange}
                  tour={activeTour}
                  onNext={() => activityValid.all ? setStep(3) : undefined}
                  valid={activityValid}
                  step={step}
                  setStep={setStep}
                />
                <PaymentDetailsStep
                  data={payment}
                  onChange={handlePaymentChange}
                  tour={activeTour}
                  onBook={handleBook}
                  step={step}
                  setStep={setStep}
                />
              </div>

              <aside className="hidden md:block">
                <div className="sticky top-28 space-y-4">
                  <HoldTimer />
                  <BookingSidebar
                    tour={activeTour}
                    promoCode={promoCode}
                    setPromoCode={setPromoCode}
                    onApplyPromo={handleApplyPromo}
                    onChangeClick={() => setIsChangeModalOpen(true)}
                    discount={discount}
                    finalPrice={finalPrice}
                    contact={{ firstName: contact.firstName, lastName: contact.lastName, email: contact.email, phone: contact.phone }}
                    activity={activity}
                    step={step}
                  />
                </div>
              </aside>
            </div>
          </motion.div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isChangeModalOpen && (
          <ChangeBookingModal
            tour={activeTour}
            isOpen={isChangeModalOpen}
            onClose={() => setIsChangeModalOpen(false)}
            onReserve={(updates) => setEditableTour((prev) => ({ ...prev, ...updates, price: updates.price }))}
          />
        )}
      </AnimatePresence>

      <BookingConfirmationDialog data={bookingConfirmation} onClose={() => setBookingConfirmation(null)} />

      <Footer />
    </div>
  )
}
