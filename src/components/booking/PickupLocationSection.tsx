import { useMemo, useState } from 'react'
import { Check, MapPin, X, Loader2, AlertCircle } from 'lucide-react'
import type { PickupAreaShape } from '@/lib/pickupZone'
import { findPickupAreaForAddress, distanceMeters, hasLocationOnlyAreas, pickupZoneStatus, type PickupZoneStatus } from '@/lib/pickupZone'
import type { ResolveTourSource, ResolvedTourPoint } from '@/lib/resolvePoints'
import type { AddCustomPointResult } from '@/hooks/useCustomPickupPoints'
import type { PickupZoneMapTour } from './PickupZoneMap'
import LocationPicker from './LocationPicker'
import LocationMap from './LocationMap'
import MapErrorBoundary from './MapErrorBoundary'
import OutOfRangeDistance from './OutOfRangeDistance'
import TravelTimeChip from './TravelTimeChip'
import { toNumber } from '@/lib/mapUtils'

const compactTime = (t?: string): string => (t ? t.replace('-', '–') : '')

export interface PickupLocationSectionTour {
  id?: string
  slug?: string
  meetingMode?: 'meeting_point' | 'pickup' | 'none'
  meetingPoint?: string
  meetingPointAddress?: string
  meetingPointLat?: number | null
  meetingPointLng?: number | null
  meetingPointPicture?: string
  pickupType?: 'area' | 'address'
  pickupTiming?: 'at_start' | 'before_start'
  pickupFinalLocationTiming?: 'day_before' | 'after_selection'
  referenceStartTime?: string
  pickupAreas?: PickupAreaShape[]
  pickupLocations?: { name?: string; address?: string; lat?: number | null; lng?: number | null }[]
  pickupDescription?: string
}

interface PickupLocationSectionProps {
  tour: PickupLocationSectionTour
  contact: { location: string; pickupLater: boolean; pickupLat: number | null; pickupLng: number | null; pickupArea: string }
  onContactChange: (key: string, value: string | boolean | number | null) => void
  locationValid: boolean
  touched: Record<string, boolean>
  onSetTouched: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  resolvedPoints: ResolvedTourPoint[]
  mapTour: ResolveTourSource | null
  resolvingPoints: boolean
  customPoints: ResolvedTourPoint[]
  onAddCustomPoint: (lat: number, lng: number) => Promise<AddCustomPointResult>
  onRemoveCustomPoint: (id: string) => void
}

/**
 * Unified pickup location section for the booking page's Step 1.
 *
 * Renders "Choose your pickup location" with a search bar and map.
 * The map content varies by mode:
 * - Multiple specific pickup points → bus/transport icon pins
 * - Area-based pickup → geofence polygon overlay
 * - Single/no data → simplified search input
 */
export default function PickupLocationSection({
  tour,
  contact,
  onContactChange,
  locationValid,
  touched,
  onSetTouched,
  resolvedPoints,
  mapTour,
  resolvingPoints,
  customPoints,
  onAddCustomPoint,
  onRemoveCustomPoint,
}: PickupLocationSectionProps) {
  // ── Mode detection ──
  const pickupLocations = tour.pickupLocations || []
  const pickupAreas = tour.pickupAreas || []
  // Area-based pickup supersedes leftover specific pickup locations — the
  // multi-point flow only applies when there are several locations AND no areas.
  const hasMultiplePoints = pickupLocations.length > 1 && pickupAreas.length === 0
  const zonesDrawn = useMemo(
    () => pickupAreas.some((a) => Array.isArray(a.polygon) && a.polygon.length >= 3),
    [pickupAreas],
  )
  const hasPointAreas = useMemo(() => hasLocationOnlyAreas(pickupAreas), [pickupAreas])
  // Multi-point: show radio buttons when there are multiple named pickup locations
  const isMultiPoint = hasMultiplePoints

  // ── Radio selection for multi-point tours (null = no selection yet) ──
  const [pickupChoice, setPickupChoice] = useState<'now' | 'later' | null>(null)
  /** True after a green pickup-point pin is tapped — the point IS the selected
      location, so no extra blue pin should be dropped on top of it. Reset as
      soon as the traveller types/selects something in the location search bar. */
  const [hideUserPin, setHideUserPin] = useState(false)

  // ── Check if searched location is near any pickup point ──
  // The comparison runs against the RESOLVED points (the exact entries the map
  // pins are built from), not the raw tour data — a designated point whose
  // coordinates were geocoded by the resolve pipeline must still match, or it
  // would be flagged as "not one of our pickup points".
  const isNearPickupPoint = useMemo(() => {
    if (!isMultiPoint || contact.pickupLat == null || contact.pickupLng == null) return null
    // Find the closest pickup point
    let minDist = Infinity
    let closestPoint: { name: string; address: string } | null = null
    for (const loc of resolvedPoints) {
      if (loc.kind !== 'point' || loc.lat == null || loc.lng == null) continue
      const dist = distanceMeters(contact.pickupLat, contact.pickupLng, loc.lat, loc.lng)
      if (dist < minDist) {
        minDist = dist
        closestPoint = { name: loc.name || '', address: loc.address || '' }
      }
    }
    // Backend parity: the server accepts an autocomplete-sourced address
    // within 200 m of a designated pickup point (geoUtils.js
    // resolvePickupSelection). The client verdict must not be more lenient
    // than the server or the booking would pass here and fail at submit.
    return minDist <= 200 ? closestPoint : null
  }, [isMultiPoint, contact.pickupLat, contact.pickupLng, resolvedPoints])

  // ── Pickup areas with names (for zone chips / list) ──
  const pickupAreasList = useMemo(
    () => pickupAreas.filter((a): a is PickupAreaShape & { name: string } => !!a && !!a.name),
    [pickupAreas],
  )

  // ── Zone status feedback ──
  const zoneStatus: PickupZoneStatus = useMemo(
    () =>
      !contact.pickupLater
        ? pickupZoneStatus({ name: contact.location, lat: contact.pickupLat, lng: contact.pickupLng }, pickupAreas)
        : 'none',
    [contact.pickupLater, contact.location, contact.pickupLat, contact.pickupLng, pickupAreas],
  )
  const matchedArea = useMemo(
    () =>
      contact.pickupLat != null && contact.pickupLng != null && (zoneStatus === 'in_area' || zoneStatus === 'excluded')
        ? findPickupAreaForAddress({ lat: contact.pickupLat, lng: contact.pickupLng, name: contact.location }, pickupAreas)
        : null,
    [zoneStatus, contact.pickupLat, contact.pickupLng, contact.location, pickupAreas],
  )

  // ── Meeting point coordinates (for TravelTimeChip) ──
  const meetingPointCoords = useMemo(() => {
    const lat = toNumber(tour.meetingPointLat)
    const lng = toNumber(tour.meetingPointLng)
    return lat != null && lng != null ? { lat, lng } : null
  }, [tour.meetingPointLat, tour.meetingPointLng])

  // ── Geofence check ──
  const geofenced = zonesDrawn || hasPointAreas

  // ── Show map? ──
  const showZoneMap =
    zonesDrawn ||
    hasPointAreas ||
    resolvedPoints.some((p) => p.lat != null && p.lng != null) ||
    !!(tour.meetingPoint || tour.meetingPointAddress) ||
    (tour.pickupAreas?.length ?? 0) > 0 ||
    (tour.pickupLocations?.length ?? 0) > 0

  // ── Handlers ──
  const handlePickupAreaSelect = (name: string) => {
    if (contact.pickupArea === name) {
      onContactChange('pickupArea', '')
      onContactChange('pickupLat', null)
      onContactChange('pickupLng', null)
    } else {
      onContactChange('pickupArea', name)
      onContactChange('location', '')
      const area = pickupAreasList.find((a) => a.name === name)
      onContactChange('pickupLat', area && area.lat != null ? area.lat : null)
      onContactChange('pickupLng', area && area.lng != null ? area.lng : null)
    }
  }

  const handleDoubleClickPoint = async (lat: number, lng: number): Promise<void> => {
    const res = await onAddCustomPoint(lat, lng)
    if (res.status === 'added') {
      onContactChange('location', res.point.address)
      onContactChange('pickupLat', res.point.lat)
      onContactChange('pickupLng', res.point.lng)
      onContactChange('pickupArea', '')
    }
  }

  // Tapping a green pickup-point/zone pin on the map selects it directly: the
  // point's label (name first, matching what the pin shows) lands in the
  // location search bar and the coordinates are committed — without dropping
  // a separate blue pin on top of the green one (the green pin itself marks
  // the chosen spot). The match runs against the resolved points, since those
  // are what the map pins are built from. Zone pins keep the zone-selection
  // semantics (pickupArea set) so area-based validity still passes.
  const handlePinClick = (label: string): void => {
    const point = resolvedPoints.find((p) => (p.name || p.address) === label)
    if (!point || point.lat == null || point.lng == null) return
    if (point.kind === 'zone') {
      onContactChange('pickupArea', point.name || point.address || '')
    } else {
      onContactChange('pickupArea', '')
    }
    onContactChange('location', point.name || point.address || label)
    onContactChange('pickupLat', point.lat)
    onContactChange('pickupLng', point.lng)
    onSetTouched((t) => ({ ...t, location: true }))
    setHideUserPin(true)
  }

  const handleCustomRowSelect = (p: ResolvedTourPoint) => {
    onContactChange('location', p.address)
    onContactChange('pickupLat', p.lat)
    onContactChange('pickupLng', p.lng)
    onContactChange('pickupArea', '')
  }

  // ── Location error message ──
  const locationInvalidMessage = !locationValid && touched.location
    ? zoneStatus === 'excluded'
      ? `This address is inside a no-pickup zone${matchedArea?.name ? ` for \u201C${matchedArea.name}\u201D` : ''}.`
      : zoneStatus === 'outside'
        ? geofenced
          ? 'This location is outside the pickup zone.'
          : 'This address is not inside your pickup area.'
        : zoneStatus === 'no_coords' && geofenced && contact.location.trim().length >= 3
          ? 'Pick an address from the suggestions to confirm it is inside the zone.'
          : geofenced
            ? 'Enter an address inside the pickup zone.'
            : 'Please enter your pickup location'
    : undefined

  // Map pin verdict — when the traveller's searched/dragged location is NOT
  // inside the pinned pickup zones/points, the map shows a red pin with an ×
  // ("location not included") instead of the plain blue pin.
  const userOutOfRange = useMemo(() => {
    if (contact.pickupLat == null || contact.pickupLng == null) return false
    if (contact.location.trim().length < 3) return false
    if (isMultiPoint) return isNearPickupPoint === null
    return geofenced && (zoneStatus === 'outside' || zoneStatus === 'excluded')
  }, [contact.pickupLat, contact.pickupLng, contact.location, isMultiPoint, isNearPickupPoint, geofenced, zoneStatus])

  // Every designated pickup point/zone (the map's green pins) that has
  // coordinates — each one is listed on the out-of-range card with its own
  // distance & travel time. Polygon-only zones use the polygon's first vertex.
  const designatedPoints = useMemo(() => {
    const list: { lat: number; lng: number; label: string }[] = []
    for (const p of resolvedPoints) {
      if (p.kind === 'meeting') continue
      const lat = p.lat ?? (p.kind === 'zone' ? (p.polygon?.[0]?.[0] ?? null) : null)
      const lng = p.lng ?? (p.kind === 'zone' ? (p.polygon?.[0]?.[1] ?? null) : null)
      if (lat == null || lng == null) continue
      list.push({ lat, lng, label: p.name || p.address || 'pickup location' })
    }
    return list
  }, [resolvedPoints])

  // ── Render ──
  return (
    <div className="space-y-5">
      {/* Heading — multi-point tours ask a question, others use a direct label */}
      {isMultiPoint ? (
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          Do you know where you want to be picked up?
        </h3>
      ) : (
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          Choose your pickup location
        </h3>
      )}

      {/* Multi-point: Radio selection with inline content */}
      {isMultiPoint && (
        <div className="space-y-3">
          {/* "Yes" option with search + map below it */}
          <div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300">
              <input
                type="radio"
                name="pickup-choice"
                checked={pickupChoice === 'now'}
                onChange={() => {
                  setPickupChoice('now')
                  onContactChange('pickupLater', false)
                }}
                className="pickup-radio shrink-0"
              />
              <span className="text-sm font-medium text-slate-800">Yes, I can add it now</span>
            </label>
            {/* Search + map appears right under "Yes" when selected */}
            {pickupChoice === 'now' && (
              <div className="mt-4 space-y-4">
                {/* Search bar */}
                <LocationPicker
                  value={contact.location}
                  onChange={(v) => {
                    onContactChange('location', v)
                    setHideUserPin(false)
                  }}
                  onCoordsChange={(lat, lng) => {
                    onContactChange('pickupLat', lat)
                    onContactChange('pickupLng', lng)
                    if (lat != null && lng != null) {
                      onContactChange('pickupArea', '')
                      onSetTouched((t) => ({ ...t, location: true }))
                    }
                  }}
                  onBlur={() => onSetTouched((t) => ({ ...t, location: true }))}
                  placeholder="Search for hotel, address, etc."
                  valid={hideUserPin}
                  error={locationInvalidMessage}
                  confirmed={hideUserPin}
                  minimal
                />

                {/* Out-of-range: distance & travel time to every pickup point */}
                {userOutOfRange && contact.pickupLat != null && contact.pickupLng != null && (
                  <OutOfRangeDistance
                    from={{ lat: contact.pickupLat, lng: contact.pickupLng }}
                    points={designatedPoints}
                    message={`${contact.location} is not one of our pickup points — available pickup points:`}
                  />
                )}

                {/* Map */}
                {showZoneMap && (
                  <div className="space-y-1">
                    {resolvingPoints && (
                      <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-slate-400">
                        <Loader2 className="size-3 animate-spin" />
                        Locating pickup points…
                      </p>
                    )}
                    <MapErrorBoundary resetKey={mapTour || tour}>
                      <LocationMap
                        tour={(mapTour || tour) as PickupZoneMapTour}
                        userMarker={hideUserPin ? null : { lat: contact.pickupLat, lng: contact.pickupLng }}
                        userOutOfRange={userOutOfRange}
                        userChosen={contact.pickupLat != null && contact.pickupLng != null}
                        onPinClick={handlePinClick}
                        onUserPointChange={(lat, lng) => {
                          onContactChange('pickupLat', lat)
                          onContactChange('pickupLng', lng)
                          onContactChange('pickupArea', '')
                          onSetTouched((t) => ({ ...t, location: true }))
                        }}
                        onUserAddressChange={(address) => {
                          onContactChange('location', address)
                        }}
                        onDoubleClickPoint={(lat, lng) => {
                          void handleDoubleClickPoint(lat, lng)
                        }}
                      />
                    </MapErrorBoundary>
                    <TravelTimeChip
                      from={
                        contact.pickupLat != null && contact.pickupLng != null
                          ? { lat: contact.pickupLat, lng: contact.pickupLng }
                          : null
                      }
                      to={meetingPointCoords}
                      destinationLabel="the meeting point"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* "I don't know yet" option with message below it */}
          <div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300">
              <input
                type="radio"
                name="pickup-choice"
                checked={pickupChoice === 'later'}
                onChange={() => {
                  setPickupChoice('later')
                  onContactChange('pickupLater', true)
                  onContactChange('location', '')
                  onContactChange('pickupArea', '')
                  onContactChange('pickupLat', null)
                  onContactChange('pickupLng', null)
                }}
                className="pickup-radio shrink-0"
              />
              <span className="text-sm font-medium text-slate-800">I don't know yet</span>
            </label>
            {/* Message appears right under "I don't know yet" when selected */}
            {pickupChoice === 'later' && (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-sm font-medium text-sky-800">
                  Add your pickup location 24 hours before your activity (ideally sooner) so your activity provider can accommodate you
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Traveller-added spots — not shown for multi-point tours */}
      {!isMultiPoint && !contact.pickupLater && customPoints.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-violet-500">
            <MapPin className="size-3" /> Added on map
            <span className="font-semibold text-slate-300">({customPoints.length})</span>
          </p>
          <ul className="mt-1.5 space-y-2">
            {customPoints.map((p) => {
              const selected = contact.pickupArea === '' && contact.location === p.address && contact.pickupLat === p.lat
              return (
                <li key={p.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    onClick={() => handleCustomRowSelect(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleCustomRowSelect(p)
                      }
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-400/40'
                        : 'border-slate-200 bg-white hover:border-violet-300'
                    }`}
                  >
                    <MapPin className={`mt-0.5 size-4 shrink-0 ${selected ? 'text-violet-600' : 'text-violet-400'}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold ${selected ? 'text-violet-700' : 'text-slate-800'}`}>
                        {p.address || 'Added point'}
                      </span>
                      {p.lat != null && p.lng != null && (
                        <span className="block font-mono text-[10px] text-slate-400">
                          {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveCustomPoint(p.id)
                      }}
                      aria-label={`Remove ${p.address || 'added point'}`}
                      className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-violet-100 hover:text-violet-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Pickup location search + map — only for non-multi-point tours (area-based) */}
      {!isMultiPoint && !contact.pickupLater ? (
        <div className="space-y-4">
          {/* Search bar */}
          <LocationPicker
            value={contact.location}
            onChange={(v) => onContactChange('location', v)}
            onCoordsChange={(lat, lng) => {
              onContactChange('pickupLat', lat)
              onContactChange('pickupLng', lng)
              if (lat != null && lng != null) {
                onContactChange('pickupArea', '')
                onSetTouched((t) => ({ ...t, location: true }))
              }
            }}
            onBlur={() => onSetTouched((t) => ({ ...t, location: true }))}
            placeholder="Search for hotel, address, etc."
            valid={locationValid}
            error={locationInvalidMessage}
            minimal
          />

          {/* Live zone verdict */}
          {!contact.pickupArea && zoneStatus === 'in_area' && matchedArea && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3.5 py-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-[#179237]" />
              <div className="text-sm text-emerald-900">
                <p className="font-semibold">
                  Great, your location is within the <span className="underline underline-offset-2">{matchedArea.name}</span> pickup zone.
                </p>
                {matchedArea.time && (
                  <p className="mt-0.5 text-xs text-emerald-700">
                    Pickup {compactTime(matchedArea.time)} min before the activity starts
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Out-of-range: distance & travel time to every pickup zone */}
          {!contact.pickupArea && zoneStatus === 'outside' && geofenced && contact.pickupLat != null && contact.pickupLng != null && (
            <OutOfRangeDistance
              from={{ lat: contact.pickupLat, lng: contact.pickupLng }}
              points={designatedPoints}
              message="This address isn't inside any of the pickup zones — available pickup zones:"
            />
          )}
          {!contact.pickupArea && zoneStatus === 'excluded' && matchedArea && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/70 bg-rose-50/60 px-3.5 py-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" />
              <p className="text-sm text-rose-700">
                This address falls inside a no-pickup zone{matchedArea.name ? ` for \u201C${matchedArea.name}\u201D` : ''} — choose a different address or zone.
              </p>
            </div>
          )}

          {/* Zone selected confirmation */}
          {!contact.pickupLater && contact.pickupArea && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3.5 py-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#179237]" />
              <div className="min-w-0 flex-1 text-sm text-emerald-900">
                <p className="font-semibold">
                  Pickup zone: <span className="underline underline-offset-2">{contact.pickupArea}</span>
                </p>
                <p className="mt-0.5 text-xs text-emerald-700">
                  The exact pickup point and time are confirmed with you directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePickupAreaSelect(contact.pickupArea)}
                className="shrink-0 rounded p-1 text-emerald-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                aria-label={`Remove pickup zone ${contact.pickupArea}`}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Multi-point: Red pin message when searched location is not near any pickup point */}
          {isMultiPoint && !contact.pickupArea && contact.pickupLat != null && contact.pickupLng != null && isNearPickupPoint === null && contact.location.trim().length >= 3 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/70 bg-rose-50/60 px-3.5 py-2.5">
              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-500">
                <AlertCircle className="size-3 text-white" />
              </div>
              <p className="text-sm text-rose-700">
                <span className="font-semibold">{contact.location}</span> is not one of our pickup points. Choose from the available pickup points or adjust your search.
              </p>
            </div>
          )}

          {/* Multi-point: Confirmation when searched location is near a pickup point */}
          {isMultiPoint && !contact.pickupArea && isNearPickupPoint && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3.5 py-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-[#179237]" />
              <p className="text-sm text-emerald-900">
                Great, your location is near the <span className="font-semibold underline underline-offset-2">{isNearPickupPoint.name || isNearPickupPoint.address}</span> pickup point.
              </p>
            </div>
          )}

          {/* Map */}
          {showZoneMap && (
            <div className="space-y-1">
              {resolvingPoints && (
                <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-slate-400">
                  <Loader2 className="size-3 animate-spin" />
                  Locating pickup points…
                </p>
              )}
              <MapErrorBoundary resetKey={mapTour || tour}>
                <LocationMap
                  tour={(mapTour || tour) as PickupZoneMapTour}
                  userMarker={{ lat: contact.pickupLat, lng: contact.pickupLng }}
                  userOutOfRange={userOutOfRange}
                  userChosen={contact.pickupLat != null && contact.pickupLng != null}
                  onPinClick={handlePinClick}
                  onUserPointChange={(lat, lng) => {
                    onContactChange('pickupLat', lat)
                    onContactChange('pickupLng', lng)
                    onContactChange('pickupArea', '')
                    onSetTouched((t) => ({ ...t, location: true }))
                  }}
                  onUserAddressChange={(address) => {
                    onContactChange('location', address)
                  }}
                  onDoubleClickPoint={(lat, lng) => {
                    void handleDoubleClickPoint(lat, lng)
                  }}
                />
              </MapErrorBoundary>
              <TravelTimeChip
                from={
                  contact.pickupLat != null && contact.pickupLng != null
                    ? { lat: contact.pickupLat, lng: contact.pickupLng }
                    : null
                }
                to={meetingPointCoords}
                destinationLabel="the meeting point"
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
