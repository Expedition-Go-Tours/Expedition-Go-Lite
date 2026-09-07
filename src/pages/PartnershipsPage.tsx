import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Footer from '../components/Footer'
import partners1 from '../assets/partners/partners1.avif'
import partners2 from '../assets/partners/partners2.avif'
import partners3 from '../assets/partners/partners3.avif'
import partners4 from '../assets/partners/partners4.avif'
import partners5 from '../assets/partners/partners5.avif'
import partners6 from '../assets/partners/partners6.avif'
import partners7 from '../assets/partners/partners7.avif'
import partners8 from '../assets/partners/partners8.avif'
import partners9 from '../assets/partners/partners9.avif'
import tnt1 from '../assets/tnt1.avif'
import tnt2 from '../assets/tnt2.avif'
import tnt3 from '../assets/tnt3.avif'
import './SupportPages.css'

const PARTNERS_EMAIL = 'partners@expedition-go.com'

const HERO_IMAGES = [partners1, partners3, partners4]

const MARQUEE_IMAGES = [partners1, partners2, partners3, partners4, partners5, partners6, partners7, partners8, partners9, tnt1, tnt2]

export default function PartnershipsPage() {
  const { t } = useTranslation()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [partnerSlide, setPartnerSlide] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const partnerRef = useRef<HTMLDivElement>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)
  const marqueeResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const PARTNER_TYPES = [
    {
      title: t('partnerships.type1Title'),
      text: t('partnerships.type1Text'),
      to: '/partners/tour-operators/apply',
      image: partners2,
    },
    {
      title: t('partnerships.type2Title'),
      text: t('partnerships.type2Text'),
      to: '/hotels',
      image: partners7,
    },
    {
      title: t('partnerships.type3Title'),
      text: t('partnerships.type3Text'),
      to: '/travel-agents',
      image: partners9,
    },
    {
      title: t('partnerships.type4Title'),
      text: t('partnerships.type4Text'),
      to: '/content-creators',
      image: partners6,
    },
    {
      title: t('partnerships.type5Title'),
      text: t('partnerships.type5Text'),
      to: '',
      image: tnt3,
    },
  ]

  const handleMarqueeTap = () => {
    const track = marqueeRef.current?.querySelector('.partner-marquee-track')
    if (!track) return
    track.classList.add('paused')
    if (marqueeResumeRef.current) clearTimeout(marqueeResumeRef.current)
    marqueeResumeRef.current = setTimeout(() => {
      track.classList.remove('paused')
    }, 3000)
  }

  useEffect(() => {
    document.title = `${t('footer.partnerships')} | Expedition-Go Tours`
  }, [t])

  // Hero carousel auto-advance
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length)
    }, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const goToSlide = (index: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCurrentSlide(index)
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length)
    }, 5000)
  }

  const prevSlide = () => {
    goToSlide((currentSlide - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)
  }

  const nextSlide = () => {
    goToSlide((currentSlide + 1) % HERO_IMAGES.length)
  }

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
    <div className="support-page partnerships-page">

      {/* Hero Section with Image Carousel */}
      <div className="support-hero">
        <div className="support-hero-carousel">
          {HERO_IMAGES.map((img, index) => (
            <div
              key={index}
              className={`support-hero-slide ${index === currentSlide ? 'active' : ''}`}
            >
              <img src={img} alt="" aria-hidden="true" />
            </div>
          ))}
        </div>
        <button
          className="support-hero-nav support-hero-nav--prev"
          onClick={prevSlide}
          aria-label={t('partnerships.prevImage')}
        >
          <ChevronLeft size={28} />
        </button>
        <button
          className="support-hero-nav support-hero-nav--next"
          onClick={nextSlide}
          aria-label={t('partnerships.nextImage')}
        >
          <ChevronRight size={28} />
        </button>
        <div className="support-hero-dots">
          {HERO_IMAGES.map((_, index) => (
            <button
              key={index}
              className={`support-hero-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={t('partnerships.goToSlide')}
            />
          ))}
        </div>
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.partnerships')}</h1>
          <p className="support-subtitle">{t('company.partnershipsSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>{t('partnerships.whyTitle')}</h2>
          <p>{t('partnerships.whyText')}</p>
        </div>

        {/* Auto-scrolling Partners Marquee */}
        <div className="partner-marquee" ref={marqueeRef} onClick={handleMarqueeTap}>
          <div className="partner-marquee-track">
            {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES].map((img, index) => (
              <div key={index} className="partner-marquee-item">
                <img src={img} alt="" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>

        <h2 className="support-section-title">{t('partnerships.whoTitle')}</h2>
        <div
          className="partner-carousel"
          ref={partnerRef}
          onScroll={handlePartnerScroll}
        >
          {PARTNER_TYPES.map((partner) => (
            <div key={partner.title} className="partner-card">
              <div className="partner-card-image">
                <img src={partner.image} alt={partner.title} />
              </div>
              <div className="partner-card-content">
                <h3 className="partner-card-title">{partner.title}</h3>
                <p className="partner-card-text">{partner.text}</p>
                {partner.to ? (
                  <Link
                    to={partner.to}
                    className="partner-card-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('partnerships.getStarted')}
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="partner-card-btn"
                    disabled
                    title={t('partnerships.comingSoon')}
                  >
                    {t('partnerships.getStarted')}
                    <ArrowRight size={14} />
                  </button>
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
              aria-label={t('partnerships.goToSlide')}
            />
          ))}
        </div>

        <h2 className="support-section-title">{t('partnerships.letsTalk')}</h2>
        <div className="support-actions">
          <a href={`mailto:${PARTNERS_EMAIL}`} className="support-btn support-btn-primary">
            <Mail size={16} />
            {t('partnerships.partnerBtn')}
          </a>
          <Link to="/contact-us" className="support-btn support-btn-secondary">
            {t('partnerships.contactBtn')}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
