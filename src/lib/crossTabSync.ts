/**
 * Cross-tab bridge for JSON lists mirrored in consent-gated localStorage.
 *
 * Tour cards open the detail page in a new tab, so the tab that records a
 * view/wishlist change is usually not the one the visitor returns to. Two
 * transports carry that change to the other tabs:
 *
 * - `storage` events, for the persisted case (functional consent granted);
 * - a `BroadcastChannel`, which keeps the same session in sync even before or
 *   without consent, where writes are held in per-tab memory and never touch
 *   localStorage.
 *
 * `focus` / `visibilitychange` re-reads are the backstop for anything missed
 * while a tab was suspended. Callers own the payload semantics: they parse
 * with `parseSerializedList`, compare against current state and ignore
 * no-change messages, which is what keeps echoes from looping between tabs.
 */

export interface CrossTabSyncHandle {
  /** Announce a serialized value to other tabs (no-op when unsupported). */
  post: (value: string) => void
  /** Remove every listener and close the channel. */
  unsubscribe: () => void
}

export function subscribeCrossTabSync(options: {
  storageKey: string
  channelName: string
  /** Reads the current persisted value (caller applies consent gating). */
  read: () => string | null
  /** Called with a serialized value from storage/channel, or null when cleared. */
  onRemote: (raw: string | null) => void
}): CrossTabSyncHandle {
  const { storageKey, channelName, read, onRemote } = options

  let channel: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(channelName)
      channel.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') onRemote(event.data)
      }
    } catch {
      // BroadcastChannel unavailable or rejected — storage events still cover
      // the persisted case, and focus re-reads cover the rest.
      channel = null
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) return
    onRemote(event.newValue)
  }
  const onFocus = () => onRemote(read())
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') onRemote(read())
  }

  window.addEventListener('storage', onStorage)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return {
    post(value: string) {
      try {
        channel?.postMessage(value)
      } catch {
        /* channel closed — other transports still deliver */
      }
    },
    unsubscribe() {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      try {
        channel?.close()
      } catch {
        /* ignore */
      }
      channel = null
    },
  }
}

/**
 * Parse a serialized list written by another tab. Returns an empty list for
 * null/cleared values, and null when the payload is not a JSON array —
 * callers treat null as "ignore this message", never as an empty list, so a
 * malformed write can't wipe the visitor's list.
 */
export function parseSerializedList<T>(raw: string | null): T[] | null {
  if (raw == null || raw === '') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : null
  } catch {
    return null
  }
}
