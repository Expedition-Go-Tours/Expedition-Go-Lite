import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, Clock, MessagesSquare, LifeBuoy, MapPin } from 'lucide-react'
import Footer from '../components/Footer'
import { openSupportChat } from '../lib/support'
import heroImg from '../assets/images/painting.webp'
import './SupportPages.css'

const SUPPORT_EMAIL = 'info@expeditiongotours.com'
const SUPPORT_PHONE = '+233591409761'

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
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </div>
            <a
              href={`https://wa.me/${SUPPORT_PHONE.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="support-contact-value"
            >
              {SUPPORT_PHONE}
            </a>
            <p className="support-card-text support-card-note">
              Message us on WhatsApp and we'll get back to you as soon as we can.
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
