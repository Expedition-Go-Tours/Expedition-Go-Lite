/**
 * Display regression tests for the booking detail pane's "Where to go" block.
 *
 * The bug: a booking flagged deferred ("arrange later") with no stored pickup
 * address borrowed the checkout-time `travelers.location` ("Accra, Ghana"),
 * which rendered a concrete "Pickup point" plus a false "outside the pickup
 * zone" warning. A deferred pickup with no address must read as unassigned.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  detail: { data: null as unknown, isLoading: false, isError: false },
  meeting: { meetingMode: 'pickup', pickupType: 'area', pickupAreas: [] as unknown[] },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ children, ...props }: Record<string, unknown>) => (
    <a {...(props as Record<string, unknown>)}>{children as React.ReactNode}</a>
  ),
}));

vi.mock('../../chat/ChatContext', () => ({
  useChat: () => ({ openChat: vi.fn() }),
}));

vi.mock('../../hooks/useExpeditionBookings', () => ({
  useExpeditionBookingDetail: () => mocks.detail,
  useCancelBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBookingPaymentState: () => ({ data: null, isLoading: false }),
  useStartPayLaterPayNow: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../hooks/useExpeditionTours', () => ({
  extractMeetingInfo: () => mocks.meeting,
  formatDuration: () => '6 hours',
  extractItinerary: () => [],
}));

vi.mock('../../hooks/useRecommendedTours', () => ({
  useRecommendedTours: () => ({ data: [], isLoading: false }),
}));

vi.mock('./BookingPointMap', () => ({
  default: () => <div data-testid="booking-point-map" />,
}));

vi.mock('./CancelBookingModal', () => ({
  default: () => null,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import BookingWorkspace from './BookingWorkspace'

const FUTURE = new Date(Date.now() + 10 * 86400000).toISOString()

function booking(pickup: Record<string, unknown>, travelers: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    bookingNumber: 'EXP-12345-2026-01',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentTiming: 'later',
    travelDate: FUTURE,
    selectedTime: null,
    currency: 'USD',
    grossAmount: 178,
    subtotal: 178,
    taxes: 0,
    fees: 0,
    discounts: 0,
    travelers: { adults: 2, children: 0, infants: 0, location: 'Accra, Ghana', ...travelers },
    pickup,
    tour: {
      id: 'tour-1',
      title: 'Cape Coast Castle Day Trip',
      slug: 'cape-coast-castle-day-trip',
      category: 'Cultural',
      city: 'Cape Coast',
      country: 'Ghana',
      supplier: { id: 'sup-1', name: 'Gideon Wilson', phone: '0256674138' },
    },
    modify: {
      allowed: true,
      reason: null,
      cutoffHours: 24,
      deadline: FUTURE,
      pendingPayment: null,
    },
  }
}

beforeEach(() => {
  mocks.navigate.mockReset()
  mocks.meeting = {
    meetingMode: 'pickup',
    pickupType: 'area',
    pickupAreas: [{ name: 'Osu', lat: 5.56, lng: -0.19, time: '06:30' }],
  }
})

describe('BookingWorkspace pickup display', () => {
  it('shows "not yet assigned" (and no out-of-zone warning) for an "arrange later" booking', () => {
    mocks.detail = {
      data: booking({ mode: 'area', pickupLater: true, status: 'deferred', areaName: '', address: null }),
      isLoading: false,
      isError: false,
    }
    render(<BookingWorkspace id="booking-1" />)

    expect(screen.getByText(/pickup location not yet assigned/i)).toBeInTheDocument()
    expect(screen.queryByText(/outside the pickup zone/i)).toBeNull()
    // The travellers.location fallback must not be presented as the pickup point.
    expect(screen.queryByText('Pickup point')).toBeNull()
    expect(screen.queryByText('Accra, Ghana')).toBeNull()
  })

  it('shows the stored address plus the caution for an out-of-zone deferred pick', () => {
    mocks.detail = {
      data: booking({
        mode: 'area',
        pickupLater: true,
        status: 'deferred',
        areaName: '',
        address: { name: 'New York, USA', lat: 40.7128, lng: -74.006 },
      }),
      isLoading: false,
      isError: false,
    }
    render(<BookingWorkspace id="booking-1" />)

    expect(screen.getByText('New York, USA')).toBeInTheDocument()
    expect(screen.getByText(/outside the pickup zone/i)).toBeInTheDocument()
  })

  it('shows the resolved pickup point for a saved zone pick', () => {
    mocks.detail = {
      data: booking({
        mode: 'area',
        pickupLater: false,
        status: 'confirmed',
        areaName: 'Osu',
        time: '06:30',
        address: { name: 'Kotoka Airport', lat: 5.605, lng: -0.166 },
      }),
      isLoading: false,
      isError: false,
    }
    render(<BookingWorkspace id="booking-1" />)

    expect(screen.getByText('Kotoka Airport')).toBeInTheDocument()
    expect(screen.queryByText(/outside the pickup zone/i)).toBeNull()
    expect(screen.getByRole('button', { name: /update pickup/i })).toBeInTheDocument()
  })
})
