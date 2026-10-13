import { Component, type ErrorInfo, type ReactNode } from 'react'

interface OneTapErrorBoundaryProps {
  children: ReactNode
  /** Change this to reset the boundary (e.g. when the auth user changes). */
  resetKey?: unknown
}

interface OneTapErrorBoundaryState {
  hasError: boolean
}

/**
 * Contains a failure of the optional Google One Tap prompt. Its lazy
 * `@react-oauth/google` chunk can fail to load — a flaky connection, the
 * visitor going offline as the prompt arms, or a dev-server re-optimization
 * reload aborting the in-flight import — and the GSI script it drives can
 * throw at render time.
 *
 * The prompt is non-essential: a failure must degrade to "no prompt", never to
 * a crashed route. Without this boundary the error reaches RouteErrorBoundary,
 * which logs it as a page crash, replaces the page with the "Something went
 * wrong" screen and hard-reloads (its chunk-error recovery).
 */
export default class OneTapErrorBoundary extends Component<
  OneTapErrorBoundaryProps,
  OneTapErrorBoundaryState
> {
  state: OneTapErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): OneTapErrorBoundaryState {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: OneTapErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // One concise line: a degradable, optional widget failing — not a page
    // crash, so it must not read like one in the console.
    console.warn('[GoogleOneTapPrompt] prompt skipped — module failed to load:', error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) return null
    return this.props.children
  }
}
