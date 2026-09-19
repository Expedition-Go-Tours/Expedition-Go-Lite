import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { Route, Map, Headset, Megaphone, Mail, ArrowRight } from 'lucide-react'
import Footer from '../components/Footer'
import SEO, { buildBreadcrumbSchema } from '../components/SEO'
import './SupportPages.css'

const DotLottieReact = lazy(() =>
  import('@lottiefiles/dotlottie-react').then((m) => ({ default: m.DotLottieReact }))
)

const CAREERS_EMAIL = 'careers@expedition-go.com'

export default function CareersPage() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  const DEPARTMENTS = [
    {
      Icon: Route,
      title: t('careers.dept1Title'),
      text: t('careers.dept1Text'),
    },
    {
      Icon: Map,
      title: t('careers.dept2Title'),
      text: t('careers.dept2Text'),
    },
    {
      Icon: Headset,
      title: t('careers.dept3Title'),
      text: t('careers.dept3Text'),
    },
    {
      Icon: Megaphone,
      title: t('careers.dept4Title'),
      text: t('careers.dept4Text'),
    },
  ]

  return (
    <div className="support-page">
      <SEO
        title="Careers at Expedition-Go Tours - Join Our Ghana Travel Team"
        description="Join Expedition-Go Tours and help shape the future of Ghana tourism. Explore career opportunities in operations, marketing, technology, and customer support."
        keywords="Expedition-Go Tours careers, Ghana tourism jobs, travel industry careers, work in Ghana, Expedition-Go Tours hiring"
        jsonLd={buildBreadcrumbSchema([
          { name: 'Home', url: 'https://expeditiongotours.com/' },
          { name: 'Careers', url: 'https://expeditiongotours.com/careers' },
        ])}
      />
      <div className="support-hero careers-hero">
        <div className="careers-hero-lottie">
          {reduce ? (
            <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation" aria-hidden="true">
              <rect width="320" height="240" rx="20" fill="#f0fdf4" />
              <rect x="60" y="60" width="200" height="120" rx="12" fill="#ffffff" stroke="#bbf7d0" strokeWidth="2" />
              <rect x="80" y="80" width="80" height="8" rx="4" fill="#86efac" />
              <rect x="80" y="100" width="160" height="6" rx="3" fill="#dcfce7" />
              <rect x="80" y="114" width="140" height="6" rx="3" fill="#dcfce7" />
              <rect x="80" y="128" width="120" height="6" rx="3" fill="#dcfce7" />
              <circle cx="260" cy="50" r="16" fill="#4ade80" />
              <circle cx="260" cy="46" r="9" fill="#86efac" />
            </svg>
          ) : (
            <Suspense fallback={<div className="careers-lottie-placeholder" />}>
              <DotLottieReact
                src="/animations/Office.lottie"
                loop
                autoplay
              />
            </Suspense>
          )}
        </div>
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.careers')}</h1>
          <p className="support-subtitle">{t('company.careersSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>{t('careers.whyTitle')}</h2>
          <p>{t('careers.whyText1')}</p>
          <p>{t('careers.whyText2')}</p>
        </div>

        <h2 className="support-section-title">{t('careers.departmentsTitle')}</h2>
        <div className="support-card-grid">
          {DEPARTMENTS.map((dept) => (
            <div key={dept.title} className="support-card">
              <div className="support-card-icon">
                <dept.Icon size={22} />
              </div>
              <h3 className="support-card-title">{dept.title}</h3>
              <p className="support-card-text">{dept.text}</p>
            </div>
          ))}
        </div>

        <h2 className="support-section-title">{t('careers.applyTitle')}</h2>
        <div className="support-actions">
          <a href={`mailto:${CAREERS_EMAIL}`} className="support-btn support-btn-primary">
            <Mail size={16} />
            {t('careers.applyBtn')}
          </a>
          <a href="/about-us" className="support-btn support-btn-secondary support-btn-secondary--filled">
            {t('careers.learnBtn')}
            <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <Footer />
    </div>
  )
}
