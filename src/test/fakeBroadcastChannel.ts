/**
 * Minimal BroadcastChannel stand-in for tests.
 *
 * jsdom has no BroadcastChannel, and even where a Node implementation leaks
 * through, tests need deterministic message routing. Instances register
 * themselves by name; `postMessage` records the payload and synchronously
 * delivers it to every *other* open channel of the same name (matching the
 * real API's no-self-delivery rule), and `emit` lets a test simulate a message
 * from a tab that isn't rendered in the test.
 */
export class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = []

  readonly name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  readonly posted: string[] = []
  closed = false

  constructor(name: string) {
    this.name = name
    FakeBroadcastChannel.instances.push(this)
  }

  postMessage(value: string): void {
    this.posted.push(value)
    for (const other of FakeBroadcastChannel.instances) {
      if (other !== this && other.name === this.name && !other.closed) {
        other.emit(value)
      }
    }
  }

  close(): void {
    this.closed = true
  }

  /** Deliver a message to this channel's handler, as another tab would. */
  emit(value: string): void {
    this.onmessage?.({ data: value } as MessageEvent)
  }

  /** The most recently created channel, or undefined when none exists. */
  static last(): FakeBroadcastChannel | undefined {
    return FakeBroadcastChannel.instances[FakeBroadcastChannel.instances.length - 1]
  }

  static reset(): void {
    FakeBroadcastChannel.instances = []
  }
}
