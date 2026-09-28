import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { resetPendingWrites } from '../../lib/consentGatedStorage'
import EnableLocationButton from './EnableLocationButton'

type PositionCallback = (position: GeolocationPosition) => void
type PositionErrorCallback = (error: GeolocationPositionError) => void

function successAt(lat: number, lng: number) {
  return (success: PositionCallback) =>
    success({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition)
}

/** A real `GeolocationPositionError` carries the numeric constants on itself;
    the location module compares `err.code` against them to tell a blocked
    permission from a transient failure, so the stub has to supply them too —
    a bare `{ code: 1 }` reads as `code === undefined` and degrades to
    'unavailable'. */
function denied() {
  return (_success: PositionCallback, error: PositionErrorCallback) =>
    error({
      code: 1,
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
      message: 'User denied Geolocation',
    } as GeolocationPositionError)
}

/**
 * `permissionState` is what `navigator.permissions` reports. It matters: the
 * hook re-reads the Permissions API whenever the preference changes, and a real
 * browser flips `prompt` to `granted`/`denied` once the traveller answers the
 * prompt. Pinning it to `prompt` would let that re-read clobber the status the
 * position call just produced.
 */
function installGeolocation(
  impl?: (success: PositionCallback, error: PositionErrorCallback) => void,
  permissionState: PermissionState = 'prompt',
) {
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
        state: permissionState,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    },
    configurable: true,
  })
}

/**
 * The button is the only thing under test, and it holds its own
 * `useLocationSharing()` instance. That hook is a per-component view of the
 * shared preference — two instances do not mirror each other's live `status`,
 * they only agree on what has been persisted. So these tests assert what a
 * traveller can actually see on the control itself rather than peeking at
 * another instance's state.
 */
function Harness() {
  return <EnableLocationButton label="Turn on location" />
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
    installGeolocation(successAt(5.6037, -0.187), 'granted')
    render(<Harness />)

    const button = screen.getByRole('button', { name: /turn on location/i })
    fireEvent.click(button)

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /turn on location/i })).not.toBeInTheDocument(),
    )
  })

  it('offers recovery copy when the browser is blocking location', async () => {
    installGeolocation(denied(), 'denied')
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: /turn on location/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument())
    expect(screen.getByText(/browser settings/i)).toBeInTheDocument()
  })

  it('explains when the device has no geolocation at all', () => {
    installGeolocation(undefined)
    render(<Harness />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/not supported on this device/i)).toBeInTheDocument()
  })
})
