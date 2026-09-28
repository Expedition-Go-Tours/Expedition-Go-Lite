import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useCurrency, availableCurrencies } from '../contexts/CurrencyContext'
import { useCookieConsent } from '../context/CookieConsentContext'
import { prefetchRouteChunk } from '../lib/prefetchRouteChunks'
import LanguageCurrencyModal from './LanguageCurrencyModal'
import './Footer.css'
import visaSrc from '../assets/icons/visa.svg'
import americanexpressSrc from '../assets/images/amex.png'
import applePaySrc from '../assets/images/apple.png'
import googlePaySrc from '../assets/images/gpay.png'
import mastercardSrc from '../assets/images/master.png'
import paypalSrc from '../assets/images/papy.png'
import logoSrc from '../assets/expo_trans.png'
import tripadvisorOwlSrc from '../assets/tripadvisor-owl.png'

const SITE_NAME = 'Expedition-Go Tours'

/** Language names are shown in their own language, as the modal does. */
const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English (US)' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
]

const PAYMENTS = [
  { key: 'mc', src: mastercardSrc, alt: 'Mastercard' },
  { key: 'visa', src: visaSrc, alt: 'Visa' },
  { key: 'amex', src: americanexpressSrc, alt: 'American Express' },
  { key: 'paypal', src: paypalSrc, alt: 'PayPal' },
  { key: 'gpay', src: googlePaySrc, alt: 'Google Pay' },
  { key: 'apple', src: applePaySrc, alt: 'Apple Pay' },
]

/** Each network's mark: most ship as a single 24×24 path filled with the
    chip's `currentColor`; Tripadvisor ships as the full-color owl bitmap. */
type SocialItem = {
  key: string
  label: string
  href: string
  path?: string
  img?: string
}

const SOCIALS: SocialItem[] = [
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/expeditiongotours',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    href: 'https://web.facebook.com/p/Expedition-Go-Tours-LTD-61567042001418/?_rdc=1&_rdr#',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    href: 'https://www.tiktok.com/@expeditiongotours',
    path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    href: 'https://www.youtube.com/c/ExpeditionGoTravelandToursLTD',
    path: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    key: 'tripadvisor',
    label: 'Tripadvisor',
    href: 'https://www.tripadvisor.com/Attraction_Review-g293797-d24155300-Reviews-Expedition_Go_Tours_Ltd-Accra_Greater_Accra.html',
    img: tripadvisorOwlSrc,
  },
]

type NavLink = { to: string; labelKey: string; strong?: boolean }
type NavGroup = { key: string; titleKey: string; links: NavLink[] }

/**
 * Six columns, not the mock's five: the old footer carried a "Work with Us"
 * group of five partner sign-up pages and dropping those would remove the only
 * route to them from anywhere on the site. The mock also listed "Airport
 * transfers" twice and effectively repeated Contact Us and Partnerships under
 * softer labels, so those are de-duplicated here rather than shipped as-is.
 *
 * Two targets differ from the mock: it linked /airport-transfer, which has no
 * route, so transfers point at /transport; and the four destination links
 * point at /tours because there are no per-destination pages to point at yet.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'explore',
    titleKey: 'footer.explore',
    links: [
      { to: '/', labelKey: 'footer.home' },
      { to: '/tours', labelKey: 'footer.exploreTours' },
      { to: '/blog', labelKey: 'footer.travelInspiration' },
    ],
  },
  {
    key: 'support',
    titleKey: 'footer.support',
    links: [
      { to: '/help-centre', labelKey: 'footer.helpCentre' },
      { to: '/contact-us', labelKey: 'footer.contactUs' },
      { to: '/faq', labelKey: 'footer.faq' },
      { to: '/refund-policy', labelKey: 'footer.refundPolicy' },
    ],
  },
  {
    key: 'company',
    titleKey: 'footer.company',
    links: [
      { to: '/about-us', labelKey: 'footer.aboutUs' },
      { to: '/careers', labelKey: 'footer.careers' },
      { to: '/partnerships', labelKey: 'footer.partnerships' },
      { to: '/foundation', labelKey: 'footer.ourFoundation' },
      { to: '/supplier-terms', labelKey: 'footer.supplierTerms' },
    ],
  },
  {
    key: 'plan',
    titleKey: 'footer.planWithUs',
    links: [
      { to: '/contact-us', labelKey: 'footer.enquireAboutTour', strong: true },
      { to: '/tours', labelKey: 'footer.privateTours' },
      { to: '/transport', labelKey: 'footer.airportTransfers' },
    ],
  },
  {
    key: 'discover',
    titleKey: 'footer.discoverGhana',
    links: [
      { to: '/tours', labelKey: 'footer.accra' },
      { to: '/tours', labelKey: 'footer.capeCoast' },
      { to: '/tours', labelKey: 'footer.kumasi' },
      { to: '/tours', labelKey: 'footer.voltaRegion' },
    ],
  },
  {
    key: 'work',
    titleKey: 'footer.supplierZone',
    links: [
      { to: '/supplier/list-experience', labelKey: 'footer.asSupplier' },
      { to: '/content-creators', labelKey: 'footer.asContentCreator' },
      { to: '/travel-agents', labelKey: 'footer.asTravelAgentReseller' },
      { to: '/transport-providers', labelKey: 'footer.asTransportProvider' },
      { to: '/hotels', labelKey: 'footer.asAccommodationProvider' },
    ],
  },
]

/** Route chunk warmed on hover/focus so the transition doesn't flash the
    Suspense fallback. Social links below stay external and never use this. */
function FooterLink({
  to,
  className,
  children,
}: {
  to: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={className}
      onPointerEnter={() => prefetchRouteChunk(to)}
      onFocus={() => prefetchRouteChunk(to)}
    >
      {children}
    </Link>
  );
}

/**
 * Translation options for this footer, which needs one extra binding that the
 * rest of the app does not.
 *
 * `useTranslation` binds `languageChanged` on the i18next *instance* and nothing
 * on its resource *store*. But `src/i18n/config.ts` deliberately keeps
 * non-English bundles out of the entry chunk: it switches language first, then
 * attaches the bundle asynchronously with `addResourceBundle`, which i18next
 * routes to `store.addResourceBundle` and whose `added` event the store emits to
 * itself — the instance only forwards `*` from the backend connector and
 * translator, so `i18n.on('added')` can never fire.
 *
 * React mounts in the gap between the switch and the bundle landing, and this
 * footer renders once and then stays put, so it reads English fallbacks and
 * keeps them: the footer holds the language switcher, yet its own copy would sit
 * in English beside a correctly-labelled trigger. Binding the store's `added`
 * gives it a reason to re-render when the real strings arrive.
 *
 * `bindI18nStore` is honoured at runtime (see useTranslation.js, which calls
 * `i18n.store.on(bindI18nStore, …)`) but is missing from the published
 * `UseTranslationOptions` type, whose own comment notes that further i18next
 * options may work. Hence the cast.
 */
const FOOTER_I18N = { bindI18nStore: 'added' } as Parameters<
  typeof useTranslation
>[1]

export default function Footer() {
  const { t, i18n: activeI18n } = useTranslation(undefined, FOOTER_I18N)
  const { currency } = useCurrency()
  const { openPreferences } = useCookieConsent()
  const langCode = (activeI18n.language ?? 'en').substring(0, 2).toLowerCase()
  const currentLang = LANGUAGES.find((lang) => lang.code === langCode)
  const currentCurrency = availableCurrencies.find((c) => c.code === currency.code)
  const year = new Date().getFullYear()

  // Language and currency are chosen through the same modal the navbar uses;
  // which tab to open is remembered per button.
  const [modalTab, setModalTab] = useState<'language' | 'currency' | null>(null)

  const rootRef = useRef<HTMLElement>(null)
  const wordRef = useRef<HTMLDivElement>(null)

  /**
   * Scroll reveal, ported from the mock's inline script. The mock hung its
   * `.motion` class off <html>; here `.footer-motion` goes on this subtree
   * directly, and only from an effect that has confirmed both that reduced
   * motion is not requested and that IntersectionObserver exists — so a render
   * without JS leaves the content visible rather than stuck at opacity 0.
   */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return
    const targets = root.querySelectorAll('.reveal')
    if (!targets.length) return
    root.classList.add('footer-motion')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('in-view')
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px 70px 0px' },
    )
    targets.forEach((el) => observer.observe(el))
    return () => {
      observer.disconnect()
      root.classList.remove('footer-motion')
    }
  }, [])

  /**
   * The oversized word in the bottom band is fitted by binary search, as in the
   * mock: 14 halvings land within a fraction of a pixel of the widest size
   * whose rendered span still fits the container. Re-runs on resize (via
   * ResizeObserver) and whenever the text changes.
   */
  useEffect(() => {
    const box = wordRef.current
    if (!box || !('ResizeObserver' in window)) return
    const span = box.querySelector('span')
    if (!span) return
    const fit = () => {
      const target = box.clientWidth
      if (!target) return
      let low = 16
      let high = 240
      for (let i = 0; i < 14; i++) {
        const size = (low + high) / 2
        box.style.fontSize = `${size}px`
        if (span.getBoundingClientRect().width > target) high = size
        else low = size
      }
      box.style.fontSize = `${low}px`
    }
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    fit()
    return () => observer.disconnect()
  }, [])

  const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties

  return (
    <footer ref={rootRef} className="footer">
      {/* Feature banner */}
      <div className="footer-wrap">
        <section className="feature reveal" aria-labelledby="footer-feature-title">
          <div className="feature-content">
            <p className="kicker">{t('footer.featureKicker')}</p>
            <h2 id="footer-feature-title">
              {t('footer.featureTitle')} <em>{t('footer.featureTitleAccent')}</em>
            </h2>
            <p>{t('footer.featureBody')}</p>
          </div>
          <div className="feature-actions">
            <FooterLink to="/tours" className="feature-button">
              {t('footer.featureCta')}
              <span className="round-arrow" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <path
                    d="M3 10h13m0 0-5-5m5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </FooterLink>
            <FooterLink to="/contact-us" className="feature-secondary">
              {t('footer.featureSecondary')} <span aria-hidden="true">↗</span>
            </FooterLink>
          </div>
        </section>
      </div>

      <div className="footer-wrap">
        {/* Brand + language/currency */}
        <div className="topline reveal" style={delay(80)}>
          <div className="brand-block">
            <Link to="/" className="brand" aria-label={SITE_NAME}>
              <img
                className="brand-logo"
                src={logoSrc}
                alt={SITE_NAME}
                width={300}
                height={200}
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p>{t('footer.brandTagline')}</p>
          </div>

          <div className="controls">
            <div className="control">
              <label htmlFor="footer-language">{t('footer.language')}</label>
              <div className="select">
                <button
                  id="footer-language"
                  type="button"
                  className="select-trigger"
                  onClick={() => setModalTab('language')}
                  aria-haspopup="dialog"
                >
                  {currentLang ? (
                    <>
                      <span className="select-flag" aria-hidden="true">
                        {currentLang.flag}
                      </span>
                      {currentLang.label}
                    </>
                  ) : (
                    t('footer.language')
                  )}
                </button>
              </div>
            </div>

            <div className="control">
              <label htmlFor="footer-currency">{t('footer.currency')}</label>
              <div className="select">
                <button
                  id="footer-currency"
                  type="button"
                  className="select-trigger"
                  onClick={() => setModalTab('currency')}
                  aria-haspopup="dialog"
                >
                  {currentCurrency
                    ? `${currency.code} · ${currentCurrency.label} (${currency.symbol})`
                    : currency.code}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="navigation">
          {NAV_GROUPS.map((group, index) => (
            <nav
              key={group.key}
              className="nav-group reveal"
              style={delay(60 + index * 60)}
              aria-label={t(group.titleKey)}
            >
              <h3>{t(group.titleKey)}</h3>
              <ul>
                {group.links.map((link) => (
                  <li key={`${group.key}-${link.labelKey}`}>
                    <FooterLink to={link.to} className={link.strong ? 'strong-link' : undefined}>
                      {link.strong && (
                        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M3 13 13 3M6 3h7v7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      {t(link.labelKey)}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Location + payments + socials */}
        <div className="meta reveal" style={delay(100)}>
          <div>
            <span className="meta-title">{t('footer.basedInAccra')}</span>
            <p className="meta-copy">{t('footer.metaCopy')}</p>
          </div>
          <div>
            <span className="meta-title">{t('footer.waysToPay')}</span>
            <div className="payments">
              {PAYMENTS.map((payment) => (
                <span className={`pay ${payment.key}`} key={payment.key}>
                  <img src={payment.src} alt={payment.alt} loading="lazy" decoding="async" />
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="meta-title">{t('footer.followOurJourney')}</span>
            <div className="socials">
              {SOCIALS.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`social ${social.key}`}
                  aria-label={social.label}
                >
                  {social.img ? (
                    <img src={social.img} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={social.path} />
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom band: oversized faded wordmark + legal line */}
      <div className="bottom">
        <div ref={wordRef} className="bottom-word" aria-hidden="true">
          <span>{SITE_NAME}</span>
        </div>
        <div className="footer-wrap bottom-inner">
          <p>
            © {year} <strong>{SITE_NAME} Ltd</strong> · Accra, Ghana
          </p>
          <nav className="legal-links" aria-label={t('footer.legalNav')}>
            <FooterLink to="/terms-and-conditions">{t('footer.termsConditions')}</FooterLink>
            <FooterLink to="/privacy-policy">{t('footer.privacyPolicy')}</FooterLink>
            <FooterLink to="/refund-policy">{t('footer.refundPolicy')}</FooterLink>
            <FooterLink to="/cookies-policy">{t('footer.cookiesPolicy')}</FooterLink>
            {/* Reopens the consent panel. The Cookie Policy commits to this
                being available from the footer at any time. */}
            <button type="button" onClick={openPreferences}>
              {t('footer.cookieSettings')}
            </button>
          </nav>
        </div>
      </div>

      <AnimatePresence>
        {modalTab && (
          <LanguageCurrencyModal initialTab={modalTab} onClose={() => setModalTab(null)} />
        )}
      </AnimatePresence>
    </footer>
  )
}
