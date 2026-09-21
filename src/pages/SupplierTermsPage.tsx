import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Rocket, ArrowRight, ChevronUp } from 'lucide-react'
import Footer from '../components/Footer'
import SEO, { buildBreadcrumbSchema } from '../components/SEO'
import './SupportPages.css'
import './SupplierTermsPage.css'

const POLICY_TABS = [
  { label: 'Supplier Terms', href: '/supplier-terms', active: true },
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Cookies Policy', href: '/cookies-policy' },
]

const SUMMARY_ITEMS = [
  'Free to list and maintain',
  '15% commission on successful bookings',
  'Monthly or bi-weekly payouts',
  'Accurate listings and safe delivery required',
]

const SECTIONS = [
  { id: '1-introduction', num: '01', titleKey: 'supplierTerms.s1Title', contentKey: 'supplierTerms.s1Text' },
  { id: '2-registration-and-approval', num: '02', titleKey: 'supplierTerms.s2Title', contentKeys: ['supplierTerms.s2Text1', 'supplierTerms.s2Text2'] },
  { id: '3-listing-obligations', num: '03', titleKey: 'supplierTerms.s3Title', contentKey: 'supplierTerms.s3Text' },
  { id: '4-commission', num: '04', titleKey: 'supplierTerms.s4Title', contentKey: 'supplierTerms.s4Text' },
  { id: '5-payouts', num: '05', titleKey: 'supplierTerms.s5Title', contentKeys: ['supplierTerms.s5Text1', 'supplierTerms.s5Text2'] },
  { id: '6-bookings-and-cancellations', num: '06', titleKey: 'supplierTerms.s6Title', contentKey: 'supplierTerms.s6Text' },
  { id: '7-conduct-and-quality-standards', num: '07', titleKey: 'supplierTerms.s7Title', contentKey: 'supplierTerms.s7Text' },
  { id: '8-suspension-and-termination', num: '08', titleKey: 'supplierTerms.s8Title', contentKey: 'supplierTerms.s8Text' },
  { id: '9-liability-and-intellectual-property', num: '09', titleKey: 'supplierTerms.s9Title', contentKey: 'supplierTerms.s9Text' },
  { id: '10-changes-and-contact', num: '10', titleKey: 'supplierTerms.s10Title', contentKey: 'supplierTerms.s10Text' },
]

export default function SupplierTermsPage() {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [showToTop, setShowToTop] = useState(false)

  /* ---------- Scroll observer for active TOC ---------- */
  useEffect(() => {
    const sectionIds = SECTIONS.map((s) => s.id)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 },
    )

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  /* ---------- Back to top visibility ---------- */
  useEffect(() => {
    const onScroll = () => setShowToTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="support-page">
      <SEO
        title="Supplier Terms & Conditions - Expedition-Go Tours Ghana"
        description="The terms that govern selling tours and experiences through Expedition-Go Tours. Understand payment terms, commission rates, and partnership requirements."
        keywords="Expedition-Go Tours supplier terms, tour operator terms Ghana, supplier agreement, partnership terms"
        jsonLd={buildBreadcrumbSchema([
          { name: 'Home', url: 'https://expeditiongotours.com/' },
          { name: 'Supplier Terms', url: 'https://expeditiongotours.com/supplier-terms' },
        ])}
      />

      {/* ============================================================ */}
      {/* Hero                                                          */}
      {/* ============================================================ */}
      <section className="support-container st-hero">
        <div>
          <div className="st-kicker">Partner agreement</div>
          <h1>Supplier Terms</h1>
          <p>{t('supplier.termsSubtitle')}</p>
          <div className="st-updated">
            <span className="st-updated-dot" />
            Last updated &middot; August 2026
          </div>
        </div>
        <aside className="st-summary">
          <h2>At a glance</h2>
          <ul>
            {SUMMARY_ITEMS.map((item) => (
              <li key={item}>
                <span className="st-summary-check">&#10003;</span>
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {/* ============================================================ */}
      {/* Policy tabs                                                   */}
      {/* ============================================================ */}
      <div className="support-container st-legal-nav">
        <nav className="st-policy-tabs" aria-label="Legal pages">
          {POLICY_TABS.map((tab) => (
            <Link
              key={tab.href}
              to={tab.href}
              className={`st-policy-tab${tab.active ? ' st-policy-tab--active' : ''}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* ============================================================ */}
      {/* Layout: sidebar + content                                     */}
      {/* ============================================================ */}
      <div className="support-container st-layout">
        <aside className="st-sidebar">
          <div className="st-sidebar-label">On this page</div>
          <nav className="st-toc" aria-label="Table of contents">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`st-toc-link${activeSection === section.id ? ' st-toc-link--active' : ''}`}
              >
                <span className="st-toc-num">{section.num}</span>
                {t(section.titleKey).replace(/^\d+\.\s*/, '')}
              </a>
            ))}
          </nav>
        </aside>

        <div className="st-content">
          {SECTIONS.map((section) => (
            <div key={section.id} id={section.id}>
              <h2>{t(section.titleKey)}</h2>
              {section.contentKey && (
                <p>{t(section.contentKey)}</p>
              )}
              {section.contentKeys && section.contentKeys.map((key) => (
                <p key={key}>{t(key)}</p>
              ))}
            </div>
          ))}

          <div className="st-meta">{t('support.updatedDate')}: August 2026</div>

          <div className="st-content-cta">
            <h3>{t('supplierTerms.readyTitle')}</h3>
            <p>List your tours and experiences on Expedition-Go Tours and reach travellers ready to explore Ghana.</p>
            <div className="st-content-actions">
              <Link to="/supplier/list-experience" className="st-content-btn st-content-btn--primary">
                <Rocket size={16} />
                {t('supplierTerms.listBtn')}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Back to top */}
      <button
        type="button"
        className={`st-to-top${showToTop ? ' st-to-top--visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <ChevronUp size={20} />
      </button>

      <Footer />
    </div>
  )
}
