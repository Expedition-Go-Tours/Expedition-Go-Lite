import { Component, type ReactNode } from 'react'

interface RouteErrorBoundaryProps {
  children: ReactNode
}

interface RouteErrorBoundaryState {
  hasError: boolean
  message?: string
}

/**
 * App-level error boundary around the routed pages. Without this, any render
 * error during a client-side route change unmounts the whole tree and leaves a
 * blank white screen (React 18). With it, the user sees a "reload" screen and
 * the error is logged so this class of bug stops being invisible.
 */
export default class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    }
  }

  componentDidCatch(error: unknown, info: unknown): void {
    console.error('[RouteErrorBoundary] Page crashed during navigation:', error, info)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 22, color: '#1a1a2e' }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, maxWidth: 440, fontFamily: 'var(--font-body)', fontSize: 14, color: '#667085' }}>
            An unexpected error happened while loading this page. Please reload to continue.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '10px 22px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--bv-accent, #16a34a)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
