import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Ticket, AlertTriangle, ArrowRight } from 'lucide-react'
import {
  useMyExpeditionBookings,
  type ExpeditionBookingSummary,
} from '../hooks/useExpeditionBookings'
import BookingCard from '../components/booking/BookingCard'
import BookingWorkspace from '../components/booking/BookingWorkspace'
import { formatHeadingDate, toDateKey, isSameCalendarDay } from '../lib/bookingUi'
import '../components/booking/bookingTheme.css'
import './BookingHistory.css'

type Bucket = 'upcoming' | 'past'

const BUCKETS: { value: Bucket; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED']
const TERMINAL_STATUSES = ['CANCELLED', 'NO_SHOW']

function isActiveBooking(status: string): boolean {
  return ACTIVE_STATUSES.includes(status)
}

function isTerminalBooking(status: string): boolean {
  return TERMINAL_STATUSES.includes(status)
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function bucketOf(booking: ExpeditionBookingSummary): Bucket {
  return isActiveBooking(booking.status) ? 'upcoming' : 'past'
}

function dateMs(value: string): number {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
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
  const [searchParams, setSearchParams] = useSearchParams()
  const bookingId = searchParams.get('booking')
  const listScrollRef = useRef(0)

  const [bucket, setBucket] = useState<Bucket>('upcoming')
  const [query, setQuery] = useState('')

  const { data: bookings = [], isLoading, isError, error, refetch } = useMyExpeditionBookings(
    1,
    undefined,
    100
  )

  // Open a booking without changing the route — the list below stays mounted.
  const openBooking = (booking: ExpeditionBookingSummary) => {
    setSearchParams({ booking: booking.id }, { replace: false })
  }

  const closeDetail = () => {
    setSearchParams({})
  }

  // Keep the list's scroll position across the slide.
  useEffect(() => {
    if (bookingId) {
      listScrollRef.current = window.scrollY
      window.scrollTo({ top: 0, behavior: 'auto' })
    } else if (listScrollRef.current) {
      window.scrollTo({ top: listScrollRef.current, behavior: 'auto' })
      listScrollRef.current = 0
    }
  }, [bookingId])

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
      return [...base].sort((a, b) => dateMs(a.travelDate) - dateMs(b.travelDate))
    }

    const startOfTodayMs = startOfToday()
    return [...base].sort((a, b) => {
      const aFutureTerminal = isTerminalBooking(a.status) && dateMs(a.travelDate) >= startOfTodayMs
      const bFutureTerminal = isTerminalBooking(b.status) && dateMs(b.travelDate) >= startOfTodayMs
      if (aFutureTerminal !== bFutureTerminal) return aFutureTerminal ? 1 : -1
      return dateMs(b.travelDate) - dateMs(a.travelDate)
    })
  }, [bookings, bucket, query])

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { upcoming: 0, past: 0 }
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
  const activeLabel = bucket === 'upcoming' ? 'upcoming trip' : 'past trip'

  return (
    <div className="bk-page">
      <div className="bk-swap">
        {/* Pane 1 — bookings list (always mounted) */}
        <section
          className={`bk-pane bk-pane-list${bookingId ? ' off' : ' on'}`}
          aria-hidden={!!bookingId}
        >
          <div className="bk-toolbar">
            <div className="bk-seg" role="group" aria-label="Filter bookings by time">
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
                    {active && <span className="bk-seg-indicator" />}
                    <span className="bk-seg-inner">
                      <span className="bk-seg-label">{b.label}</span>
                      <span className="bk-seg-count">{counts[b.value]}</span>
                    </span>
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
                placeholder="Search by tour or booking reference"
                aria-label="Search bookings by tour or reference"
              />
            </label>
          </div>

          {listStatus === 'error' ? (
            <div className="bk-state">
              <AlertTriangle size={26} />
              <h3>Couldn't load your bookings</h3>
              <p>{(error as Error)?.message || 'Something went wrong while fetching your bookings.'}</p>
              <button type="button" className="bk-btn bk-btn-primary" onClick={() => refetch()}>
                Try again
              </button>
            </div>
          ) : listStatus === 'loading' ? (
            <div className="bk-list">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bk-card bk-card-skeleton" aria-hidden="true">
                  <div className="bk-media">
                    <div className="bk-skel bk-skel-media" />
                  </div>
                  <div className="bk-body">
                    <div className="bk-skel bk-skel-line bk-skel-w30" />
                    <div className="bk-skel bk-skel-line bk-skel-w80" />
                    <div className="bk-skel bk-skel-line bk-skel-w60" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bk-state">
              <Ticket size={26} />
              <h3>
                {query
                  ? 'No bookings match your search'
                  : bucket === 'upcoming'
                    ? 'No upcoming trips'
                    : 'No past trips yet'}
              </h3>
              <p>
                {query
                  ? 'Try a different tour name or booking reference.'
                  : bucket === 'upcoming'
                    ? 'When you book an experience it will appear here.'
                    : 'Trips you have been on, or cancelled, will be kept here for your records.'}
              </p>
              {!query && bucket === 'upcoming' && (
                <button
                  type="button"
                  className="bk-btn bk-btn-primary"
                  onClick={() => (window.location.href = '/')}
                >
                  Explore experiences <ArrowRight size={15} />
                </button>
              )}
            </div>
          ) : bucket === 'upcoming' ? (
            upcomingGroups.map((group) => (
              <section key={group.key} className="bk-group">
                <h2 className="bk-group-title">
                  {group.label}
                  <span className="bk-group-count">
                    {group.items.length} {group.items.length === 1 ? 'booking' : 'bookings'}
                  </span>
                </h2>
                <div className="bk-list">
                  {group.items.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} onOpen={() => openBooking(booking)} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <>
              <div className="bk-list">
                {filtered.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} onOpen={() => openBooking(booking)} />
                ))}
              </div>
              <p className="bk-list-foot">
                Showing {filtered.length} {filtered.length === 1 ? activeLabel : `${activeLabel}s`}.
              </p>
            </>
          )}
        </section>

        {/* Pane 2 — booking workspace (slides over the list) */}
        <section className={`bk-pane bk-pane-detail${bookingId ? ' on' : ' off'}`}>
          {bookingId ? (
            <BookingWorkspace id={bookingId} onClose={closeDetail} />
          ) : (
            <div className="bk-pane-empty" />
          )}
        </section>
      </div>
    </div>
  )
}
