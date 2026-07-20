import { useNavigate } from 'react-router-dom'
import { Check, CalendarDays, Users } from 'lucide-react'

interface BookingConfirmationData {
  date: string
  travelers: number
  tour: {
    title: string
    image: string
    rating: number
    reviews: number
    duration: string
  }
}

interface BookingConfirmationDialogProps {
  data: BookingConfirmationData | null
  onClose: () => void
}

export default function BookingConfirmationDialog({ data, onClose }: BookingConfirmationDialogProps) {
  const navigate = useNavigate()

  if (!data) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl text-slate-900">
        <div className="flex items-center gap-3 pr-8">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100">
            <Check className="size-6 text-emerald-600" />
          </span>
          <span className="text-xl font-black text-slate-900">Booking Confirmed!</span>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{data.tour.title}</p>

          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-slate-400" />
            <span>{data.date}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-slate-400" />
            <span>{data.travelers} {data.travelers === 1 ? 'traveler' : 'travelers'}</span>
          </div>

          <p className="text-sm leading-relaxed text-slate-500">
            Your booking has been placed successfully. You&apos;ll receive a confirmation email shortly with all the details. The supplier will reach out with pickup information before your tour date.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => {
              onClose()
              navigate('/')
            }}
            className="flex-1 rounded-full bg-[#179237] py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
          >
            Back to Home
          </button>
          <button
            type="button"
            onClick={() => {
              const reviewSlug = data.tour.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
              onClose()
              navigate(`/review/${reviewSlug}`, {
                state: { tour: { ...data.tour, slug: reviewSlug } },
              })
            }}
            className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            Write a Review
          </button>
        </div>
      </div>
    </div>
  )
}
