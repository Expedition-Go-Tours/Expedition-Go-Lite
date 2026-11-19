import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  user: null as { email?: string } | null,
}))

vi.mock('../hooks/useAuthUser', () => ({
  useAuthUser: () => mocks.user,
}))

import NewsletterSection from './NewsletterSection'

function renderNewsletter() {
  return render(
    <MemoryRouter>
      <NewsletterSection />
    </MemoryRouter>,
  )
}

describe('NewsletterSection email prefill', () => {
  beforeEach(() => {
    cleanup()
    mocks.user = null
  })

  it('starts empty for a signed-out visitor', () => {
    renderNewsletter()

    expect(screen.getByLabelText('Email address')).toHaveValue('')
  })

  it('prefills the signed-in account email', () => {
    mocks.user = { email: 'ama@example.com' }
    renderNewsletter()

    expect(screen.getByLabelText('Email address')).toHaveValue('ama@example.com')
  })

  it('replaces the value when a different account signs in', () => {
    mocks.user = { email: 'ama@example.com' }
    const { rerender } = renderNewsletter()
    expect(screen.getByLabelText('Email address')).toHaveValue('ama@example.com')

    mocks.user = { email: 'kwame@example.com' }
    rerender(
      <MemoryRouter>
        <NewsletterSection />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Email address')).toHaveValue('kwame@example.com')
  })

  it('clears the value again on sign-out', () => {
    mocks.user = { email: 'ama@example.com' }
    const { rerender } = renderNewsletter()

    mocks.user = null
    rerender(
      <MemoryRouter>
        <NewsletterSection />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Email address')).toHaveValue('')
  })
})
