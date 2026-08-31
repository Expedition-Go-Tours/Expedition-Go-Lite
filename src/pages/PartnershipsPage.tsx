import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Store, Hotel, Handshake, Landmark, Camera, Mail, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './SupportPages.css'

const PARTNERS_EMAIL = 'partners@expedition-go.com'

const PARTNER_TYPES = [
  {
    Icon: Store,
    title: 'Tour operators & suppliers',
    text: 'List your experiences on Expedition-Go and reach travellers ready to book. Start by creating a supplier account.',
    to: '/supplier/list-experience',
  },
  {
    Icon: Hotel,
    title: 'Hotels & accommodations',
    text: 'Offer your guests exclusive experiences and earn through every successful booking.',
  },
  {
    Icon: Handshake,
    title: 'Travel agents & resellers',
    text: 'Resell Expedition-Go experiences to your clients with simple, transparent partnership terms.',
  },
  {
    Icon: Landmark,
    title: 'Tourism boards & DMOs',
    text: 'Promote your destination with curated, bookable experiences that showcase the best of your region.',
  },
  {
    Icon: Camera,
    title: 'Content creators & influencers',
    text: 'Collaborate with us to create inspiring travel content and earn through your audience.',
  },
]

export default function PartnershipsPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('footer.partnerships')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <Navbar />
      <div className="support-hero">
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.partnerships')}</h1>
          <p className="support-subtitle">{t('company.partnershipsSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>Why partner with us</h2>
          <p>
            We believe great partnerships make travel better for everyone. Whether you run tours,
            welcome guests or create content, working with Expedition-Go means reaching travellers
            who are ready to book — with clear terms, fair revenue share and a dedicated partner
            team.
          </p>
        </div>

        <h2 className="support-section-title">Who we work with</h2>
        <div className="support-card-grid">
          {PARTNER_TYPES.map((partner) => (
            <div key={partner.title} className="support-card">
              <div className="support-card-icon">
                <partner.Icon size={22} />
              </div>
              <h3 className="support-card-title">{partner.title}</h3>
              <p className="support-card-text">{partner.text}</p>
              {partner.to && (
                <Link
                  to={partner.to}
                  className="support-btn support-btn-secondary"
                  style={{ marginTop: 14, alignSelf: 'flex-start', padding: '8px 16px', fontSize: 13.5 }}
                >
                  Get started
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          ))}
        </div>

        <h2 className="support-section-title">Let's talk</h2>
        <div className="support-actions">
          <a href={`mailto:${PARTNERS_EMAIL}`} className="support-btn support-btn-primary">
            <Mail size={16} />
            Partner with us
          </a>
          <Link to="/contact-us" className="support-btn support-btn-secondary">
            Contact support
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
