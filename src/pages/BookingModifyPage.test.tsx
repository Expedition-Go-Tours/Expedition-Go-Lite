/**
 * Quote → apply flow tests for the customer "Edit trip" page.
 *
 * The page sends the diff (only what changed) to the quote endpoint while the
 * traveller types, then applies that same diff on confirm. These tests pin
 * both payloads plus the blocked-state guard; the server-side re-pricing is
 * covered by the backend bookingModify / e2e suites.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  detail: { data: null as unknown, isLoading: false },
  quote: vi.fn((..._args: unknown[]) => ({ data: undefined as unknown, isFetching: false })),
  apply: vi.fn(),
  discard: vi.fn(),
  settled: vi.fn((..._args: unknown[]) => ({ data: null as unknown })),
  tour: vi.fn(() => ({
    data: {
      id: 'tour-1',
      title: 'Cape Coast Castle Day Trip',
      pricingModel: 'perPerson',
      travelerPricing: [{ ageGroup: 'Adult', label: 'Adult', price: 89 }],
      minParticipants: 1,
      maxParticipants: 20,
    },
  })),
}));

const QUOTE = () => ({
  data: {
    quote: {
      moneyMode: 'none',
      newTotal: 267,
      delta: 89,
      currency: 'USD',
    },
  },
  isFetching: false,
});

vi.mock('react-router-dom', () => ({
  useParams: () => ({}),
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../hooks/useExpeditionBookings', () => ({
  useExpeditionBookingDetail: () => mocks.detail,
  useBookingModifyQuote: (...args: unknown[]) => mocks.quote(...args),
  useApplyBookingModify: () => ({ mutateAsync: mocks.apply, isPending: false }),
  useDiscardBookingModify: () => ({ mutateAsync: mocks.discard, isPending: false }),
  useBookingModifySettled: (...args: unknown[]) => mocks.settled(...args),
  useTourAvailability: () => ({ data: [] }),
}));

vi.mock('../hooks/useExpeditionTours', () => ({
  useExpeditionTour: () => mocks.tour(),
}));

// A stateful stand-in for the real traveller hook so the +/- steppers work.
vi.mock('../hooks/useTravelerSelection', async () => {
  const React = require('react') as typeof import('react')
  const { sumCountsToBuckets } = await import('../lib/travelerBuckets')
  return {
    useTravelerSelection: (
      _tour: unknown,
      options?: { initialCounts?: Record<string, number> },
    ) => {
      const [counts, setCounts] = React.useState<Record<string, number>>(options?.initialCounts ?? {})
      const total = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0)
      return {
        isPerGroup: false,
        travelersPayload: sumCountsToBuckets(counts),
        totalTravelers: total,
        activeGroupBandLabel: '',
        travelerOptions: [{ key: 'adult', label: 'Adult', price: 89 }],
        categoryCounts: counts,
        mixIssues: [],
        increment: (key: string) => setCounts((c) => ({ ...c, [key]: (c[key] || 0) + 1 })),
        decrement: (key: string) => setCounts((c) => ({ ...c, [key]: Math.max(0, (c[key] || 0) - 1) })),
        canIncrementCount: () => true,
        canDecrementCount: (key: string) => (counts[key] || 0) > 0,
      }
    },
  }
})

vi.mock('../components/booking/CheckoutElements', () => ({
  default: () => null,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => (
      <div {...(props as Record<string, unknown>)}>{children as React.ReactNode}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import BookingModifyPage from './BookingModifyPage'

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    bookingNumber: 'EXP-12345-2026-01',
    status: 'CONFIRMED',
    travelDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    selectedTime: null,
    currency: 'USD',
    travelers: { adults: 2, children: 0, infants: 0 },
    tour: { id: 'tour-1', title: 'Cape Coast Castle Day Trip', slug: 'cape-coast-castle-day-trip' },
    modify: {
      allowed: true,
      cutoffHours: 24,
      deadline: new Date(Date.now() + 9 * 86400000).toISOString(),
      pendingPayment: null,
    },
    ...overrides,
  }
}

beforeEach(() => {
  mocks.navigate.mockReset()
  mocks.quote.mockReset().mockImplementation(QUOTE)
  mocks.apply.mockReset().mockResolvedValue({ status: 'APPLIED' })
  mocks.discard.mockReset().mockResolvedValue({})
  mocks.settled.mockReset().mockImplementation(() => ({ data: null }))
  mocks.tour.mockImplementation(() => ({
    data: {
      id: 'tour-1',
      title: 'Cape Coast Castle Day Trip',
      pricingModel: 'perPerson',
      travelerPricing: [{ ageGroup: 'Adult', label: 'Adult', price: 89 }],
      minParticipants: 1,
      maxParticipants: 20,
    },
  }))
  mocks.detail = { data: booking(), isLoading: false }
})

/** The `changes` object handed to the quote hook on the latest render. */
const lastQuoteChanges = () => {
  const call = mocks.quote.mock.calls.at(-1) as unknown[] | undefined
  return call?.[2] as Record<string, unknown> | undefined
}

describe('BookingModifyPage', () => {
  it('quotes only the party diff while the traveller changes the count', async () => {
    render(<BookingModifyPage bookingId="booking-1" />)

    expect(lastQuoteChanges()).toEqual({})

    fireEvent.click(screen.getByRole('button', { name: 'More Adult' }))

    await waitFor(() => {
      expect(lastQuoteChanges()).toEqual({ travelers: { adults: 3, children: 0, infants: 0 } })
    })
  })

  it('applies the same diff on confirm and shows the success state', async () => {
    render(<BookingModifyPage bookingId="booking-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'More Adult' }))
    await waitFor(() => expect(lastQuoteChanges()).toEqual({ travelers: { adults: 3, children: 0, infants: 0 } }))

    const confirm = await screen.findByRole('button', { name: /confirm changes/i })
    await waitFor(() => expect(confirm).toBeEnabled())
    fireEvent.click(confirm)

    await waitFor(() => {
      expect(mocks.apply).toHaveBeenCalledWith({
        id: 'booking-1',
        changes: { travelers: { adults: 3, children: 0, infants: 0 } },
      })
    })
    expect(await screen.findByText(/your trip has been updated/i)).toBeInTheDocument()
  })

  it('sends only travelDate when the date changes', async () => {
    render(<BookingModifyPage bookingId="booking-1" />)

    const nextDate = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10)
    fireEvent.change(screen.getByLabelText(/new activity date/i), { target: { value: nextDate } })

    await waitFor(() => expect(lastQuoteChanges()).toEqual({ travelDate: nextDate }))
  })

  it('blocks editing when the policy disallows changes', () => {
    mocks.detail = {
      data: booking({ modify: { allowed: false, reason: 'Changes are closed for this booking.' } }),
      isLoading: false,
    }
    render(<BookingModifyPage bookingId="booking-1" />)

    expect(screen.getByText(/changes aren.t available/i)).toBeInTheDocument()
    expect(screen.getByText(/changes are closed for this booking/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm changes/i })).toBeNull()
  })

  it('shows the apply failure instead of the success state', async () => {
    mocks.apply.mockRejectedValue(new Error('This change can no longer be made'))
    render(<BookingModifyPage bookingId="booking-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'More Adult' }))
    const confirm = await screen.findByRole('button', { name: /confirm changes/i })
    await waitFor(() => expect(confirm).toBeEnabled())
    fireEvent.click(confirm)

    expect(await screen.findByText(/this change can no longer be made/i)).toBeInTheDocument()
  })
})
