import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { DeviceLocationProvider, useDeviceLocation } from '../../context/DeviceLocationContext'
import { resetPendingWrites } from '../../lib/consentGatedStorage'
import EnableLocationButton from './EnableLocationButton'

type PositionCallback = (position: GeolocationPosition) => void
type PositionErrorCallback = (error: GeolocationPositionError) => void

function successAt(lat: number, lng: number) {
  return (success: PositionCallback) =>
    success({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition)
}

function denied() {
  return (_success: PositionCallback, error: PositionErrorCallback) =>
    error({ code: 1 } as GeolocationPositionError)
}

function installGeolocation(impl?: (success: PositionCallback, error: PositionErrorCallback) => void) {
  const geolocation = impl
    ? {
        getCurrentPosition: vi.fn((success: PositionCallback, error: PositionErrorCallback) =>
          impl(success, error),
        ),
      }
    : undefined
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true })
  Object.defineProperty(navigator, 'permissions', {
    value: {
      query: vi.fn(async () => ({
        state: 'prompt' as PermissionState,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    },
    configurable: true,
  })
}

function Harness() {
  const { status } = useDeviceLocation()
  return (
    <div>
      <EnableLocationButton label="Turn on location" />
      <span data-testid="status">{status}</span>
    </div>
  )
}

beforeEach(() => {
  resetPendingWrites()
})

afterEach(() => {
  cleanup()
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'permissions', { value: undefined, configurable: true })
})

describe('EnableLocationButton', () => {
  it('shows the button first and disappears once location is on', async () => {
    installGeolocation(successAt(5.6037, -0.187))
    render(
      <DeviceLocationProvider>
        <Harness />
      </DeviceLocationProvider>,
    )

    const button = screen.getByRole('button', { name: /turn on location/i })
    fireEvent.click(button)

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('granted'))
    expect(screen.queryByRole('button', { name: /turn on location/i })).not.toBeInTheDocument()
  })

  it('offers recovery copy when the browser is blocking location', async () => {
    installGeolocation(denied())
    render(
      <DeviceLocationProvider>
        <Harness />
      </DeviceLocationProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /turn on location/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())
    expect(screen.getByText(/browser settings/i)).toBeInTheDocument()
  })

  it('explains when the device has no geolocation at all', () => {
    installGeolocation(undefined)
    render(
      <DeviceLocationProvider>
        <Harness />
      </DeviceLocationProvider>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/not supported on this device/i)).toBeInTheDocument()
  })
})
