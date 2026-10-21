/**
 * Save-flow + gating tests for the customer pickup editor.
 *
 * These cover the exact payload the "Arrange pickup later" button sends
 * (`{ skipValidation: true }`) and the two eligibility guards. The server-side
 * validation of that payload is covered by the backend geoUtils /
 * expeditionValidation suites.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  mutateAsync: vi.fn(),
  detail: { data: null as unknown, isLoading: false, isError: false },
  user: { id: 'user-1', name: 'Test Customer' } as unknown,
  meeting: { meetingMode: 'pickup', pickupType: 'area', pickupAreas: [] as unknown[] },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ bookingId: 'booking-1' }),
  useNavigate: () => mocks.navigate,
}));

vi.mock('../hooks/useExpeditionBookings', () => ({
  useExpeditionBookingDetail: () => mocks.detail,
  useUpdateBookingPickup: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

vi.mock('../hooks/useExpeditionTours', () => ({
  extractMeetingInfo: () => mocks.meeting,
}));

vi.mock('../hooks/useResolvedTourPoints', () => ({
  useResolvedTourPoints: () => ({ points: [], mapTour: null, loading: false }),
}));

vi.mock('../hooks/useAuthUser', () => ({
  useAuthUser: () => mocks.user,
}));

vi.mock('../components/booking/PickupLocationSection', () => ({
  default: () => <div data-testid="pickup-location-section" />,
}));

vi.mock('../components/booking/PickupSelectModal', () => ({
  default: () => null,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: Record<string, unknown>) => (
      <button {...(props as Record<string, unknown>)}>{children as React.ReactNode}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import BookingPickupPage from './BookingPickupPage'

const FUTURE = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
const PAST = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    bookingNumber: 'EXP-12345-2026-01',
    status: 'CONFIRMED',
    travelDate: FUTURE,
    pickup: { mode: 'area', pickupLater: true, status: 'deferred', areaName: '', address: null },
    tour: { id: 'tour-1', title: 'Cape Coast Castle Day Trip' },
    ...overrides,
  }
}

beforeEach(() => {
  mocks.navigate.mockReset()
  mocks.mutateAsync.mockReset().mockResolvedValue({})
  mocks.detail = { data: booking(), isLoading: false, isError: false }
  mocks.user = { id: 'user-1', name: 'Test Customer' }
  mocks.meeting = { meetingMode: 'pickup', pickupType: 'area', pickupAreas: [] }
})

describe('BookingPickupPage', () => {
  it('saves "arrange later" as an explicit skipValidation deferral', async () => {
    render(<BookingPickupPage />)

    fireEvent.click(screen.getByRole('button', { name: /arrange pickup later/i }))

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        id: 'booking-1',
        pickup: { skipValidation: true },
      })
    })
    expect(mocks.navigate).toHaveBeenCalledWith('/booking/confirmation/booking-1')
  })

  it('surfaces a save failure instead of navigating away', async () => {
    mocks.mutateAsync.mockRejectedValue(new Error('Pickup can be updated until 24 hours before the activity'))
    render(<BookingPickupPage />)

    fireEvent.click(screen.getByRole('button', { name: /arrange pickup later/i }))

    expect(await screen.findByText(/can be updated until 24 hours/i)).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('blocks editing when the tour does not include pickup', () => {
    mocks.meeting = { meetingMode: 'meeting_point', pickupType: 'area', pickupAreas: [] }
    render(<BookingPickupPage />)

    expect(screen.getByText(/doesn.t include pickup/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /arrange pickup later/i })).toBeNull()
  })

  it('blocks editing once the activity date has passed', () => {
    mocks.detail = { data: booking({ travelDate: PAST }), isLoading: false, isError: false }
    render(<BookingPickupPage />)

    expect(screen.getByText(/can only be updated before the activity date/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /arrange pickup later/i })).toBeNull()
  })

  it('blocks editing for a cancelled booking', () => {
    mocks.detail = { data: booking({ status: 'CANCELLED' }), isLoading: false, isError: false }
    render(<BookingPickupPage />)

    expect(screen.getByText(/pickup can no longer be updated/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /arrange pickup later/i })).toBeNull()
  })
})
