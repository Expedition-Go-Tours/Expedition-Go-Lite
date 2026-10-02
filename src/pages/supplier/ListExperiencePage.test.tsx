import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import ListExperiencePage from './ListExperiencePage'

const mocks = vi.hoisted(() => ({
  profile: null as null | { id: string; userId: string; status: string },
}))

vi.mock('@/hooks/useSupplierStatus', () => ({
  useSupplierStatus: () => ({ profile: mocks.profile, isLoading: false }),
  supplierStatusKey: () => ['supplier-status', 'test'],
}))

vi.mock('@/lib/supplier', () => ({
  getSupplierPortalUrl: vi.fn(async () => null),
  isApprovedSupplier: () => false,
}))

vi.mock('@/components/Footer', () => ({ default: () => <div>FOOTER</div> }))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/supplier/list-experience']}>
          <Routes>
            <Route path="/supplier/list-experience" element={<ListExperiencePage />} />
            <Route path="/supplier/register" element={<div>REGISTER_ROUTE</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

beforeEach(() => {
  mocks.profile = null
  vi.clearAllMocks()
})

describe('ListExperiencePage', () => {
  it('renders the Travio Ghana story with the trust layer and footer', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: /Built for Ghana/i })).toBeInTheDocument()
    expect(screen.getByText('of each successful booking retained')).toBeInTheDocument()
    expect(screen.getByText(/Independent travel-platform proof/i)).toBeInTheDocument()
    expect(screen.getByText(/Travio Ghana is an initiative of Expedition-Go Tours Ltd/i)).toBeInTheDocument()
    expect(screen.getByText('FOOTER')).toBeInTheDocument()
  })

  it('keeps the prototype section anchors inside the page', () => {
    const { container } = renderPage()

    for (const id of [
      'story',
      'purpose',
      'goals',
      'suppliers',
      'commercial-terms',
      'how-it-works',
      'partnership',
      'impact',
      'questions',
    ]) {
      expect(container.querySelector(`#${id}`), `missing #${id}`).not.toBeNull()
    }

    // The jump nav is the page's only in-page navigation and every target resolves.
    const jump = container.querySelectorAll('.jump a')
    expect(jump).toHaveLength(9)
    jump.forEach((link) => {
      const hash = link.getAttribute('href')
      expect(hash).toMatch(/^#/)
      expect(container.querySelector(hash as string), `dead jump link ${hash}`).not.toBeNull()
    })
  })

  it('routes the hero CTA to the registration page', async () => {
    const { container } = renderPage()

    const hero = container.querySelector('.hero') as HTMLElement
    fireEvent.click(within(hero).getByRole('button', { name: /Become a supplier/i }))
    expect(await screen.findByText('REGISTER_ROUTE')).toBeInTheDocument()
  })

  it('routes the closing CTA to the registration page', async () => {
    const { container } = renderPage()

    const cta = container.querySelector('.cta') as HTMLElement
    fireEvent.click(within(cta).getByRole('button', { name: /Become a supplier/i }))
    expect(await screen.findByText('REGISTER_ROUTE')).toBeInTheDocument()
  })

  it('numbers the supplier FAQ and lists all twelve questions', () => {
    renderPage()

    const numbers = Array.from(document.querySelectorAll('.faq-num')).map((el) => el.textContent)
    expect(numbers).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'])
    expect(screen.getByText(/How are Travio Ghana and Expedition-Go Tours connected\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Is Travio Ghana a Ghanaian platform\?/i)).toBeInTheDocument()
    // The FAQ markup and the FAQ JSON-LD must stay in step.
    expect(document.querySelectorAll('details')).toHaveLength(12)
  })

  it('links the travel-platform proof cards to the public profiles', () => {
    renderPage()

    const links = screen.getAllByRole('link', { name: /View profile/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('tripadvisor.com'))
    expect(links[1]).toHaveAttribute('href', expect.stringContaining('getyourguide.com'))
  })

  it('switches the platform category tabs', () => {
    const { container } = renderPage()

    expect(screen.getByRole('tab', { name: /Tours & activities/i })).toHaveAttribute('aria-selected', 'true')
    expect(container.querySelector('#category-title')?.textContent).toBe('Experiences worth travelling for.')

    fireEvent.click(screen.getByRole('tab', { name: /Hotels & stays/i }))

    expect(screen.getByRole('tab', { name: /Hotels & stays/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Tours & activities/i })).toHaveAttribute('aria-selected', 'false')
    expect(container.querySelector('#category-panel')?.getAttribute('aria-labelledby')).toBe('tab-stays')
    expect(container.querySelector('#category-title')?.textContent).toBe('A place to stay. A reason to explore.')
  })

  it('moves between tabs with the arrow keys', () => {
    renderPage()

    const tours = screen.getByRole('tab', { name: /Tours & activities/i })
    fireEvent.keyDown(tours, { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: /Hotels & stays/i })).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Hotels & stays/i }))
  })

  it('computes the commission split from the booking example', () => {
    const { container } = renderPage()

    const input = container.querySelector('#booking-value') as HTMLInputElement
    expect(container.querySelector('#supplier-share')?.textContent).toBe('GHS 850.00')
    expect(container.querySelector('#platform-share')?.textContent).toBe('GHS 150.00')

    fireEvent.change(input, { target: { value: '0' } })
    expect(container.querySelector('#supplier-share')?.textContent).toBe('GHS 0.00')
    expect(container.querySelector('#platform-share')?.textContent).toBe('GHS 0.00')
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('flags an unusable booking example instead of showing a false split', () => {
    const { container } = renderPage()

    const input = container.querySelector('#booking-value') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })

    expect(container.querySelector('#supplier-share')?.textContent).toBe('Enter a valid amount')
    expect(container.querySelector('#platform-share')?.textContent).toBe('—')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('pauses and resumes the experience gallery', () => {
    const { container } = renderPage()

    const control = screen.getByRole('button', { name: /Pause gallery/i })
    const track = container.querySelector('.gallery-track') as HTMLElement
    expect(track.classList.contains('paused')).toBe(false)

    fireEvent.click(control)
    expect(screen.getByRole('button', { name: /Play gallery/i })).toHaveAttribute('aria-pressed', 'true')
    expect(track.classList.contains('paused')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Play gallery/i }))
    expect(track.classList.contains('paused')).toBe(false)
  })

  it('keeps the site column contract used by the navbar and footer', () => {
    const { container } = renderPage()

    // Navbar.css / Footer.css align to `body:has(.le-page)` — drop this class
    // and the navbar and footer stop lining up with the page's content column.
    const page = container.querySelector('.le-page') as HTMLElement
    expect(page).not.toBeNull()
    expect(container.querySelector('.wrap')).not.toBeNull()
    expect(container.querySelectorAll('.wrap').length).toBeGreaterThan(5)
  })
})
