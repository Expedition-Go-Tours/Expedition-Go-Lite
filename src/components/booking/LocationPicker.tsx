import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, MapPin, Loader2, AlertTriangle, RefreshCw, Check, X } from 'lucide-react'
import { useLocationAutocomplete, type LocationSuggestion } from '../../hooks/useLocationAutocomplete'

interface LocationPickerProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  valid?: boolean
  error?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * Location picker for the booking form: debounced autocomplete against the
 * backend location service. Emits the human-readable formatted label only —
 * coordinates stay client-side (numeric coords must never enter the
 * travelers payload).
 */
export default function LocationPicker({
  value,
  onChange,
  onBlur,
  valid,
  error,
  placeholder = 'e.g. Accra, Ghana',
  disabled,
}: LocationPickerProps) {
  const { search, retry, clear, results, loading, error: searchError } = useLocationAutocomplete()

  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [selected, setSelected] = useState<LocationSuggestion | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Keep the local input value in sync when the parent restores it (e.g.
  // draft reload). React-recommended "adjust state during render" pattern,
  // guarded so it only runs on the value transition.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setQuery(value)
  }

  // Close dropdown on outside click.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const commit = useCallback((suggestion: LocationSuggestion) => {
    setSelected(suggestion)
    setQuery(suggestion.formatted)
    setOpen(false)
    setHighlightedIndex(-1)
    onChangeRef.current(suggestion.formatted)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    onChangeRef.current(v)
    setHighlightedIndex(-1)
    if (v.trim().length >= 2) {
      search(v)
      setOpen(true)
    } else {
      clear()
      setOpen(false)
    }
  }

  const handleSelect = (result: { formatted: string; latitude: number | null; longitude: number | null; city: string; country: string; region: string }) => {
    commit({
      formatted: result.formatted,
      latitude: result.latitude ?? null,
      longitude: result.longitude ?? null,
      city: result.city || '',
      country: result.country || '',
      region: result.region || '',
    })
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    onChangeRef.current('')
    clear()
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) handleSelect(results[highlightedIndex])
        break
      case 'Escape':
        setOpen(false)
        setHighlightedIndex(-1)
        break
      default:
        break
    }
  }

  // Keep the highlighted option visible.
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  const inputClass = `w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
    error
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : valid
        ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
        : 'border-slate-200 focus:border-[#179237] focus:ring-[#179237]/15'
  } ${disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`

  const sub = (s: LocationSuggestion) => [s.city, s.region, s.country].filter(Boolean).join(', ')

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          disabled={disabled}
          placeholder={placeholder}
          className={`${inputClass} pl-10 pr-9`}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={open ? 'location-listbox' : undefined}
          aria-activedescendant={highlightedIndex >= 0 ? `location-option-${highlightedIndex}` : undefined}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-[#179237]" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear location"
          >
            <X size={14} />
          </button>
        ) : valid ? (
          <Check className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />
        ) : null}
      </div>

      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}

      {/* Suggestions dropdown */}
      {open && (
        <div className="relative z-20">
          <ul
            id="location-listbox"
            ref={listRef}
            role="listbox"
            className="absolute z-30 mt-1 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/60"
            style={{ maxHeight: 240 }}
          >
            {loading && (
              <li className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin text-[#179237]" />
                Searching locations…
              </li>
            )}
            {!loading && searchError && (
              <li className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-rose-600">Could not load location suggestions.</p>
                    <p className="mt-0.5 text-xs text-slate-400">You can still type a location manually.</p>
                  </div>
                  <button
                    type="button"
                    onClick={retry}
                    className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                </div>
              </li>
            )}
            {!loading && !searchError && results.length === 0 && query.trim().length >= 2 && (
              <li className="px-4 py-3 text-sm text-slate-500">
                No locations found.
                <p className="mt-0.5 text-xs text-slate-400">Try a different search or type it manually.</p>
              </li>
            )}
            {!loading &&
              results.map((r, index) => (
                <li
                  key={`${r.source}-${index}`}
                  id={`location-option-${index}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  onClick={() => handleSelect(r)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`cursor-pointer px-4 py-2.5 text-sm ${
                    index === highlightedIndex ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.formatted}</div>
                      {sub({ city: r.city, region: r.region, country: r.country, formatted: r.formatted, latitude: r.latitude, longitude: r.longitude }) && (
                        <div className="truncate text-xs text-slate-400">
                          {sub({ city: r.city, region: r.region, country: r.country, formatted: r.formatted, latitude: r.latitude, longitude: r.longitude })}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Selected location summary */}
      {query && !open && !error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3 py-2.5">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[#179237]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-emerald-900">{query}</p>
            {selected?.latitude != null && selected?.longitude != null && (
              <p className="mt-0.5 font-mono text-[10px] text-emerald-700/70">
                {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded p-1 text-emerald-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
            aria-label="Clear location"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <p className="text-[10px] text-slate-400">
        Location data ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          OpenStreetMap
        </a>{' '}
        contributors
      </p>
    </div>
  )
}
