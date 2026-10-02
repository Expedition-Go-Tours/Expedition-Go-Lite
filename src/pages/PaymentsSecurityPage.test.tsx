import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import PaymentsSecurityPage from './PaymentsSecurityPage'

vi.mock('@/components/Footer', () => ({ default: () => <div>FOOTER</div> }))

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/payments-and-security']}>
        <Routes>
          <Route path="/payments-and-security" element={<PaymentsSecurityPage />} />
          <Route path="/tours" element={<div>TOURS_ROUTE</div>} />
          <Route path="/contact-us" element={<div>CONTACT_ROUTE</div>} />
          <Route path="/refund-policy" element={<div>REFUND_ROUTE</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PaymentsSecurityPage', () => {
  it('renders the hero promise and the site footer', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: /Secure payments/i })).toBeInTheDocument()
    expect(screen.getByText(/Payments processed through Stripe/i)).toBeInTheDocument()
    expect(screen.getByText('FOOTER')).toBeInTheDocument()
  })

  it('keeps every jump-nav target on the page', () => {
    const { container } = renderPage()

    for (const id of ['responsibility', 'security', 'ways-to-pay', 'pay-later', 'refunds', 'stay-safe', 'questions']) {
      expect(container.querySelector(`#${id}`), `missing #${id}`).not.toBeNull()
    }

    const jump = container.querySelectorAll('.jump a')
    expect(jump).toHaveLength(7)
    jump.forEach((link) => {
      const hash = link.getAttribute('href')
      expect(hash).toMatch(/^#/)
      expect(container.querySelector(hash as string), `dead jump link ${hash}`).not.toBeNull()
    })
  })

  it('leaves the jump nav without an active state, as the prototype authored it', () => {
    // The prototype ships no `.jump a.active` rule and no scroll-spy in its
    // script. Porting an active highlight here would silently diverge from
    // the reviewed page, so the nav must stay plain anchors.
    const { container } = renderPage()
    const jump = container.querySelector('.jump') as HTMLElement

    expect(jump.querySelector('a.active')).toBeNull()
    container.querySelectorAll('.jump a').forEach((a) => {
      expect(a.className).toBe('')
    })
  })

  it('shows only the selected payment-method panel', () => {
    const { container } = renderPage()

    expect(screen.getByRole('tab', { name: /^Cards$/ })).toHaveAttribute('aria-selected', 'true')
    expect(container.querySelector('#panel-cards')).not.toHaveAttribute('hidden')
    expect(container.querySelector('#panel-wallets')).toHaveAttribute('hidden')

    fireEvent.click(screen.getByRole('tab', { name: /Digital wallets/i }))

    expect(screen.getByRole('tab', { name: /Digital wallets/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^Cards$/ })).toHaveAttribute('aria-selected', 'false')
    expect(container.querySelector('#panel-wallets')).not.toHaveAttribute('hidden')
    expect(container.querySelector('#panel-cards')).toHaveAttribute('hidden')
  })

  it('keeps a single tab stop so the tablist is one arrow-key journey', () => {
    renderPage()

    const focusable = screen
      .getAllByRole('tab')
      .filter((tab) => tab.getAttribute('tabindex') !== '-1')
    expect(focusable).toHaveLength(1)
    expect(focusable[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('moves between the tabs with the arrow keys', () => {
    renderPage()

    const cards = screen.getByRole('tab', { name: /^Cards$/ })
    fireEvent.keyDown(cards, { key: 'ArrowRight' })

    const wallets = screen.getByRole('tab', { name: /Digital wallets/i })
    expect(wallets).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(wallets)
  })

  it('wraps the arrow keys and honours Home and End', () => {
    renderPage()

    const cards = screen.getByRole('tab', { name: /^Cards$/ })
    fireEvent.keyDown(cards, { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: /Pay-later providers/i })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(screen.getByRole('tab', { name: /Pay-later providers/i }), { key: 'End' })
    expect(screen.getByRole('tab', { name: /Pay-later providers/i })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(screen.getByRole('tab', { name: /Pay-later providers/i }), { key: 'Home' })
    expect(screen.getByRole('tab', { name: /^Cards$/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('numbers the payments FAQ and opens only the first answer', () => {
    const { container } = renderPage()

    const numbers = Array.from(container.querySelectorAll('.accordion summary span')).map((el) => el.textContent)
    expect(numbers).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09'])

    const items = container.querySelectorAll('.accordion details')
    expect(items).toHaveLength(9)
    expect(items[0]).toHaveAttribute('open')
    expect(items[1]).not.toHaveAttribute('open')

    // The markup and the FAQPage JSON-LD must stay in step.
    expect(screen.getByText(/Should I send my card details through WhatsApp or email\?/i)).toBeInTheDocument()
  })

  it('keeps the FAQ and the nine questions inside this app', () => {
    const { container } = renderPage()

    // Every question rendered must have an answer underneath it.
    container.querySelectorAll('.accordion details').forEach((item, index) => {
      const answer = item.querySelector('p')?.textContent ?? ''
      expect(answer.length, `FAQ ${index + 1} has no answer`).toBeGreaterThan(40)
    })
  })

  it('resolves the prototype’s own pages in-app instead of off-site', () => {
    renderPage()

    // The prototype pointed at absolute www.travioghana.com URLs; this app
    // serves those same pages, so they must not bounce the visitor elsewhere.
    const internal = screen.getAllByRole('link').filter((a) => (a.getAttribute('href') ?? '').startsWith('/'))
    const hrefs = internal.map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/contact-us')
    expect(hrefs).toContain('/refund-policy')
    expect(hrefs).toContain('/tours')
    internal.forEach((a) => {
      expect(a.getAttribute('href')).not.toMatch(/travioghana\.com/)
    })
  })

  it('sends the closing CTA to the tours index in-app', async () => {
    const { container } = renderPage()

    const cta = container.querySelector('.cta') as HTMLElement
    fireEvent.click(within(cta).getByRole('link', { name: /Explore experiences/i }))
    expect(await screen.findByText('TOURS_ROUTE')).toBeInTheDocument()
  })

  it('opens Stripe documentation externally and safely', () => {
    renderPage()

    const external = screen
      .getAllByRole('link')
      .filter((a) => (a.getAttribute('href') ?? '').startsWith('http'))
    expect(external.length).toBeGreaterThan(10)

    external.forEach((a) => {
      expect(a).toHaveAttribute('target', '_blank')
      const rel = a.getAttribute('rel') ?? ''
      expect(rel, `missing noopener on ${a.getAttribute('href')}`).toContain('noopener')
    })
    expect(external.some((a) => (a.getAttribute('href') ?? '').includes('docs.stripe.com'))).toBe(true)
  })

  it('publishes the title, description and FAQ structured data', () => {
    renderPage()

    expect(document.title).toBe('Payment and Security | Expedition-Go Tours')
    const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => s.textContent ?? '')
    expect(ld.some((s) => s.includes('"FAQPage"'))).toBe(true)
    expect(ld.some((s) => s.includes('"BreadcrumbList"'))).toBe(true)
    expect(ld.some((s) => s.includes('Should I send my card details'))).toBe(true)
  })

  it('keeps the site column contract used by the navbar and footer', () => {
    const { container } = renderPage()

    // Navbar.css / Footer.css align to `body:has(.ps-page)` — drop this class
    // and the navbar and footer stop lining up with the page's content column.
    expect(container.querySelector('.ps-page')).not.toBeNull()
    expect(container.querySelector('.wrap')).not.toBeNull()
    expect(container.querySelectorAll('.wrap').length).toBeGreaterThan(5)
  })
})