import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { parseSerializedList, subscribeCrossTabSync } from '../crossTabSync'
import { FakeBroadcastChannel } from '../../test/fakeBroadcastChannel'

/**
 * The cross-tab bridge underpins the continue-planning and wishlist fixes:
 * updates made in the tab that opened a tour must reach the tab the visitor
 * returns to. These tests pin each transport (storage events, the channel,
 * focus/visibility re-reads) and the cleanup contract.
 */

const KEY = 'test_key'
const CHANNEL = 'test-channel'

let onRemote: Mock<(raw: string | null) => void>

beforeEach(() => {
  FakeBroadcastChannel.reset()
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
  onRemote = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function subscribe(overrides: Partial<Parameters<typeof subscribeCrossTabSync>[0]> = {}) {
  return subscribeCrossTabSync({
    storageKey: KEY,
    channelName: CHANNEL,
    read: () => localStorage.getItem(KEY),
    onRemote,
    ...overrides,
  })
}

describe('subscribeCrossTabSync', () => {
  it('forwards only storage events for its own key', () => {
    const sync = subscribe()

    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: '["a"]' }))
    expect(onRemote).toHaveBeenLastCalledWith('["a"]')

    window.dispatchEvent(new StorageEvent('storage', { key: 'other_key', newValue: '["b"]' }))
    expect(onRemote).toHaveBeenCalledTimes(1)

    sync.unsubscribe()
  })

  it('forwards the cleared value (null) when the key is removed', () => {
    const sync = subscribe()

    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }))
    expect(onRemote).toHaveBeenLastCalledWith(null)

    sync.unsubscribe()
  })

  it('re-reads the current value on focus and when the tab becomes visible', () => {
    const read = vi.fn(() => '["focus"]')
    const sync = subscribe({ read })

    window.dispatchEvent(new Event('focus'))
    expect(onRemote).toHaveBeenLastCalledWith('["focus"]')

    document.dispatchEvent(new Event('visibilitychange'))
    expect(read).toHaveBeenCalledTimes(2)
    expect(onRemote).toHaveBeenCalledTimes(2)

    sync.unsubscribe()
  })

  it('posts to other channels of the same name', () => {
    const otherRemote = vi.fn()
    const other = subscribeCrossTabSync({
      storageKey: 'other_key',
      channelName: CHANNEL,
      read: () => null,
      onRemote: otherRemote,
    })
    const sync = subscribe()

    sync.post('["hello"]')
    expect(otherRemote).toHaveBeenCalledWith('["hello"]')

    // A channel never receives its own message.
    expect(onRemote).not.toHaveBeenCalled()

    sync.unsubscribe()
    other.unsubscribe()
  })

  it('stops listening and closes its channel after unsubscribe', () => {
    const sync = subscribe()
    const channel = FakeBroadcastChannel.last()!

    sync.unsubscribe()

    expect(channel.closed).toBe(true)
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: '[]' }))
    expect(onRemote).not.toHaveBeenCalled()
  })
})

describe('parseSerializedList', () => {
  it('returns an empty list for null and empty payloads', () => {
    expect(parseSerializedList(null)).toEqual([])
    expect(parseSerializedList('')).toEqual([])
  })

  it('returns the parsed array', () => {
    expect(parseSerializedList<{ id: string }>('[{"id":"a"}]')).toEqual([{ id: 'a' }])
  })

  it('returns null for malformed or non-array payloads', () => {
    expect(parseSerializedList('not json')).toBeNull()
    expect(parseSerializedList('{"id":"a"}')).toBeNull()
    expect(parseSerializedList('"a"')).toBeNull()
  })
})
