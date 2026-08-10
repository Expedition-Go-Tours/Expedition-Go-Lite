import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, CalendarDays, Users, ShieldCheck, CreditCard, Info, Clock } from 'lucide-react'
import { CalendarPicker } from '../ui/apple-calendar-picker'
import { useTourAvailability } from '../../hooks/useExpeditionBookings'

interface ChangeBookingModalProps {
  tour: {
    id?: string
    slug?: string
    title: string
    price: number
    time?: string
  }
  isOpen: boolean
  onClose: () => void
  onReserve: (updates: { date: string; dateISO: string; time: string; selectedDate: string; selectedTime?: string | null; travelers: string; travelersCount: number; price: number }) => void
}

const formatSlotTime = (time: string): string => {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10))
  if (!Number.isFinite(h)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${hour12}:${String(m).padStart(2, '0')} ${period}` : `${hour12} ${period}`
}

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export default function ChangeBookingModal({ tour, isOpen, onClose, onReserve }: ChangeBookingModalProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toDateKey(d)
  })
  const [showCalendar, setShowCalendar] = useState(false)
  const [travelers, setTravelers] = useState(1)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const availStart = useMemo(() => {
    const d = new Date(viewMonth.year, viewMonth.month, 1)
    return toDateKey(d)
  }, [viewMonth])
  const availEnd = useMemo(() => {
    const d = new Date(viewMonth.year, viewMonth.month + 1, 0)
    return toDateKey(d)
  }, [viewMonth])
  const { data: availabilityCalendar } = useTourAvailability(
    tour.slug || tour.id,
    isOpen ? availStart : undefined,
    isOpen ? availEnd : undefined
  )

  const availabilityMap = useMemo(() => {
    const map = new Map<string, 'available' | 'limited' | 'full' | 'blocked' | 'past'>()
    if (availabilityCalendar) {
      for (const day of availabilityCalendar) {
        map.set(day.date, day.status)
      }
    }
    return map
  }, [availabilityCalendar])

  const selectedDayInfo = useMemo(() => {
    if (!availabilityCalendar) return undefined
    return availabilityCalendar.find((d) => d.date === selectedDate)
  }, [availabilityCalendar, selectedDate])

  const daySlots = selectedDayInfo?.timeSlots?.length ? selectedDayInfo.timeSlots : []

  // Effective slot — default to the day's first open slot when none is chosen.
  const effectiveTime = selectedTime ?? daySlots.find((s) => s.remaining > 0)?.time ?? null

  const formattedDate = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }, [selectedDate])

  const total = tour.price * travelers

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{tour.title}</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                <CalendarDays className="size-3.5 text-slate-500" />
                {formattedDate}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                <Users className="size-3.5 text-slate-500" />
                {travelers}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-3 rounded-xl bg-slate-50/70 p-4">
            <div className="flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#179237]" />
              <span>
                <span className="font-semibold text-slate-800 underline underline-offset-2 cursor-pointer">Cancellation policy</span>
                &bull; Free cancellation up to 24 hours before the tour
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-600">
              <CreditCard className="mt-0.5 size-4 shrink-0 text-[#179237]" />
              <span>
                <span className="font-semibold text-slate-800 underline underline-offset-2 cursor-pointer">Reserve now, pay later</span>
                &bull; Book your spot and pay nothing today
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="mt-0.5 size-4 shrink-0 text-[#179237]" />
              <span>
                <span className="font-semibold text-slate-800">Book ahead</span>
                &bull; Reserve now to secure your preferred date and time
              </span>
            </div>
          </div>

          <div className="rounded-xl border-2 border-[#179237] bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900">{tour.title}</h3>
            <p className="mt-1 text-xs text-slate-500">Pickup included</p>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-slate-600">{travelers} Adult x ${tour.price.toFixed(2)}</p>
              <p className="text-sm font-bold text-slate-900">Total ${total.toFixed(2)}</p>
              <p className="text-[11px] text-slate-400">Includes all taxes and fees</p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Select Date</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCalendar((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#179237] focus:ring-2 focus:ring-[#179237]/15"
              >
                <span>{formattedDate}</span>
                <span className="text-slate-400">{showCalendar ? '▲' : '▼'}</span>
              </button>
              {showCalendar && (
                <div className="absolute top-full left-0 right-0 z-20 mt-2">
                  <CalendarPicker
                    isOpen={showCalendar}
                    onClose={() => setShowCalendar(false)}
                    onDateSelect={(date) => {
                      setSelectedDate(toDateKey(date))
                      setSelectedTime(null)
                      setShowCalendar(false)
                    }}
                    selectedDate={selectedDate ? new Date(`${selectedDate}T00:00:00`) : null}
                    getAvailability={(date) => {
                      const key = toDateKey(date)
                      return availabilityMap.get(key) || 'available'
                    }}
                    getDayCounts={(date) => {
                      const day = availabilityCalendar?.find((d) => d.date === toDateKey(date))
                      if (!day) return null
                      return {
                        remaining: day.remaining,
                        capacity: day.capacity,
                        capacityUnit: day.capacityUnit,
                      }
                    }}
                    onMonthChange={(year, month) => setViewMonth({ year, month })}
                  />
                </div>
              )}
            </div>
          </div>

          {daySlots.length > 0 && (
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Clock className="size-4 text-slate-400" />
                Select Time
              </label>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => {
                  const slotFull = slot.remaining <= 0
                  const isSelected = effectiveTime === slot.time
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={slotFull}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? 'border-[#179237] bg-[#f0fdf4] text-[#179237]'
                          : slotFull
                            ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {formatSlotTime(slot.time)}
                      <span className={`ml-1.5 ${isSelected ? 'text-[#179237]/70' : 'text-slate-400'}`}>
                        {slotFull ? 'sold out' : `${Math.max(0, slot.remaining)} left`}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Travelers</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTravelers((t) => Math.max(1, t - 1))}
                className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
              >
                &minus;
              </button>
              <span className="min-w-[2rem] text-center text-lg font-bold text-slate-900">{travelers}</span>
              <button
                onClick={() => setTravelers((t) => Math.min(20, t + 1))}
                className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => {
              onReserve({
                date: formattedDate,
                dateISO: selectedDate,
                selectedDate,
                time: effectiveTime ? formatSlotTime(effectiveTime) : (tour.time || '9:00 AM'),
                selectedTime: effectiveTime,
                travelers: `${travelers} ${travelers === 1 ? 'adult' : 'adults'}`,
                travelersCount: travelers,
                price: total,
              })
              onClose()
            }}
            className="w-full rounded-full bg-[#179237] py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
          >
            Reserve Now
          </button>
        </div>
      </motion.div>
    </div>
  )
}
