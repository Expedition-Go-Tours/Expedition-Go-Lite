import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Mail, MessagesSquare, HelpCircle, FileText, UserRound, MapPin } from 'lucide-react'
import Footer from '../components/Footer'
import { openSupportChat } from '../lib/support'
import heroImg from '../assets/images/QuadBiking.webp'
import './SupportPages.css'

const SUPPORT_EMAIL = 'support@expedition-go.com'

const SUPPORT_HOURS = [
  { label: 'Mon - Fri', value: '8:00 AM - 6:00 PM', closed: false },
  { label: 'Saturday', value: '9:00 AM - 2:00 PM', closed: false },
  { label: 'Sunday', value: 'Closed', closed: true },
]

export default function HelpCentrePage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('footer.helpCentre')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <div className="support-hero">
        <div className="support-hero-bg">
          <img src={heroImg} alt="" aria-hidden="true" />
        </div>
        <div className="support-hero-orb support-hero-orb--1" />
        <div className="support-hero-orb support-hero-orb--2" />
        <div className="support-hero-orb support-hero-orb--3" />
        <div className="support-hero-orb support-hero-orb--4" />
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.helpCentre')}</h1>
          <p className="support-subtitle">{t('support.helpCentreSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <h2 className="support-section-title">{t('support.exploreTopics')}</h2>
        <div className="support-card-grid">
          <Link to="/faq" className="support-card support-link-card">
            <div className="holo-icon">
              <HelpCircle size={22} />
            </div>
            <h3 className="support-card-title">{t('footer.faq')}</h3>
            <p className="support-card-text">
              Quick answers about bookings, cancellations, payments, pickup and more.
            </p>
          </Link>

          <Link to="/refund-policy" className="support-card support-link-card">
            <div className="holo-icon">
              <FileText size={22} />
            </div>
            <h3 className="support-card-title">{t('footer.refundPolicy')}</h3>
            <p className="support-card-text">
              How cancellations and refunds work on free-cancellation and non-refundable tours.
            </p>
          </Link>

          <Link to="/contact-us" className="support-card support-link-card">
            <div className="holo-icon">
              <UserRound size={22} />
            </div>
            <h3 className="support-card-title">{t('footer.contactUs')}</h3>
            <p className="support-card-text">
              Reach our team by email or live chat during support hours.
            </p>
          </Link>
        </div>

        <h2 className="support-section-title">{t('support.supportHours')}</h2>
        <div className="support-card">
          <ul className="support-hours">
            {SUPPORT_HOURS.map((h) => (
              <li key={h.label}>
                <span className="support-hours-day">{h.label}</span>
                <span className={h.closed ? 'support-hours-closed' : ''}>{h.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <h2 className="support-section-title">Visit Us</h2>
        <div className="support-location-card">
          <div className="support-location-map">
            <iframe
              title="Expedition-Go Tours Ltd Office Location"
              src="https://www.google.com/maps?q=Expedition-Go+Tours+Ltd,+Accra,+Ghana&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="support-location-info">
            <img src="/logo.png" alt="Expedition-Go Tours" className="support-location-logo" />
            <div className="support-contact-label">
              <MapPin size={14} />
              Our Office
            </div>
            <h3 className="support-location-name">Expedition-Go Tours Ltd</h3>
            <p className="support-location-address">
              Accra, Ghana<br />
              West Africa
            </p>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Expedition-Go+Tours+Ltd,+Accra,+Ghana&travelmode=driving"
              target="_blank"
              rel="noopener noreferrer"
              className="support-btn support-btn-secondary support-btn-secondary--filled"
            >
              <MapPin size={14} />
              Get Directions
            </a>
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
      </div>

      <Footer />
    </div>
  )
}
