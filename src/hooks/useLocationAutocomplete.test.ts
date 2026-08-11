import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocationAutocomplete } from './useLocationAutocomplete'
import { fetchWithAuth } from '../lib/api'

vi.mock('../lib/api', () => ({ fetchWithAuth: vi.fn() }))

const mockFetch = vi.mocked(fetchWithAuth)

const sample = {
  formatted: 'Accra, Ghana',
  latitude: 5.6037,
  longitude: -0.187,
  city: 'Accra',
  country: 'Ghana',
  region: 'Greater Accra',
  countryCode: 'gh',
  postcode: null,
  street: 'Independence Ave',
  housenumber: null,
  category: null,
  source: 'geoapify',
  confidence: 1,
}

const okJson = (results: unknown[]) =>
  ({ ok: true, json: async () => ({ status: 'success', data: { results } }) }) as Response

beforeEach(() => {
  vi.useFakeTimers()
  mockFetch.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useLocationAutocomplete', () => {
  it('debounces and fetches suggestions', async () => {
    mockFetch.mockResolvedValue(okJson([sample]))
    const { result } = renderHook(() => useLocationAutocomplete())

    act(() => result.current.search('accra'))
    expect(result.current.loading).toBe(true)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockFetch).toHaveBeenCalledWith('/locations/autocomplete?q=accra&limit=5')
    expect(result.current.loading).toBe(false)
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].formatted).toBe('Accra, Ghana')
  })

  it('clears results and cancels pending work', async () => {
    mockFetch.mockResolvedValue(okJson([sample]))
    const { result } = renderHook(() => useLocationAutocomplete())

    act(() => result.current.search('kumasi'))
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    expect(result.current.results).toHaveLength(1)

    act(() => result.current.clear())
    expect(result.current.results).toHaveLength(0)
    expect(result.current.loading).toBe(false)
  })
})
