import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Ticket, AlertTriangle, ArrowRight } from 'lucide-react'
import {
  useMyExpeditionBookings,
  type ExpeditionBookingSummary,
} from '../hooks/useExpeditionBookings'
import BookingCard from '../components/booking/BookingCard'
import { formatHeadingDate, toDateKey, isSameCalendarDay } from '../lib/bookingUi'
import '../components/booking/bookingTheme.css'
import './BookingHistory.css'

type Bucket = 'upcoming' | 'past' | 'cancelled'

const BUCKETS: { value: Bucket; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
]

function bucketOf(booking: ExpeditionBookingSummary): Bucket {
  if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') return 'cancelled'
  if (booking.status === 'COMPLETED') return 'past'
  return 'upcoming'
}

function groupHeading(dateKey: string, labelForHeading: string): string {
  const today = new Date()
  const target = new Date(dateKey + 'T00:00:00')
  if (isSameCalendarDay(target, today)) return 'Today'
  const tomorrow = new Date(today.getTime() + 86400000)
  if (isSameCalendarDay(target, tomorrow)) return 'Tomorrow'
  return labelForHeading
}

export default function BookingHistory() {
  const [bucket, setBucket] = useState<Bucket>('upcoming')
  const [query, setQuery] = useState('')

  const { data: bookings = [], isLoading, isError, error, refetch } = useMyExpeditionBookings(
    1,
    undefined,
    100
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = bookings.filter((b) => {
      if (bucketOf(b) !== bucket) return false
      if (!q) return true
      return (
        b.tourTitle.toLowerCase().includes(q) ||
        b.bookingNumber.toLowerCase().includes(q) ||
        b.tourLocation.toLowerCase().includes(q)
      )
    })
    if (bucket === 'upcoming') {
      return [...base].sort(
        (a, b) => new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime()
      )
    }
    return [...base].sort(
      (a, b) => new Date(b.travelDate).getTime() - new Date(a.travelDate).getTime()
    )
  }, [bookings, bucket, query])

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { upcoming: 0, past: 0, cancelled: 0 }
    for (const b of bookings) c[bucketOf(b)] += 1
    return c
  }, [bookings])

  const upcomingGroups = useMemo(() => {
    const groups: { key: string; label: string; items: ExpeditionBookingSummary[] }[] = []
    for (const b of filtered) {
      const key = toDateKey(b.travelDate)
      const last = groups[groups.length - 1]
      if (!key) {
        groups.push({ key: 'unknown', label: 'Date not set', items: [b] })
      } else if (last && last.key === key) {
        last.items.push(b)
      } else {
        groups.push({ key, label: groupHeading(key, formatHeadingDate(key)), items: [b] })
      }
    }
    return groups
  }, [filtered])

  const listStatus = isError ? 'error' : isLoading ? 'loading' : 'ready'

  return (
    <div className="bk-page">
      {/* Toolbar */}
      <div className="bk-toolbar">
        <div className="bk-segmented" role="group" aria-label="Filter bookings">
          {BUCKETS.map((b) => {
            const active = bucket === b.value
            return (
              <button
                key={b.value}
                type="button"
                className={`bk-seg-btn${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() => setBucket(b.value)}
              >
                {b.label}
                <span className={`bk-seg-count${active ? ' active' : ''}`}>{counts[b.value]}</span>
              </button>
            )
          })}
        </div>

        <label className="bk-search">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by tour or referenceâ€¦"
            aria-label="Search bookings by tour or reference"
          />
        </label>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {listStatus === 'error' ? (
          <motion.div key="error" className="bk-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AlertTriangle size={26} />
            <h3>Couldn't load your bookings</h3>
            <p>{(error as Error)?.message || 'Something went wrong while fetching your bookings.'}</p>
            <button type="button" className="bk-btn bk-btn-primary" onClick={() => refetch()}>
              Try again
            </button>
          </motion.div>
        ) : listStatus === 'loading' ? (
          <motion.div key="loading" className="bk-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="bk-card bk-card-skeleton" aria-hidden="true">
                <div className="bk-media bk-skel bk-skel-media" />
                <div className="bk-body">
                  <div className="bk-skel bk-skel-line bk-skel-w40" />
                  <div className="bk-skel bk-skel-line bk-skel-w70" />
                  <div className="bk-skel bk-skel-line bk-skel-w50" />
                </div>
                <div className="bk-actions">
                  <div className="bk-skel bk-skel-btn" />
                  <div className="bk-skel bk-skel-btn" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div key="empty" className="bk-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Ticket size={26} />
            <h3>
              {query
                ? 'No bookings match your search'
                : bucket === 'upcoming'
                  ? 'No upcoming bookings'
                  : bucket === 'past'
                    ? 'No past bookings yet'
                    : 'No cancelled bookings'}
            </h3>
            <p>
              {query
                ? 'Try a different tour name or booking reference.'
                : bucket === 'upcoming'
                  ? 'When you book an experience it will appear here.'
                  : 'Bookings you cancel will be kept here for your records.'}
            </p>
            {!query && (
              <button
                type="button"
                className="bk-btn bk-btn-primary"
                onClick={() => (window.location.href = '/')}
              >
                Explore experiences <ArrowRight size={15} />
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key={bucket} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {bucket === 'upcoming' ? (
              upcomingGroups.map((group) => (
                <section key={group.key} className="bk-group">
                  <h2 className="bk-group-title">{group.label}</h2>
                  <div className="bk-list">
                    {group.items.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="bk-list">
                {filtered.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
