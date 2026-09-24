import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  clearStoredLocation,
  getStoredLocation,
  requestDeviceLocation,
  type DeviceLocationResult,
} from '../lib/analytics'
import { readGated, removeGated, writeGated } from '../lib/consentGatedStorage'
import { hasConsent, subscribeConsent } from '../lib/cookieConsent'

/**
 * Device location is opt-in: nothing here calls the browser location API on
 * its own. The only path that can raise the permission prompt is `enable()`,
 * and callers must invoke it from a user gesture (a click). Personalisation
 * that only needs an approximate location keeps using the remembered/IP city
 * (`getCachedLocation()` in lib/analytics) and never prompts.
 */

/** Consent-gated preference recording the visitor's explicit "turn on" choice. */
const DEVICE_LOCATION_PREF_KEY = 'expedition_go_device_location'

export type DeviceLocationStatus =
  /** The visitor has not turned location on (the default). */
  | 'unset'
  /** A request is in flight (only ever after an explicit click). */
  | 'requesting'
  /** Location is on and coordinates are available. */
  | 'granted'
  /** The browser is blocking location for this site. */
  | 'denied'
  /** The device/browser has no geolocation at all. */
  | 'unsupported'

export interface DeviceLocationValue {
  status: DeviceLocationStatus
  /** Coordinates — only non-null while status is 'granted'. */
  coords: { lat: number; lng: number } | null
  /** True while the visitor's explicit "turn on" choice is stored. */
  enabled: boolean
  /**
   * Ask the browser for the device location. Only call from a user gesture:
   * this is the single place in the app that can raise the permission prompt.
   * Resolves to true when coordinates were obtained.
   */
  enable: () => Promise<boolean>
  /** Turn location off, forget the coordinates and stop using them. */
  disable: () => void
}

const DeviceLocationContext = createContext<DeviceLocationValue | null>(null)

function geolocationSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.geolocation &&
    typeof navigator.geolocation.getCurrentPosition === 'function'
  )
}

function storedCoords(): { lat: number; lng: number } | null {
  const stored = getStoredLocation()
  return stored ? { lat: stored.lat, lng: stored.lng } : null
}

/** Query the browser's current permission without ever prompting. */
function queryPermission(): Promise<PermissionStatus | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return Promise.resolve(null)
  }
  return navigator.permissions
    .query({ name: 'geolocation' })
    .catch(() => null)
}

export function DeviceLocationProvider({ children }: { children: ReactNode }) {
  const [supported] = useState(geolocationSupported)

  // Restore an explicit choice that survived a reload. This happens in the
  // initial state (never in an effect) so no prompt can be involved and no
  // cascading render is needed.
  const [enabled, setEnabled] = useState(
    () => geolocationSupported() && readGated(DEVICE_LOCATION_PREF_KEY) === '1',
  )
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() =>
    geolocationSupported() && readGated(DEVICE_LOCATION_PREF_KEY) === '1'
      ? storedCoords()
      : null,
  )
  const [status, setStatus] = useState<DeviceLocationStatus>(() => {
    if (!geolocationSupported()) return 'unsupported'
    if (readGated(DEVICE_LOCATION_PREF_KEY) !== '1') return 'unset'
    return storedCoords() ? 'granted' : 'unset'
  })
  const enabledRef = useRef(enabled)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  /** Resolve coordinates when the browser has already granted permission. */
  const resolveSilently = useCallback(async () => {
    const result: DeviceLocationResult = await requestDeviceLocation()
    if (!aliveRef.current || !result.ok) return
    setCoords({ lat: result.location.lat, lng: result.location.lng })
    setStatus('granted')
  }, [])

  // An explicit choice with no remembered coordinates: continue silently only
  // when the browser already holds a granted permission (querying never
  // prompts). A blocked permission is reflected so the UI can explain it.
  useEffect(() => {
    if (!supported || !enabledRef.current) return
    if (storedCoords()) return

    let cancelled = false
    void queryPermission().then((permission) => {
      if (cancelled || !aliveRef.current || !permission) return
      if (permission.state === 'granted') void resolveSilently()
      else if (permission.state === 'denied') setStatus('denied')
    })
    return () => {
      cancelled = true
    }
  }, [supported, resolveSilently])

  // Stay in step with permission changes made in browser settings: a revoked
  // permission locks the UI again, a newly granted one resumes silently.
  useEffect(() => {
    if (!supported) return

    let permission: PermissionStatus | null = null
    let cancelled = false

    const onChange = () => {
      if (cancelled || !permission) return
      if (permission.state === 'denied') {
        setStatus((prev) => (prev === 'granted' || prev === 'requesting' ? 'denied' : prev))
        return
      }
      if (permission.state === 'granted' && enabledRef.current) {
        void resolveSilently()
      }
    }

    void queryPermission().then((result) => {
      if (cancelled || !result) return
      permission = result
      result.addEventListener('change', onChange)
    })

    return () => {
      cancelled = true
      permission?.removeEventListener('change', onChange)
    }
  }, [supported, resolveSilently])

  // If functional consent is withdrawn, stop using location in this session
  // too — the stored preference/coordinates are purged by the consent layer.
  useEffect(() => {
    return subscribeConsent(() => {
      if (hasConsent('functional')) return
      enabledRef.current = false
      setEnabled(false)
      setCoords(null)
      setStatus(geolocationSupported() ? 'unset' : 'unsupported')
    })
  }, [])

  const enable = useCallback(async (): Promise<boolean> => {
    if (!geolocationSupported()) {
      setStatus('unsupported')
      return false
    }

    setStatus('requesting')
    const result = await requestDeviceLocation()
    if (!aliveRef.current) return result.ok

    if (!result.ok) {
      setStatus(result.reason === 'denied' ? 'denied' : 'unset')
      return false
    }

    writeGated(DEVICE_LOCATION_PREF_KEY, '1')
    enabledRef.current = true
    setEnabled(true)
    setCoords({ lat: result.location.lat, lng: result.location.lng })
    setStatus('granted')
    return true
  }, [])

  const disable = useCallback(() => {
    removeGated(DEVICE_LOCATION_PREF_KEY)
    clearStoredLocation()
    enabledRef.current = false
    setEnabled(false)
    setCoords(null)
    setStatus(geolocationSupported() ? 'unset' : 'unsupported')
  }, [])

  const value = useMemo<DeviceLocationValue>(
    () => ({ status, coords, enabled, enable, disable }),
    [status, coords, enabled, enable, disable],
  )

  return (
    <DeviceLocationContext.Provider value={value}>{children}</DeviceLocationContext.Provider>
  )
}

export function useDeviceLocation(): DeviceLocationValue {
  const ctx = useContext(DeviceLocationContext)
  if (!ctx) throw new Error('useDeviceLocation must be used within a DeviceLocationProvider')
  return ctx
}
