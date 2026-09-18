import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Camera,
  Car,
  ChevronLeft,
  ChevronRight,
  Compass,
  Hotel,
  Mail,
  Users,
} from 'lucide-react'
import Footer from '../components/Footer'
import SEO, { buildBreadcrumbSchema, buildOrganizationSchema } from '../components/SEO'
import BackToHelpCentre from '../components/support/BackToHelpCentre'
import { SUPPORT_EMAIL } from '../lib/support'

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
import './PartnershipsPage.css'

const HERO_IMAGES = [
  { src: partners3, width: 841, height: 516 },
  { src: partners1, width: 645, height: 624 },
  { src: partners4, width: 785, height: 624 },
]

/**
 * Partner-program banners (baked-in headline text) live in the scrolling
 * gallery where their wording reads as intended; the card covers below use
 * clean photography instead.
 */
const MARQUEE_IMAGES = [
  { src: partners1, width: 645, height: 624 },
  { src: partners3, width: 841, height: 516 },
  { src: partners4, width: 785, height: 624 },
  { src: partners5, width: 841, height: 576 },
  { src: partners7, width: 814, height: 624 },
  { src: partners8, width: 841, height: 581 },
  { src: tnt1, width: 329, height: 271 },
  { src: tnt2, width: 409, height: 253 },
  { src: tnt3, width: 515, height: 281 },
  { src: partners2, width: 841, height: 546 },
  { src: partners6, width: 841, height: 568 },
  { src: partners9, width: 841, height: 614 },
]

const HERO_INTERVAL_MS = 5000

/**
 * Static partner-type layout. Copy is resolved per-locale in the component
 * (t(`partnerships.${key}Title`) / `...Text`).
 * `focus` tunes the 16:10 card crop away from signage baked into the source
 * photos; alternatives if a crop misbehaves: type2 → partners4,
 * type3 → partners1, type5 → partners4.
 */
const PARTNER_LAYOUT = [
  {
    key: 'type1',
    to: '/partners/tour-operators/apply',
    image: partners2,
    width: 841,
    height: 546,
    focus: 'center',
    Icon: Compass,
  },
  {
    key: 'type2',
    to: '/hotels',
    image: partners7,
    width: 814,
    height: 624,
    focus: '50% 72%',
    Icon: Hotel,
  },
  {
    key: 'type3',
    to: '/travel-agents',
    image: partners9,
    width: 841,
    height: 614,
    focus: '50% 42%',
    Icon: Users,
  },
  {
    key: 'type4',
    to: '/content-creators',
    image: partners6,
    width: 841,
    height: 568,
    focus: 'center',
    Icon: Camera,
  },
  {
    key: 'type5',
    to: '/transport-providers',
    image: partners8,
    width: 841,
    height: 581,
    focus: '50% 80%',
    Icon: Car,
  },
]

export default function PartnershipsPage() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [partnerSlide, setPartnerSlide] = useState(0)
  const [heroHeld, setHeroHeld] = useState(false)
  const partnerRef = useRef<HTMLDivElement>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)
  const marqueeResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const partnerTypes = PARTNER_LAYOUT.map((partner) => ({
    ...partner,
    title: t(`partnerships.${partner.key}Title`),
    text: t(`partnerships.${partner.key}Text`),
  }))

  const handleMarqueeTap = () => {
    const track = marqueeRef.current?.querySelector('.pp-marquee-track')
    if (!track) return
    track.classList.add('paused')
    if (marqueeResumeRef.current) clearTimeout(marqueeResumeRef.current)
    marqueeResumeRef.current = setTimeout(() => {
      track.classList.remove('paused')
    }, 3000)
  }

  // Hero auto-advance. The timeout is re-armed on every slide change, so a
  // manual pick gets a full dwell; it is suspended while hovered/focused and
  // disabled entirely for reduced motion.
  const heroPlaying = !reduceMotion && !heroHeld
  useEffect(() => {
    if (!heroPlaying) return
    const next = (currentSlide + 1) % HERO_IMAGES.length
    const id = window.setTimeout(() => setCurrentSlide(next), HERO_INTERVAL_MS)
    return () => window.clearTimeout(id)
  }, [heroPlaying, currentSlide])

  useEffect(
    () => () => {
      if (marqueeResumeRef.current) clearTimeout(marqueeResumeRef.current)
    },
    [],
  )

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(((index % HERO_IMAGES.length) + HERO_IMAGES.length) % HERO_IMAGES.length)
  }, [])

  const scrollToPartner = useCallback((index: number) => {
    if (!partnerRef.current) return
    const cards = partnerRef.current.querySelectorAll('.pp-card')
    const target = Math.max(0, Math.min(index, PARTNER_LAYOUT.length - 1))
    cards[target]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    setPartnerSlide(target)
  }, [])

  const handlePartnerScroll = () => {
    const rail = partnerRef.current
    if (!rail) return
    const first = rail.querySelector('.pp-card')
    if (!first) return
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap || '0') || 0
    const step = first.clientWidth + gap
    if (step > 0) {
      const index = Math.round(rail.scrollLeft / step)
      setPartnerSlide(Math.max(0, Math.min(index, PARTNER_LAYOUT.length - 1)))
    }
  }

  const onHeroKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goToSlide(currentSlide - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goToSlide(currentSlide + 1)
    }
  }

  const onCardsKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      scrollToPartner(partnerSlide - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      scrollToPartner(partnerSlide + 1)
    }
  }

  return (
    <div className="support-page partnerships-page">
      <SEO
        title={t('partnerships.pageTitle')}
        description="Become a partner with Expedition-Go Tours. Join Ghana's leading tourism platform as a tour operator, hotel, travel agent, content creator, or transport provider."
        keywords="Expedition-Go Tours partnership, Ghana tourism partnership, tour operator partnership Ghana, travel partner Ghana, become a supplier Ghana"
        jsonLd={[
          buildBreadcrumbSchema([
            { name: 'Home', url: 'https://www.expeditiongotours.com/' },
            { name: 'Partnerships', url: 'https://www.expeditiongotours.com/partnerships' },
          ]),
          buildOrganizationSchema(),
        ]}
      />

      {/* ===== Hero — lightened carousel behind a frosted glass panel ===== */}
      <section
        className="pp-hero"
        role="region"
        aria-roledescription="carousel"
        aria-label={t('footer.partnerships')}
        onKeyDown={onHeroKeyDown}
        onMouseEnter={() => setHeroHeld(true)}
        onMouseLeave={() => setHeroHeld(false)}
        onFocusCapture={() => setHeroHeld(true)}
        onBlurCapture={() => setHeroHeld(false)}
      >
        <div className="pp-hero-bg" aria-hidden="true">
          {HERO_IMAGES.map((img, index) => (
            <img
              key={img.src}
              src={img.src}
              alt=""
              width={img.width}
              height={img.height}
              className={index === currentSlide ? 'active' : ''}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : undefined}
              decoding="async"
            />
          ))}
          <div className="pp-hero-veil" />
        </div>

        <span className="pp-hero-orb pp-hero-orb--a" aria-hidden="true" />
        <span className="pp-hero-orb pp-hero-orb--b" aria-hidden="true" />

        <div className="pp-hero-panel pp-glass">
          <BackToHelpCentre requireOrigin className="pp-hero-back" />
          <p className="pp-eyebrow">{t('partnerships.eyebrow')}</p>
          <h1 className="pp-hero-title">{t('footer.partnerships')}</h1>
          <p className="pp-hero-sub">{t('company.partnershipsSubtitle')}</p>
          <div className="pp-hero-actions">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="pp-btn pp-btn--primary">
              <Mail size={16} aria-hidden="true" />
              {t('partnerships.partnerBtn')}
            </a>
            <Link to="/contact-us" className="pp-btn pp-btn--outline">
              {t('partnerships.contactBtn')}
            </Link>
          </div>
        </div>

        <div className="pp-hero-bar">
          <button
            type="button"
            className="pp-hero-control"
            onClick={() => goToSlide(currentSlide - 1)}
            aria-label={t('partnerships.prevImage')}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>

          <div className="pp-dots">
            {HERO_IMAGES.map((img, index) => (
              <button
                key={img.src}
                type="button"
                className="pp-dot"
                onClick={() => goToSlide(index)}
                aria-label={t('partnerships.goToSlide', { number: index + 1 })}
                aria-current={index === currentSlide ? 'true' : undefined}
              >
                <span className="pp-dot-mark" aria-hidden="true" />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="pp-hero-control"
            onClick={() => goToSlide(currentSlide + 1)}
            aria-label={t('partnerships.nextImage')}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className="pp-container">
        {/* ===== Why partner with us ===== */}
        <section className="pp-intro pp-glass" aria-labelledby="pp-intro-title">
          <h2 className="pp-intro-title" id="pp-intro-title">{t('partnerships.whyTitle')}</h2>
          <p className="pp-intro-text">{t('partnerships.whyText')}</p>
        </section>

        {/* ===== Partner moments gallery ===== */}
        <section className="pp-gallery" aria-labelledby="pp-gallery-title">
          <h2 className="pp-section-title" id="pp-gallery-title">{t('partnerships.galleryLabel')}</h2>
          <div className="pp-gallery-band">
            <div
              className="pp-marquee"
              ref={marqueeRef}
              onClick={handleMarqueeTap}
              aria-hidden="true"
            >
              <div className="pp-marquee-track">
                {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES].map((img, index) => (
                  <div key={index} className="pp-marquee-item">
                    <img
                      src={img.src}
                      alt=""
                      width={img.width}
                      height={img.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== Who we work with ===== */}
        <section className="pp-who" aria-labelledby="pp-who-title">
          <h2 className="pp-section-title" id="pp-who-title">{t('partnerships.whoTitle')}</h2>
          <div
            className="pp-cards"
            ref={partnerRef}
            onScroll={handlePartnerScroll}
            onKeyDown={onCardsKeyDown}
            role="group"
            aria-roledescription="carousel"
            aria-label={t('partnerships.whoTitle')}
          >
            {partnerTypes.map((partner) => {
              const Icon = partner.Icon
              return (
                <article key={partner.title} className="pp-card pp-glass">
                  <div className="pp-card-media">
                    <img
                      src={partner.image}
                      alt=""
                      aria-hidden="true"
                      width={partner.width}
                      height={partner.height}
                      style={{ objectPosition: partner.focus }}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="pp-card-body">
                    <span className="pp-card-icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <h3 className="pp-card-title">{partner.title}</h3>
                    <p className="pp-card-text">{partner.text}</p>
                    <Link to={partner.to} className="pp-card-btn">
                      {t('partnerships.getStarted')}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="pp-dots">
            {partnerTypes.map((partner, index) => (
              <button
                key={partner.title}
                type="button"
                className="pp-dot"
                onClick={() => scrollToPartner(index)}
                aria-label={t('partnerships.goToSlide', { number: index + 1 })}
                aria-current={index === partnerSlide ? 'true' : undefined}
              >
                <span className="pp-dot-mark" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        {/* ===== Let's talk ===== */}
        <section className="pp-cta" aria-labelledby="pp-cta-title">
          <span className="pp-cta-orb pp-cta-orb--a" aria-hidden="true" />
          <span className="pp-cta-orb pp-cta-orb--b" aria-hidden="true" />
          <div className="pp-cta-content">
            <h2 className="pp-cta-title" id="pp-cta-title">{t('partnerships.letsTalk')}</h2>
            <p className="pp-cta-text">{t('partnerships.talkText')}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="pp-cta-mail">
              <Mail size={15} aria-hidden="true" />
              {SUPPORT_EMAIL}
            </a>
            <div className="pp-cta-actions">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="pp-btn pp-btn--primary">
                {t('partnerships.partnerBtn')}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link to="/contact-us" className="pp-btn pp-btn--outline">
                {t('partnerships.contactBtn')}
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
