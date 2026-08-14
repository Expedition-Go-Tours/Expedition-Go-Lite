/**
 * @file tourAvailability.ts
 * @description Shared availability types for the booking widget. These mirror
 *   the day shape returned by the Expedition availability endpoint
 *   (GET /api/expedition/tours/:slug/availability), which is built by the
 *   backend's buildAvailabilityCalendar / computeDayEntry — the single source
 *   of truth for statuses, capacity and time slots.
 */

export type DayAvailability = 'available' | 'limited' | 'full' | 'blocked' | 'past'

export interface DayTimeSlot {
  time: string
  capacity: number
  booked: number
  /** null = no live capacity info (e.g. slots taken from the supplier's static schedule). */
  remaining: number | null
  groupsBooked?: number
  groupsRemaining?: number | null
}

export interface DayAvailabilityInfo {
  date: string
  dayOfWeek: string
  isOperatingDay: boolean
  status: DayAvailability
  capacity: number
  booked: number
  remaining: number
  baseCapacity: number
  overrideCapacity: number | null
  overrideStatus: DayAvailability | null
  hasOverride: boolean
  capacityUnit: 'people' | 'groups'
  groupsPerSlot: number | null
  maxGroupSize: number | null
  isPast: boolean
  timeSlots: DayTimeSlot[]
}

/* ─── Supplier availability-schedule formatting (Step 14 "Time slots" vs "Opening hours") ─── */

export type ScheduleType = 'fixedTimeSlot' | 'operatingHours'

export interface TourScheduleInfo {
  scheduleType?: ScheduleType
  timeSlots?: { startTime: string; endTime?: string }[]
  weeklySchedule?: Record<string, { startTime: string; endTime: string }[]>
  operatingHoursStart?: string
  operatingHoursEnd?: string
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

export function formatTime12h(value: string | undefined | null): string {
  if (!value) return ''
  const [h, m] = value.split(':').map((n) => parseInt(n, 10))
  if (!Number.isFinite(h)) return value
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${hour12}:${String(m).padStart(2, '0')} ${period}` : `${hour12} ${period}`
}

/** Collapse the supplier's weekday list into a compact label (Mon–Sat, Daily, …). */
export function formatWeekdayRange(days: string[]): string {
  const present = new Set(days)
  const order = DAY_ORDER.filter((d) => present.has(d))
  if (order.length === 0) return ''
  if (order.length === 7) return 'Daily'
  const groups: string[][] = []
  let cur: string[] = [order[0]]
  for (let i = 1; i < order.length; i++) {
    const prevIdx = DAY_ORDER.indexOf(order[i - 1])
    const curIdx = DAY_ORDER.indexOf(order[i])
    if (curIdx === prevIdx + 1) {
      cur.push(order[i])
    } else {
      groups.push(cur)
      cur = [order[i]]
    }
  }
  groups.push(cur)
  return groups
    .map((g) => (g.length === 1 ? DAY_SHORT[g[0]] : `${DAY_SHORT[g[0]]}–${DAY_SHORT[g[g.length - 1]]}`))
    .join(', ')
}

/** Aggregate weekly range, e.g. "Mon–Sat · 9:00 AM – 7:00 PM". */
export function weeklyHoursRange(schedule?: TourScheduleInfo): string {
  if (!schedule) return ''
  const ws = schedule.weeklySchedule
  if (ws && Object.keys(ws).length > 0) {
    const activeDays = Object.keys(ws).filter((d) => Array.isArray(ws[d]) && ws[d].length > 0)
    if (activeDays.length > 0) {
      const dayLabel = formatWeekdayRange(activeDays)
      const ranges = new Set<string>()
      for (const d of activeDays) {
        for (const s of ws[d]) {
          ranges.add(`${formatTime12h(s.startTime)} – ${formatTime12h(s.endTime)}`)
        }
      }
      return `${dayLabel} · ${Array.from(ranges).join(', ')}`
    }
  }
  if (schedule.operatingHoursStart && schedule.operatingHoursEnd) {
    return `${formatTime12h(schedule.operatingHoursStart)} – ${formatTime12h(schedule.operatingHoursEnd)}`
  }
  return ''
}

/** Opening hours for a specific date: the day's own hours, else the weekly range. */
export function openingHoursForDay(schedule: TourScheduleInfo | undefined, date: Date): string {
  if (!schedule) return ''
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const slots = schedule.weeklySchedule?.[dayName]
  if (Array.isArray(slots) && slots.length > 0) {
    return slots.map((s) => `${formatTime12h(s.startTime)} – ${formatTime12h(s.endTime)}`).join(', ')
  }
  return weeklyHoursRange(schedule)
}

/** Compact list of the tour's fixed time slots, e.g. "6:45 AM · 7:30 AM · 8:00 AM". */
export function formatTimeSlotList(timeSlots?: { startTime: string; endTime?: string }[]): string {
  if (!Array.isArray(timeSlots) || timeSlots.length === 0) return ''
  return timeSlots
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((t) => (t.endTime ? `${formatTime12h(t.startTime)} – ${formatTime12h(t.endTime)}` : formatTime12h(t.startTime)))
    .join(' · ')
}
