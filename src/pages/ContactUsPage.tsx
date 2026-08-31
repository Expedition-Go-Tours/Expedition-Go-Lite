import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, Clock, MessagesSquare, LifeBuoy } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { openSupportChat } from '../lib/support'
import heroImg from '../assets/images/painting.webp'
import './SupportPages.css'

const SUPPORT_EMAIL = 'support@expedition-go.com'
const SUPPORT_PHONE = '+233 XX XXX XXXX'

const SUPPORT_HOURS = [
  { label: 'Mon - Fri', value: '8:00 AM - 6:00 PM', closed: false },
  { label: 'Saturday', value: '9:00 AM - 2:00 PM', closed: false },
  { label: 'Sunday', value: 'Closed', closed: true },
]

export default function ContactUsPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('footer.contactUs')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <Navbar />
      <div className="support-hero">
        <div className="support-hero-bg">
          <img src={heroImg} alt="" aria-hidden="true" />
        </div>
        <div className="support-hero-orb support-hero-orb--1" />
        <div className="support-hero-orb support-hero-orb--2" />
        <div className="support-hero-orb support-hero-orb--3" />
        <div className="support-hero-orb support-hero-orb--4" />
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.contactUs')}</h1>
          <p className="support-subtitle">{t('support.contactUsSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-contact-grid">
          <div className="support-card">
            <div className="support-contact-label">
              <Mail size={14} />
              Email
            </div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="support-contact-value">
              {SUPPORT_EMAIL}
            </a>
            <p className="support-card-text support-card-note">
              We usually reply within one business day.
            </p>
          </div>

          <div className="support-card">
            <div className="support-contact-label">
              <Phone size={14} />
              Phone
            </div>
            <a href={`tel:${SUPPORT_PHONE.replace(/ /g, '')}`} className="support-contact-value">
              {SUPPORT_PHONE}
            </a>
            <p className="support-card-text support-card-note">
              Call us during support hours for immediate help.
            </p>
          </div>

          <div className="support-card">
            <div className="support-contact-label">
              <Clock size={14} />
              {t('support.supportHours')}
            </div>
            <ul className="support-hours">
              {SUPPORT_HOURS.map((h) => (
                <li key={h.label}>
                  <span className="support-hours-day">{h.label}</span>
                  <span className={h.closed ? 'support-hours-closed' : ''}>{h.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <h2 className="support-section-title">{t('support.stillNeedHelp')}</h2>
        <div className="support-actions">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="support-btn support-btn-primary">
            <Mail size={16} />
            {t('support.emailUs')}
          </a>
          <button type="button" className="support-btn support-btn-secondary support-btn-secondary--filled" onClick={openSupportChat}>
            <MessagesSquare size={16} />
            {t('support.chatWithUs')}
          </button>
        </div>

        <div className="support-card" style={{ marginTop: 32 }}>
          <div className="support-contact-label">
            <LifeBuoy size={14} />
            {t('support.exploreTopics')}
          </div>
          <p className="support-card-text">
            Before you reach out, you may find your answer in the{' '}
            <a href="/faq">FAQ</a>{' '}
            or our{' '}
            <a href="/refund-policy">Refund Policy</a>
            .
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
