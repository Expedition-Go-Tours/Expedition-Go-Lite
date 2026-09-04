import { useState, useEffect, useRef } from 'react'
import './CountdownTimer.tsx.css'

interface CountdownTimerProps {
  deadline: Date | null
  label?: string
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

export default function CountdownTimer({ deadline, label = 'Deals expire in' }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!deadline) {
      setRemaining(null)
      return
    }

    const tick = () => {
      const diff = deadline.getTime() - Date.now()
      if (diff <= 0) {
        setRemaining(null)
        if (intervalRef.current) clearInterval(intervalRef.current)
        return
      }
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setRemaining({ hours, minutes, seconds })
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [deadline])

  if (!remaining) return null

  return (
    <div className="countdown-timer" role="timer" aria-live="polite">
      <span className="countdown-label">{label}</span>
      <span className="countdown-value">
        {remaining.hours > 24 && (
          <>
            <span className="countdown-num">{padTwo(Math.floor(remaining.hours / 24))}d</span>
            <span className="countdown-sep">{' '}</span>
          </>
        )}
        <span className="countdown-num">{padTwo(remaining.hours % 24)}</span>
        <span className="countdown-sep">:</span>
        <span className="countdown-num">{padTwo(remaining.minutes)}</span>
        <span className="countdown-sep">:</span>
        <span className="countdown-num">{padTwo(remaining.seconds)}</span>
      </span>
    </div>
  )
}
