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
  remaining: number
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
