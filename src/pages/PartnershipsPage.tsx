import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Store, Hotel, Handshake, Camera, Mail, ArrowRight } from 'lucide-react'
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
    to: '/contact-us',
  },
  {
    Icon: Handshake,
    title: 'Travel agents & resellers',
    text: 'Resell Expedition-Go experiences to your clients with simple, transparent partnership terms.',
    to: '/contact-us',
  },
  {
    Icon: Camera,
    title: 'Content creators & influencers',
    text: 'Collaborate with us to create inspiring travel content and earn through your audience.',
    to: '/contact-us',
  },
]

export default function PartnershipsPage() {
  const { t } = useTranslation()
  const [partnerSlide, setPartnerSlide] = useState(0)
  const partnerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = `${t('footer.partnerships')} | Expedition-Go Tours`
  }, [t])

  const scrollToPartner = (index: number) => {
    if (!partnerRef.current) return
    const cards = partnerRef.current.querySelectorAll('.partner-card')
    if (cards[index]) {
      cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
      setPartnerSlide(index)
    }
  }

  const handlePartnerScroll = () => {
    if (!partnerRef.current) return
    const scrollLeft = partnerRef.current.scrollLeft
    const cardWidth = partnerRef.current.querySelector('.partner-card')?.clientWidth || 0
    if (cardWidth > 0) {
      const index = Math.round(scrollLeft / (cardWidth + 16))
      setPartnerSlide(Math.min(index, PARTNER_TYPES.length - 1))
    }
  }

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
        <div
          className="partner-carousel"
          ref={partnerRef}
          onScroll={handlePartnerScroll}
        >
          {PARTNER_TYPES.map((partner) => (
            <div key={partner.title} className="partner-card">
              <div className="partner-card-icon">
                <partner.Icon size={28} />
              </div>
              <div className="partner-card-content">
                <h3 className="partner-card-title">{partner.title}</h3>
                <p className="partner-card-text">{partner.text}</p>
                {partner.to && (
                  <Link
                    to={partner.to}
                    className="partner-card-btn"
                  >
                    Get started
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="partner-dots">
          {PARTNER_TYPES.map((_, index) => (
            <button
              key={index}
              className={`partner-dot ${index === partnerSlide ? 'active' : ''}`}
              onClick={() => scrollToPartner(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
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
