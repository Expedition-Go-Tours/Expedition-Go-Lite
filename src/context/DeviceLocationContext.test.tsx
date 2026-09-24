import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DeviceLocationProvider, useDeviceLocation } from './DeviceLocationContext'
import { resetPendingWrites } from '../lib/consentGatedStorage'

type PositionCallback = (position: GeolocationPosition) => void
type PositionErrorCallback = (error: GeolocationPositionError) => void

const wrapper = ({ children }: { children: ReactNode }) => (
  <DeviceLocationProvider>{children}</DeviceLocationProvider>
)

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
  return geolocation
}

const getCurrentPositionMock = () =>
  navigator.geolocation.getCurrentPosition as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  resetPendingWrites()
})

afterEach(() => {
  cleanup()
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'permissions', { value: undefined, configurable: true })
})

describe('DeviceLocationContext', () => {
  it('never asks the browser for location on mount', () => {
    installGeolocation(successAt(5.6037, -0.187))
    const { result } = renderHook(() => useDeviceLocation(), { wrapper })

    expect(getCurrentPositionMock()).not.toHaveBeenCalled()
    expect(result.current.status).toBe('unset')
    expect(result.current.coords).toBeNull()
  })

  it('only prompts when enable() is called, then reports granted', async () => {
    installGeolocation(successAt(5.6037, -0.187))
    const { result } = renderHook(() => useDeviceLocation(), { wrapper })

    let ok = false
    await act(async () => {
      ok = await result.current.enable()
    })

    expect(ok).toBe(true)
    expect(getCurrentPositionMock()).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('granted')
    expect(result.current.coords).toEqual({ lat: 5.6037, lng: -0.187 })
    expect(result.current.enabled).toBe(true)
  })

  it('reports a blocked permission without leaving the UI stuck', async () => {
    installGeolocation(denied())
    const { result } = renderHook(() => useDeviceLocation(), { wrapper })

    let ok = true
    await act(async () => {
      ok = await result.current.enable()
    })

    expect(ok).toBe(false)
    expect(result.current.status).toBe('denied')
    expect(result.current.coords).toBeNull()
  })

  it('handles devices without geolocation', async () => {
    installGeolocation(undefined)
    const { result } = renderHook(() => useDeviceLocation(), { wrapper })

    expect(result.current.status).toBe('unsupported')

    let ok = true
    await act(async () => {
      ok = await result.current.enable()
    })
    expect(ok).toBe(false)
    expect(result.current.status).toBe('unsupported')
  })

  it('remembers the choice across a remount without asking again', async () => {
    installGeolocation(successAt(5.6037, -0.187))
    const first = renderHook(() => useDeviceLocation(), { wrapper })

    await act(async () => {
      await first.result.current.enable()
    })
    expect(getCurrentPositionMock()).toHaveBeenCalledTimes(1)
    first.unmount()

    const second = renderHook(() => useDeviceLocation(), { wrapper })
    expect(second.result.current.status).toBe('granted')
    expect(second.result.current.coords).toEqual({ lat: 5.6037, lng: -0.187 })
    expect(getCurrentPositionMock()).toHaveBeenCalledTimes(1)
  })

  it('forgets the coordinates when turned off', async () => {
    installGeolocation(successAt(5.6037, -0.187))
    const { result } = renderHook(() => useDeviceLocation(), { wrapper })

    await act(async () => {
      await result.current.enable()
    })
    act(() => {
      result.current.disable()
    })

    expect(result.current.status).toBe('unset')
    expect(result.current.coords).toBeNull()
    expect(result.current.enabled).toBe(false)
  })
})
