import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { MotionConfig } from 'framer-motion'
import translations from '../src/i18n/locales/en.json'
import { CurrencyProvider } from '../src/contexts/CurrencyContext'
import { CookieConsentProvider } from '../src/context/CookieConsentContext'
import { SITE_URL } from '../src/components/SEO'

const pages = {
  'careers': () => import('../src/pages/CareersPage'),
  'contact-us': () => import('../src/pages/ContactUsPage'),
  'cookies-policy': () => import('../src/pages/CookiesPolicyPage'),
  'privacy-policy': () => import('../src/pages/PrivacyPolicyPage'),
  'supplier-terms': () => import('../src/pages/SupplierTermsPage'),
  'reviews': () => import('../src/pages/AllReviewsPage'),
}

export async function renderPages(reviewData: unknown, reviewStats: unknown) {
  const i18n = i18next.createInstance()
  await i18n.init({ lng: 'en', resources: { en: { translation: translations } }, interpolation: { escapeValue: false } })
  const output: Record<string, string> = {}
  for (const [slug, load] of Object.entries(pages)) {
    const Page = (await load()).default
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    client.setQueryData(['external-reviews-data'], reviewData)
    client.setQueryData(['external-review-stats'], reviewStats)
    const body = renderToStaticMarkup(
      <HelmetProvider><QueryClientProvider client={client}>
        <I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/' + slug]}>
          <CookieConsentProvider><CurrencyProvider><MotionConfig reducedMotion="always"><Page /></MotionConfig></CurrencyProvider></CookieConsentProvider>
        </MemoryRouter></I18nextProvider>
      </QueryClientProvider></HelmetProvider>,
    )
    // React 19 emits Helmet metadata as native tags in the server markup.
    const metadata = body.match(/<title[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>|<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g) || []
    const content = body.replace(/<title[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*>|<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/<svg\b[\s\S]*?<\/svg>/g, '').replace(/<img\b[^>]*>/g, '')
      .replace(/ style="[^"]*"/g, '') // Motion's initial opacity must not hide static content.
    const fallback = slug === 'reviews' ? `<title>Reviews &amp; Testimonials | Expedition-Go Tours</title><meta name="description" content="Read traveller reviews of Expedition-Go Tours experiences in Ghana."><link rel="canonical" href="${SITE_URL}/reviews"><meta name="robots" content="index, follow">` : ''
    output[slug] = '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + fallback + metadata.join('') + '</head><body>' + content + '</body></html>'
    client.clear()
  }
  return output
}
