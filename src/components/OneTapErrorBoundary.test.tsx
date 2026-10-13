import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OneTapErrorBoundary from './OneTapErrorBoundary'

/** Simulates the lazy One Tap chunk failing to load (the reported error). */
function FailingPrompt(): never {
  throw new Error(
    'Failed to fetch dynamically imported module: http://localhost:5174/src/components/GoogleOneTapLazy.tsx',
  )
}

describe('OneTapErrorBoundary', () => {
  beforeEach(() => {
    // React also logs boundary-caught render errors via console.error — silence
    // both so a passing suite does not report apparent failures.
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the prompt while its module loads normally', () => {
    render(
      <OneTapErrorBoundary>
        <div>prompt</div>
      </OneTapErrorBoundary>,
    )

    expect(screen.getByText('prompt')).toBeInTheDocument()
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('swallows a failed lazy import — no crash, no prompt, one warning', () => {
    render(
      <OneTapErrorBoundary>
        <FailingPrompt />
      </OneTapErrorBoundary>,
    )

    expect(screen.queryByText('prompt')).not.toBeInTheDocument()
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(
      '[GoogleOneTapPrompt] prompt skipped — module failed to load:',
      expect.any(Error),
      expect.anything(),
    )
  })

  it('retries when the reset key changes', () => {
    const { rerender } = render(
      <OneTapErrorBoundary resetKey="a">
        <FailingPrompt />
      </OneTapErrorBoundary>,
    )
    expect(screen.queryByText('prompt')).not.toBeInTheDocument()

    rerender(
      <OneTapErrorBoundary resetKey="b">
        <div>prompt</div>
      </OneTapErrorBoundary>,
    )

    expect(screen.getByText('prompt')).toBeInTheDocument()
  })

  it('stays degraded for the same reset key', () => {
    const { rerender } = render(
      <OneTapErrorBoundary resetKey="a">
        <FailingPrompt />
      </OneTapErrorBoundary>,
    )

    rerender(
      <OneTapErrorBoundary resetKey="a">
        <div>prompt</div>
      </OneTapErrorBoundary>,
    )

    expect(screen.queryByText('prompt')).not.toBeInTheDocument()
  })
})
