import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Ticket, AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Wallet } from 'lucide-react'
import {
  useMyExpeditionBookings,
  useMyBookingsCount,
  type ExpeditionBookingSummary,
} from '../hooks/useExpeditionBookings'
import { useAuthUser } from '@/hooks/useAuthUser'
import BookingCard from '../components/booking/BookingCard'
const BookingWorkspace = lazy(() => import('../components/booking/BookingWorkspace'))
import { formatHeadingDate, toDateKey, isSameCalendarDay } from '../lib/bookingUi'
import { writeBookingsSeen } from '../lib/bookingsBadge'
import '../components/booking/bookingTheme.css'
import './BookingHistory.css'

type Bucket = 'all' | 'upcoming' | 'past'

const BUCKETS: { value: Bucket; label: string }[] = [
  { value: 'all', label: 'All' },
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
  const location = useLocation()
  const bookingId = searchParams.get('booking')
  const listScrollRef = useRef(0)
  const user = useAuthUser()

  const [bucket, setBucket] = useState<Bucket>('all')
  const [query, setQuery] = useState('')

  const { data: bookings = [], isLoading, isError, error, refetch } = useMyExpeditionBookings(
    1,
    undefined,
    100
  )

  // Live total of CONFIRMED/PENDING bookings — the number the navbar badge
  // compares against. Watching it here keeps the badge's "seen" marker in sync
  // so opening Bookings from any entry point (top tab, bottom bar, mobile
  // drawer, or the navbar icon) dismisses the badge once the list is visible.
  const { data: liveCount } = useMyBookingsCount('CONFIRMED,PENDING', !!user)

  // DashboardLayout keeps every visited pane mounted, so only persist the
  // seen-marker while this Bookings list is the pane actually on screen.
  useEffect(() => {
    if (!user || liveCount == null) return
    if (location.pathname !== '/dashboard/bookings') return
    writeBookingsSeen(liveCount)
  }, [user, liveCount, location.pathname])

  // Banner stats
  const bannerStats = useMemo(() => {
    let upcoming = 0
    let completed = 0
    let totalSpent = 0
    for (const b of bookings) {
      if (isActiveBooking(b.status)) upcoming++
      else if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') completed++
      totalSpent += b.total ?? 0
    }
    return { total: bookings.length, upcoming, completed, totalSpent }
  }, [bookings])

  // Next upcoming trip for the greeting
  const nextTrip = useMemo(() => {
    const now = new Date()
    const upcoming = bookings
      .filter((b) => isActiveBooking(b.status) && new Date(b.travelDate) > now)
      .sort((a, b) => new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime())
    return upcoming[0] ?? null
  }, [bookings])

  const daysUntilNext = useMemo(() => {
    if (!nextTrip) return null
    const diff = Math.ceil((new Date(nextTrip.travelDate).getTime() - Date.now()) / 86400000)
    return diff <= 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff} days`
  }, [nextTrip])

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
      if (bucket !== 'all' && bucketOf(b) !== bucket) return false
      if (!q) return true
      return (
        b.tourTitle.toLowerCase().includes(q) ||
        b.bookingNumber.toLowerCase().includes(q) ||
        b.tourLocation.toLowerCase().includes(q)
      )
    })

    if (bucket === 'upcoming' || bucket === 'all') {
      const startOfTodayMs = startOfToday()
      return [...base].sort((a, b) => {
        if (bucket === 'upcoming') return dateMs(a.travelDate) - dateMs(b.travelDate)
        // All: active first by date asc, then terminal by date desc
        const aActive = isActiveBooking(a.status)
        const bActive = isActiveBooking(b.status)
        if (aActive !== bActive) return aActive ? -1 : 1
        if (aActive) return dateMs(a.travelDate) - dateMs(b.travelDate)
        const aFutureTerminal = isTerminalBooking(a.status) && dateMs(a.travelDate) >= startOfTodayMs
        const bFutureTerminal = isTerminalBooking(b.status) && dateMs(b.travelDate) >= startOfTodayMs
        if (aFutureTerminal !== bFutureTerminal) return aFutureTerminal ? 1 : -1
        return dateMs(b.travelDate) - dateMs(a.travelDate)
      })
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
    const c: Record<Bucket, number> = { all: 0, upcoming: 0, past: 0 }
    for (const b of bookings) {
      c[bucketOf(b)] += 1
      c.all += 1
    }
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
  const activeLabel = bucket === 'all' ? 'trip' : bucket === 'upcoming' ? 'upcoming trip' : 'past trip'

  return (
    <div className="bk-page">
      <div className="bk-swap">
        {/* Pane 1 — bookings list (always mounted) */}
        <section
          className={`bk-pane bk-pane-list${bookingId ? ' off' : ' on'}`}
          aria-hidden={!!bookingId}
        >
          {/* Welcome banner */}
          {bookings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bk-banner"
            >
              <div className="bk-banner-text">
                <h2 className="bk-banner-greeting">
                  Welcome back, {user?.name?.split(' ')[0] || 'there'}
                </h2>
                <p className="bk-banner-sub">
                  {nextTrip
                    ? <>Your next trip: <strong>{nextTrip.tourTitle}</strong> {daysUntilNext}</>
                    : "Here's an overview of your trips."
                  }
                </p>
              </div>

              <div className="bk-banner-stats">
                <button type="button" className="bk-banner-stat" onClick={() => setBucket('all')}>
                  <CalendarDays size={18} className="bk-banner-stat-icon" />
                  <span className="bk-banner-stat-value">{bannerStats.total}</span>
                  <span className="bk-banner-stat-label">Total</span>
                </button>
                <button type="button" className="bk-banner-stat" onClick={() => setBucket('upcoming')}>
                  <span className="bk-banner-stat-dot bg-[var(--bv-success-dot)]" />
                  <span className="bk-banner-stat-value">{bannerStats.upcoming}</span>
                  <span className="bk-banner-stat-label">Upcoming</span>
                </button>
                <button type="button" className="bk-banner-stat" onClick={() => setBucket('past')}>
                  <CheckCircle2 size={18} className="bk-banner-stat-icon" />
                  <span className="bk-banner-stat-value">{bannerStats.completed}</span>
                  <span className="bk-banner-stat-label">Completed</span>
                </button>
                <div className="bk-banner-stat">
                  <Wallet size={18} className="bk-banner-stat-icon" />
                  <span className="bk-banner-stat-value">
                    {bannerStats.totalSpent >= 1000
                      ? `$${(bannerStats.totalSpent / 1000).toFixed(1)}k`
                      : `$${bannerStats.totalSpent}`}
                  </span>
                  <span className="bk-banner-stat-label">Spent</span>
                </div>
              </div>
            </motion.div>
          )}

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
                  : bucket === 'all'
                    ? 'No bookings yet'
                    : bucket === 'upcoming'
                      ? 'No upcoming trips'
                      : 'No past trips yet'}
              </h3>
              <p>
                {query
                  ? 'Try a different tour name or booking reference.'
                  : bucket === 'all'
                    ? 'When you book an experience it will appear here.'
                    : bucket === 'upcoming'
                      ? 'When you book an experience it will appear here.'
                      : 'Trips you have been on, or cancelled, will be kept here for your records.'}
              </p>
              {!query && bucket === 'all' && (
                <button
                  type="button"
                  className="bk-btn bk-btn-primary"
                  onClick={() => (window.location.href = '/')}
                >
                  Explore experiences <ArrowRight size={15} />
                </button>
              )}
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
          ) : bucket === 'past' ? (
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
          ) : (
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
          )}
        </section>

        {/* Pane 2 — booking workspace (slides over the list) */}
        <section className={`bk-pane bk-pane-detail${bookingId ? ' on' : ' off'}`}>
          {bookingId ? (
            <Suspense
              fallback={
                <div className="ws-loading">
                  <div className="ws-loading-spinner" />
                </div>
              }
            >
              <BookingWorkspace id={bookingId} onClose={closeDetail} />
            </Suspense>
          ) : (
            <div className="bk-pane-empty" />
          )}
        </section>
      </div>
    </div>
  )
}
