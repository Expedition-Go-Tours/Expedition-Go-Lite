import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Map, Headset, Megaphone, Mail, ArrowRight } from 'lucide-react'
import Footer from '../components/Footer'
import './SupportPages.css'

const CAREERS_EMAIL = 'careers@expedition-go.com'

const DEPARTMENTS = [
  {
    Icon: Route,
    title: 'Operations',
    text: 'Build and improve the tour experiences our travellers love — from onboarding new operators to quality control.',
  },
  {
    Icon: Map,
    title: 'Technology',
    text: 'Design and build the platform that powers bookings, payments, chat and search for thousands of travellers.',
  },
  {
    Icon: Headset,
    title: 'Customer Support',
    text: 'Be the friendly voice travellers rely on before, during and after their trips.',
  },
  {
    Icon: Megaphone,
    title: 'Marketing',
    text: 'Tell the Expedition-Go Tours story and help travellers discover their next unforgettable experience.',
  },
]

export default function CareersPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('footer.careers')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <div className="support-hero">
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.careers')}</h1>
          <p className="support-subtitle">{t('company.careersSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>Why work with us</h2>
          <p>
            Expedition-Go Tours is a small, ambitious team that loves travel and technology. We value
            ownership, honesty and curiosity — and we work hard to make great experiences
            accessible to everyone.
          </p>
          <p>
            We don't currently list open positions on this page. If you're excited about what we
            do, send your CV and a short note about yourself — we're always happy to hear from
            talented people.
          </p>
        </div>

        <h2 className="support-section-title">Where you could fit in</h2>
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

        <h2 className="support-section-title">How to apply</h2>
        <div className="support-actions">
          <a href={`mailto:${CAREERS_EMAIL}`} className="support-btn support-btn-primary">
            <Mail size={16} />
            Send your CV
          </a>
          <a href="/about-us" className="support-btn support-btn-secondary">
            Learn about us
            <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <Footer />
    </div>
  )
}
