import { fetchWithAuth } from './api'

export interface ReverseGeocodeResult {
  formatted: string
  latitude: number | null
  longitude: number | null
  city: string
  country: string
  region: string
}

/**
 * Reverse-geocodes a [lat, lng] pair through the backend location service
 * (GET /api/locations/reverse — geoapify → nominatim → photon fallback),
 * mirroring the supplier platform's LocationMapPicker.
 *
 * Returns the first normalized result, or null when the lookup fails or
 * returns nothing. Callers fall back to a bare coordinate string.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const res = await fetchWithAuth(
      `/locations/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    )
    if (!res.ok) return null
    const body = await res.json().catch(() => null)
    const first = body?.data?.results?.[0]
    if (!first) return null
    return {
      formatted: typeof first.formatted === 'string' ? first.formatted : '',
      latitude: typeof first.latitude === 'number' ? first.latitude : null,
      longitude: typeof first.longitude === 'number' ? first.longitude : null,
      city: typeof first.city === 'string' ? first.city : '',
      country: typeof first.country === 'string' ? first.country : '',
      region: typeof first.region === 'string' ? first.region : '',
    }
  } catch {
    return null
  }
}