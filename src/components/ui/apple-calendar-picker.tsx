"use client";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'

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

interface CalendarPickerProps {
  isOpen: boolean
  onClose: () => void
  onDateSelect: (date: Date) => void
  selectedDate?: Date | null
}

export const CalendarPicker = ({ isOpen, onClose, onDateSelect, selectedDate }: CalendarPickerProps) => {
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
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    setDirection(1)
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
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
      const isPast = date.setHours(0,0,0,0) < todayRef.current.setHours(0,0,0,0)
      const isSelected = day === selectedDay && !isPast

      if (isPast) {
        days.push(
          <div
            key={`day-${day}`}
            className="w-9 h-9 text-[15px] font-medium rounded-full flex items-center justify-center text-gray-300 cursor-not-allowed"
          >
            {day}
          </div>
        )
      } else {
        days.push(
          <button
            key={`day-${day}`}
            onClick={() => handleSelectDay(day)}
            className={`w-9 h-9 text-[15px] font-medium rounded-full flex items-center justify-center transition-all focus:outline-none ${
              isSelected
                ? 'bg-[#179237] text-white font-semibold shadow-md scale-105 z-10'
                : 'text-[#179237] hover:bg-black/5'
            }`}
          >
            {day}
          </button>
        )
      }
    }
    return days
  }

  return (
    <div ref={calendarRef} className="absolute top-full left-0 z-50 mt-1 w-full bg-white border border-black/5 rounded-[18px] shadow-xl overflow-hidden p-[18px] animate-in fade-in zoom-in duration-200 origin-top">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 text-[17px] font-semibold text-[#179237] hover:opacity-75 transition-opacity focus:outline-none"
        >
          <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
          <div className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : 'rotate-0'}`}>
            <DropdownArrowIcon />
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 text-[#179237] hover:bg-black/5 rounded-full transition-colors focus:outline-none">
            <ChevronLeftIcon />
          </button>
          <button onClick={nextMonth} className="p-1.5 text-[#179237] hover:bg-black/5 rounded-full transition-colors focus:outline-none">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-y-1 mb-2 text-center">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-[10px] font-bold text-gray-400 tracking-wider">
            {day}
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
              className="grid grid-cols-7 gap-y-1 justify-items-center"
            >
              {renderDays()}
            </motion.div>
          </AnimatePresence>
        </div>

        {showDropdown && (
          <div className="absolute inset-0 z-30 flex flex-col p-3 rounded-[18px] bg-white/95 backdrop-blur-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3 border-b pb-2 border-black/5">
              <button onClick={() => setCurrentYear(y => y - 1)} className="p-1.5 text-[#179237] hover:bg-black/5 rounded-full transition-colors">
                <ChevronLeftIcon />
              </button>
              <span className="font-bold text-[16px] text-black">{currentYear}</span>
              <button onClick={() => setCurrentYear(y => y + 1)} className="p-1.5 text-[#179237] hover:bg-black/5 rounded-full transition-colors">
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
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#179237] text-white shadow-sm'
                        : 'text-black hover:bg-black/5'
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
    </div>
  )
}
