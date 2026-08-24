import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DirectionsPanel from './DirectionsPanel'
import { fetchGeoapifyRoute } from '@/lib/geoapifyRouting'

vi.mock('@/lib/geoapifyRouting', async () => {
  const actual = await vi.importActual<typeof import('@/lib/geoapifyRouting')>('@/lib/geoapifyRouting')
  return {
    ...actual,
    fetchGeoapifyRoute: vi.fn(),
  }
})

const mockFetchGeoapifyRoute = vi.mocked(fetchGeoapifyRoute)

const DESTINATION = { lat: 5.5473, lng: -0.1866, label: 'Independence Arch' }

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchGeoapifyRoute.mockReset()
})

afterEach(() => {
  if (Object.prototype.hasOwnProperty.call(navigator, 'geolocation')) {
    delete (navigator as { geolocation?: unknown }).geolocation
  }
})

describe('DirectionsPanel', () => {
  it('renders nothing without a destination', () => {
    const { container } = render(<DirectionsPanel destination={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the geolocation error and keeps deep-links when no origin is available', async () => {
    mockFetchGeoapifyRoute.mockResolvedValue(null)
    render(<DirectionsPanel destination={DESTINATION} />)

    fireEvent.click(screen.getByRole('button', { name: /Get directions/i }))

    await waitFor(() => expect(screen.getByText(/Couldn't get your location/)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Google Maps/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Apple Maps/ })).toBeInTheDocument()
  })

  it('draws the route from the device location and reports it upward', async () => {
    mockFetchGeoapifyRoute.mockResolvedValue({
      geometry: [
        [-0.19, 5.6],
        [-0.1866, 5.5473],
      ],
      distanceM: 3000,
      durationSec: 360,
      steps: [{ instruction: 'Head south', distanceM: 3000, durationSec: 360, mode: 'drive' }],
    })
    const onRouteChange = vi.fn()
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((ok: (p: { coords: { latitude: number; longitude: number } }) => void) =>
          ok({ coords: { latitude: 5.6, longitude: -0.19 } }),
        ),
      },
      configurable: true,
    })

    render(<DirectionsPanel destination={DESTINATION} onRouteChange={onRouteChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Get directions/i }))

    await screen.findByText(/≈ 6 min/)
    expect(mockFetchGeoapifyRoute).toHaveBeenCalledWith(
      { lat: 5.6, lng: -0.19 },
      { lat: 5.5473, lng: -0.1866 },
      'drive',
    )
    expect(onRouteChange).toHaveBeenCalledWith(expect.objectContaining({ distanceM: 3000 }))
  })

  it('uses the fallback origin when geolocation is unavailable', async () => {
    mockFetchGeoapifyRoute.mockResolvedValue(null)
    render(
      <DirectionsPanel
        destination={DESTINATION}
        fallbackOrigin={{ lat: 5.6, lng: -0.19, label: 'Hotel XYZ' }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Get directions/i }))

    await waitFor(() => expect(screen.getByText(/From: Hotel XYZ/)).toBeInTheDocument())
    expect(mockFetchGeoapifyRoute).toHaveBeenCalledWith(
      { lat: 5.6, lng: -0.19 },
      { lat: 5.5473, lng: -0.1866 },
      'drive',
    )
  })
})
