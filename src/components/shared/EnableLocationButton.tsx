import { Loader2, MapPin, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDeviceLocation } from '../../context/DeviceLocationContext'

interface EnableLocationButtonProps {
  /** Button copy for the initial state, e.g. "Turn on location to get directions". */
  label: string
  /** Optional helper line shown next to the button. */
  hint?: string
  className?: string
}

/**
 * The app's single "turn on location" control. Renders a button that calls
 * `enable()` on click — the only path that can raise the browser permission
 * prompt — a spinner while the request is in flight, and recovery copy when
 * the browser is blocking location. Renders nothing once location is on, so
 * callers can show their location-dependent content in its place.
 */
export default function EnableLocationButton({
  label,
  hint,
  className = '',
}: EnableLocationButtonProps) {
  const { t } = useTranslation()
  const { status, enable } = useDeviceLocation()

  if (status === 'granted') return null

  if (status === 'requesting') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 ${className}`}>
        <Loader2 size={12} className="animate-spin" />
        {t('location.detecting')}
      </span>
    )
  }

  if (status === 'unsupported') {
    return (
      <span className={`text-xs font-medium text-slate-400 ${className}`}>
        {t('location.unsupported')}
      </span>
    )
  }

  const denied = status === 'denied'

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      <button
        type="button"
        onClick={() => {
          void enable()
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
      >
        {denied ? <RotateCw size={12} /> : <MapPin size={12} />}
        {denied ? t('location.retry') : label}
      </button>
      {denied ? (
        <span className="text-xs text-slate-500">{t('location.deniedHelp')}</span>
      ) : hint ? (
        <span className="text-xs text-slate-500">{hint}</span>
      ) : null}
    </span>
  )
}
