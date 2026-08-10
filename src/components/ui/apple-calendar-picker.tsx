"use client";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'
import type { DayAvailability } from '../../lib/tourAvailability'

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

const DropdownArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

type DayAvailabilityStatus = DayAvailability

interface CalendarPickerProps {
  isOpen: boolean
  onClose: () => void
  onDateSelect: (date: Date) => void
  selectedDate?: Date | null
  /** Optional per-date availability lookup. When omitted, all future dates are treated as available. */
  getAvailability?: (date: Date) => DayAvailabilityStatus
  /** Optional remaining/capacity counts for a date (shown under the day number on available/limited days). */
  getDayCounts?: (date: Date) => {
    remaining: number | null
    capacity: number | null
    capacityUnit?: 'people' | 'groups'
  } | null
  /** When true and a day has no data yet, render a subtle pulse instead of a misleading "available" fallback. */
  loading?: boolean
  /** Fired whenever the user navigates to a different month (used to refetch availability for that window). */
  onMonthChange?: (year: number, month: number) => void
}

export const CalendarPicker = ({ isOpen, onClose, onDateSelect, selectedDate, getAvailability, getDayCounts, loading, onMonthChange }: CalendarPickerProps) => {
  const todayRef = useRef(new Date())
  const today = todayRef.current
  const defaultDate = selectedDate || today
  const [currentYear, setCurrentYear] = useState(defaultDate.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(defaultDate.getMonth())
  const [selectedDay, setSelectedDay] = useState(defaultDate.getDate())
  const [showDropdown, setShowDropdown] = useState(false)
  const [direction, setDirection] = useState(0)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    setDirection(-1)
    const y = currentMonth === 0 ? currentYear - 1 : currentYear
    const m = currentMonth === 0 ? 11 : currentMonth - 1
    setCurrentMonth(m)
    setCurrentYear(y)
    onMonthChange?.(y, m)
  }

  const nextMonth = () => {
    setDirection(1)
    const y = currentMonth === 11 ? currentYear + 1 : currentYear
    const m = currentMonth === 11 ? 0 : currentMonth + 1
    setCurrentMonth(m)
    setCurrentYear(y)
    onMonthChange?.(y, m)
  }

  const handleSelectDay = (day: number) => {
    setSelectedDay(day)
    onDateSelect(new Date(currentYear, currentMonth, day))
    onClose()
  }

  const renderDays = () => {
    const days = []
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="w-9 h-9" />)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const isPast = new Date(currentYear, currentMonth, day).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
      const isToday = !isPast && date.toDateString() === today.toDateString()
      const availability: DayAvailabilityStatus = isPast ? 'past' : (getAvailability ? getAvailability(date) : 'available')
      const counts = getDayCounts ? getDayCounts(date) : null
      const hasCounts = !isPast && counts != null && counts.remaining != null && counts.capacity != null && counts.remaining > 0 && (availability === 'available' || availability === 'limited')
      const countUnit = counts?.capacityUnit === 'groups' ? 'groups' : 'spots'
      const isFull = !isPast && availability === 'full'
      const isBlocked = !isPast && availability === 'blocked'
      const isSelectable = !isPast && !isFull && !isBlocked
      const isSelected = day === selectedDay && isSelectable
      // No data for this day yet (availability still fetching) — show a
      // neutral pulse instead of a misleading "available" fallback.
      const isPending = loading && counts == null && !isPast

      if (isPast) {
        days.push(
          <div
            key={`day-${day}`}
            className="w-9 h-9 text-[14px] font-medium rounded-full flex items-center justify-center text-gray-300 cursor-not-allowed"
          >
            {day}
          </div>
        )
      } else if (isPending) {
        days.push(
          <div
            key={`day-${day}`}
            title="Checking availability…"
            aria-disabled="true"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 animate-pulse cursor-default"
          >
            <span className="text-[14px] font-medium text-slate-300">{day}</span>
          </div>
        )
      } else if (isFull) {
        // Sold out — soft red pill, not selectable
        days.push(
          <div
            key={`day-${day}`}
            title="Sold out"
            aria-disabled="true"
            className="w-9 h-9 text-[14px] font-medium rounded-full flex items-center justify-center bg-red-50 text-red-400 line-through cursor-not-allowed"
          >
            {day}
          </div>
        )
      } else if (isBlocked) {
        // Closed/blocked by the supplier — muted, not selectable
        days.push(
          <div
            key={`day-${day}`}
            title="Not available"
            aria-disabled="true"
            className="w-9 h-9 text-[14px] font-medium rounded-full flex items-center justify-center bg-slate-50 text-slate-300 cursor-not-allowed"
          >
            {day}
          </div>
        )
      } else {
        const title = availability === 'limited'
          ? `Limited availability${hasCounts ? ` · ${counts?.remaining} of ${counts?.capacity} ${countUnit} available` : ''}`
          : hasCounts
            ? `${counts?.remaining} of ${counts?.capacity} ${countUnit} available`
            : 'Available'
        days.push(
          <button
            key={`day-${day}`}
            onClick={() => handleSelectDay(day)}
            title={title}
            className={`relative w-9 h-9 text-[14px] font-medium rounded-full flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#179237]/40 active:scale-95 ${
              isSelected
                ? 'bg-gradient-to-b from-[#1a9e3d] to-[#147a2e] text-white font-semibold shadow-[0_4px_10px_-2px_rgba(23,146,55,0.5)] scale-105 z-10'
                : availability === 'limited'
                  ? 'text-black hover:bg-amber-400/10'
                  : 'text-black hover:bg-[#179237]/10'
            } ${isToday && !isSelected ? 'ring-1 ring-inset ring-[#179237]/50 font-semibold' : ''}`}
          >
            {day}
            {!isSelected && (
              hasCounts ? (
                <span
                  className={`absolute bottom-[1px] left-1/2 -translate-x-1/2 text-[8px] font-bold leading-none tracking-tight whitespace-nowrap pointer-events-none ${
                    availability === 'limited' ? 'text-amber-500' : 'text-[#179237]'
                  }`}
                >
                  {counts?.remaining}/{counts?.capacity}
                </span>
              ) : (
                <span
                  className={`absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full ${
                    availability === 'limited' ? 'bg-amber-400' : 'bg-[#179237]'
                  }`}
                />
              )
            )}
          </button>
        )
      }
    }
    return days
  }

  return (
    <div ref={calendarRef} className="absolute top-full left-0 z-50 mt-1.5 w-full bg-white border border-black/[0.06] rounded-[20px] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] overflow-hidden p-5 animate-in fade-in zoom-in duration-200 origin-top">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 text-[16px] font-semibold text-gray-900 hover:opacity-70 transition-opacity focus:outline-none"
        >
          <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
          <div className={`text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : 'rotate-0'}`}>
            <DropdownArrowIcon />
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button onClick={prevMonth} className="p-1.5 text-gray-500 hover:text-[#179237] hover:bg-[#179237]/8 rounded-full transition-colors focus:outline-none">
            <ChevronLeftIcon />
          </button>
          <button onClick={nextMonth} className="p-1.5 text-gray-500 hover:text-[#179237] hover:bg-[#179237]/8 rounded-full transition-colors focus:outline-none">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-y-1 mb-1 text-center">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-[10px] font-bold text-gray-400 tracking-wider">
            {day.slice(0, 1)}{day.slice(1).toLowerCase()}
          </div>
        ))}
      </div>

      {/* Days Grid + Month/Year Dropdown */}
      <div className="relative h-[240px] mb-4">
        <div className="absolute w-full z-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${currentYear}-${currentMonth}`}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-7 gap-y-1 justify-items-center pb-8"
            >
              {renderDays()}
            </motion.div>
          </AnimatePresence>
        </div>

        {showDropdown && (
          <div className="absolute inset-0 z-30 flex flex-col p-3 rounded-[16px] bg-white/98 backdrop-blur-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3 border-b pb-2.5 border-black/5">
              <button onClick={() => setCurrentYear(y => y - 1)} className="p-1.5 text-gray-500 hover:text-[#179237] hover:bg-[#179237]/8 rounded-full transition-colors">
                <ChevronLeftIcon />
              </button>
              <span className="font-bold text-[16px] text-gray-900">{currentYear}</span>
              <button onClick={() => setCurrentYear(y => y + 1)} className="p-1.5 text-gray-500 hover:text-[#179237] hover:bg-[#179237]/8 rounded-full transition-colors">
                <ChevronRightIcon />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 flex-1 overflow-y-auto">
              {MONTH_NAMES.map((m, idx) => {
                const isSelected = idx === currentMonth
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setCurrentMonth(idx)
                      setShowDropdown(false)
                      onMonthChange?.(currentYear, idx)
                    }}
                    className={`py-2 rounded-[10px] text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#179237] text-white shadow-sm'
                        : 'text-gray-700 hover:bg-[#179237]/8'
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Availability legend (single horizontal row — never wraps) */}
      {getAvailability && (
        <div className="flex items-center justify-center gap-x-3 pt-3.5 text-[11px] font-medium text-gray-500 whitespace-nowrap overflow-hidden">
          <span className="flex items-center gap-1.5">
            <span className="w-[7px] h-[7px] rounded-full bg-[#179237] shadow-[0_0_0_2px_rgba(23,146,55,0.15)]" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-[7px] h-[7px] rounded-full bg-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.18)]" /> Limited
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-[7px] h-[7px] rounded-full bg-red-400 shadow-[0_0_0_2px_rgba(248,113,113,0.18)]" /> Sold Out
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-[7px] h-[7px] rounded-full bg-slate-300 shadow-[0_0_0_2px_rgba(148,163,184,0.18)]" /> Closed
          </span>
        </div>
      )}
    </div>
  )
}
