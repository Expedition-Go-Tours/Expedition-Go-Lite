import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, type Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Folder,
  Handshake,
  Heart,
  User,
  Users,
} from 'lucide-react'
import Footer from '../components/Footer'
import SEO, { buildBreadcrumbSchema, buildOrganizationSchema } from '../components/SEO'
import SwipeCarousel from '../components/SwipeCarousel'
import ImageLightbox, { type GalleryImage } from '../components/gallery/ImageLightbox'
import useMediaQuery from '../hooks/useMediaQuery'
import help1 from '../assets/foundation/help1.avif'
import help2 from '../assets/foundation/help2.avif'
import help3 from '../assets/foundation/help3.avif'
import help4 from '../assets/foundation/help4.avif'
import help5 from '../assets/foundation/help5.avif'
import help6 from '../assets/foundation/help6.avif'
import help7 from '../assets/foundation/help7.avif'
import help8 from '../assets/foundation/help8.avif'
import help9 from '../assets/foundation/help9.avif'
import './FoundationPage.css'

const HERO_IMAGES = [
  { src: help1, width: 830, height: 624 },
  { src: help2, width: 801, height: 624 },
  { src: help3, width: 702, height: 624 },
  { src: help4, width: 777, height: 624 },
  { src: help5, width: 841, height: 421 },
]

const GALLERY_IMAGES = [
  { src: help6, key: 'galleryCaption1', width: 841, height: 600 },
  { src: help7, key: 'galleryCaption2', width: 841, height: 520 },
  { src: help8, key: 'galleryCaption3', width: 841, height: 492 },
  { src: help9, key: 'galleryCaption4', width: 841, height: 569 },
]

const HELP_CARD_IMAGES = [
  { src: help7, width: 841, height: 520 },
  { src: help8, width: 841, height: 492 },
]

const VOLUNTEER_IMAGE = { src: help9, width: 841, height: 569 }

const AUTOPLAY_MS = 6500

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.1 } },
}

export default function FoundationPage() {
  const { t } = useTranslation()
  const isMobile = useMediaQuery('(max-width: 900px)')
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const [currentSlide, setCurrentSlide] = useState(0)
  const [cycleKey, setCycleKey] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)
  const [heroInView, setHeroInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const heroRef = useRef<HTMLElement>(null)
  const touchStartX = useRef<number | null>(null)

  const CORE_AREAS = [
    { Icon: Users, title: t('foundation.area1Title'), subtitle: t('foundation.area1Subtitle'), description: t('foundation.area1Desc') },
    { Icon: Heart, title: t('foundation.area2Title'), subtitle: t('foundation.area2Subtitle'), description: t('foundation.area2Desc') },
    { Icon: Folder, title: t('foundation.area3Title'), subtitle: t('foundation.area3Subtitle'), description: t('foundation.area3Desc') },
    { Icon: Handshake, title: t('foundation.area4Title'), subtitle: t('foundation.area4Subtitle'), description: t('foundation.area4Desc') },
  ]

  const gallery = useMemo<GalleryImage[]>(
    () =>
      GALLERY_IMAGES.map((img) => ({
        src: img.src,
        alt: t(`foundation.${img.key}`),
        width: img.width,
        height: img.height,
      })),
    [t],
  )

  const openLightbox = useCallback(
    (src: string) => {
      const index = gallery.findIndex((img) => img.src === src)
      if (index !== -1) setLightboxIndex(index)
    },
    [gallery],
  )

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const navigateLightbox = useCallback(
    (delta: number) => {
      setLightboxIndex((index) =>
        index === null ? index : (index + delta + gallery.length) % gallery.length,
      )
    },
    [gallery.length],
  )

  /* Autoplay only while the hero is on screen, the page is visible, the
     pointer/keyboard is away, and the user has not asked for reduced motion. */
  useEffect(() => {
    const node = heroRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      { threshold: 0.25 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (reduceMotion || heroPaused || !heroInView || !pageVisible) return
    const id = window.setInterval(
      () => setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length),
      AUTOPLAY_MS,
    )
    return () => window.clearInterval(id)
  }, [reduceMotion, heroPaused, heroInView, pageVisible, cycleKey])

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index)
    setCycleKey((key) => key + 1)
  }, [])

  const stepSlide = useCallback(
    (delta: number) => {
      setCurrentSlide((prev) => (prev + delta + HERO_IMAGES.length) % HERO_IMAGES.length)
      setCycleKey((key) => key + 1)
    },
    [],
  )

  const areaCards = CORE_AREAS.map((area) => (
    <div key={area.title} className="foundation-area-card foundation-glass">
      <div className="foundation-area-icon" aria-hidden="true">
        <area.Icon size={24} />
      </div>
      <h3 className="foundation-area-title">{area.title}</h3>
      <p className="foundation-area-subtitle">{area.subtitle}</p>
      <p className="foundation-area-description">{area.description}</p>
    </div>
  ))

  const galleryTiles = GALLERY_IMAGES.map((img) => (
    <button
      key={img.key}
      type="button"
      className="foundation-gallery-item"
      onClick={() => openLightbox(img.src)}
    >
      <img
        src={img.src}
        alt={t(`foundation.${img.key}`)}
        width={img.width}
        height={img.height}
        loading={isMobile ? 'eager' : 'lazy'}
        decoding="async"
      />
      <span className="foundation-gallery-caption">{t(`foundation.${img.key}`)}</span>
    </button>
  ))

  const helpCards = [
    {
      key: 'individual',
      image: HELP_CARD_IMAGES[0],
      Icon: User,
      title: t('foundation.forIndividuals'),
      subtitle: t('foundation.individualSubtitle'),
      description: t('foundation.individualDesc'),
      action: t('foundation.requestHelpBtn'),
    },
    {
      key: 'community',
      image: HELP_CARD_IMAGES[1],
      Icon: Users,
      title: t('foundation.forCommunities'),
      subtitle: t('foundation.communitySubtitle'),
      description: t('foundation.communityDesc'),
      action: t('foundation.getSupport'),
    },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <div className="foundation-page">
        <SEO
          title={t('foundation.pageTitle')}
          description="The Expedition-Go Tours Foundation supports communities across Ghana through education, healthcare, environmental conservation, and sustainable tourism initiatives."
          keywords="Expedition-Go Tours Foundation, Ghana community support, sustainable tourism Ghana, travel foundation Ghana, community impact Ghana"
          jsonLd={[
            buildBreadcrumbSchema([
              { name: 'Home', url: 'https://www.expeditiongotours.com/' },
              { name: 'Foundation', url: 'https://www.expeditiongotours.com/foundation' },
            ]),
            buildOrganizationSchema(),
          ]}
        />

        {/* ===== Hero — rotating photo backdrop behind a glass panel ===== */}
        <section
          ref={heroRef}
          className="foundation-hero"
          aria-roledescription="carousel"
          aria-label={t('foundation.heroLabel')}
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          onFocus={() => setHeroPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeroPaused(false)
          }}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current
            touchStartX.current = null
            if (start == null) return
            const end = e.changedTouches[0]?.clientX ?? start
            const dx = end - start
            if (Math.abs(dx) > 48) stepSlide(dx > 0 ? -1 : 1)
          }}
        >
          <div className="foundation-hero-carousel" aria-hidden="true">
            {HERO_IMAGES.map((img, index) => (
              <div
                key={index}
                className={`foundation-hero-slide${index === currentSlide ? ' active' : ''}`}
              >
                <img
                  src={img.src}
                  alt=""
                  width={img.width}
                  height={img.height}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : undefined}
                  decoding="async"
                />
              </div>
            ))}
          </div>
          <div className="foundation-hero-veil" aria-hidden="true" />
          <span className="foundation-hero-orb foundation-hero-orb--a" aria-hidden="true" />
          <span className="foundation-hero-orb foundation-hero-orb--b" aria-hidden="true" />

          <motion.div
            className="foundation-hero-panel foundation-glass"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <p className="foundation-hero-label">
              <span className="foundation-hero-label-dot" aria-hidden="true" />
              {t('foundation.heroLabel')}
            </p>
            <h1 className="foundation-hero-title">{t('foundation.heroTitle')}</h1>
          </motion.div>

          <div className="foundation-hero-dots">
            {HERO_IMAGES.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`foundation-hero-dot${index === currentSlide ? ' active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={t('foundation.goToSlide', { number: index + 1 })}
                aria-current={index === currentSlide ? 'true' : undefined}
              >
                <span className="foundation-hero-dot-mark" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <div className="foundation-shell">
          {/* ===== Mission ===== */}
          <motion.section
            className="foundation-mission"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <div className="foundation-mission-panel foundation-glass">
              <div className="foundation-mission-icon" aria-hidden="true">
                <Heart size={30} />
              </div>
              <h2 className="foundation-mission-title">{t('foundation.missionTitle')}</h2>
              <p className="foundation-mission-text">{t('foundation.missionText1')}</p>
              <p
                className="foundation-mission-text"
                dangerouslySetInnerHTML={{ __html: t('foundation.missionText2') }}
              />
              <p className="foundation-mission-text foundation-mission-highlight">
                {t('foundation.missionHighlight')}
              </p>
              <p className="foundation-mission-text foundation-mission-cta-text">
                {t('foundation.missionCta')}
              </p>
            </div>
          </motion.section>

          {/* ===== Focus areas ===== */}
          <motion.section
            className="foundation-areas"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div className="foundation-section-head" variants={fadeUp}>
              <p className="foundation-section-label">{t('foundation.howWeHelp')}</p>
              <h2 className="foundation-section-title">{t('foundation.focusAreas')}</h2>
            </motion.div>

            {isMobile ? (
              <SwipeCarousel
                label={t('foundation.focusAreas')}
                slides={areaCards}
                className="foundation-swipe"
              />
            ) : (
              <div className="foundation-areas-grid">{areaCards}</div>
            )}
          </motion.section>

          {/* ===== Request for help ===== */}
          <motion.section
            className="foundation-help"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div className="foundation-section-head" variants={fadeUp}>
              <p className="foundation-section-label">{t('foundation.needSupport')}</p>
              <h2 className="foundation-section-title">{t('foundation.requestHelp')}</h2>
              <p className="foundation-help-intro">{t('foundation.helpIntro')}</p>
            </motion.div>

            <div className="foundation-help-grid">
              {helpCards.map((card) => (
                <motion.article
                  key={card.key}
                  className="foundation-help-card foundation-glass"
                  variants={fadeUp}
                >
                  <div className="foundation-help-card-image">
                    <img
                      src={card.image.src}
                      alt={card.title}
                      width={card.image.width}
                      height={card.image.height}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="foundation-help-card-scrim" aria-hidden="true" />
                  </div>
                  <div className="foundation-help-card-content">
                    <div className="foundation-area-icon" aria-hidden="true">
                      <card.Icon size={24} />
                    </div>
                    <h3 className="foundation-area-title">{card.title}</h3>
                    <p className="foundation-area-subtitle">{card.subtitle}</p>
                    <p className="foundation-area-description">{card.description}</p>
                    <Link to="/contact-us" className="foundation-btn foundation-btn--primary">
                      {card.action}
                      <ArrowRight size={17} aria-hidden="true" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.section>

          {/* ===== Impact gallery ===== */}
          <motion.section
            className="foundation-gallery"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div className="foundation-section-head" variants={fadeUp}>
              <p className="foundation-section-label">{t('foundation.ourImpact')}</p>
              <h2 className="foundation-section-title">{t('foundation.impactTitle')}</h2>
            </motion.div>

            {isMobile ? (
              <SwipeCarousel
                label={t('foundation.impactTitle')}
                slides={galleryTiles}
                className="foundation-swipe"
              />
            ) : (
              <div className="foundation-gallery-grid">{galleryTiles}</div>
            )}
          </motion.section>

          {/* ===== Volunteer ===== */}
          <motion.section
            className="foundation-volunteer"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div className="foundation-volunteer-panel foundation-glass" variants={fadeUp}>
              <p className="foundation-section-label">{t('foundation.getInvolved')}</p>
              <h2 className="foundation-volunteer-title">{t('foundation.volunteerTitle')}</h2>
              <p className="foundation-volunteer-subtitle">{t('foundation.volunteerSubtitle')}</p>
              <p className="foundation-volunteer-text">{t('foundation.volunteerDesc')}</p>
              <Link to="/contact-us" className="foundation-btn foundation-btn--primary">
                {t('foundation.volunteerBtn')}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </motion.div>

            <motion.div className="foundation-volunteer-image" variants={fadeUp}>
              <img
                src={VOLUNTEER_IMAGE.src}
                alt={t('foundation.volunteerTitle')}
                width={VOLUNTEER_IMAGE.width}
                height={VOLUNTEER_IMAGE.height}
                loading="lazy"
                decoding="async"
              />
              <span className="foundation-volunteer-badge foundation-glass">
                <Heart size={16} aria-hidden="true" />
                {t('foundation.volunteerSubtitle')}
              </span>
            </motion.div>
          </motion.section>

          {/* ===== CTA ===== */}
          <motion.section
            className="foundation-cta"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
          >
            <span className="foundation-cta-orb foundation-cta-orb--a" aria-hidden="true" />
            <span className="foundation-cta-orb foundation-cta-orb--b" aria-hidden="true" />
            <div className="foundation-cta-content">
              <h2 className="foundation-cta-title">{t('foundation.ctaTitle')}</h2>
              <p className="foundation-cta-text">{t('foundation.ctaText')}</p>
              <div className="foundation-cta-buttons">
                <Link to="/contact-us" className="foundation-btn foundation-btn--primary">
                  {t('foundation.ctaGetInvolved')}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link to="/about-us" className="foundation-btn foundation-btn--outline">
                  {t('foundation.ctaLearnMore')}
                </Link>
              </div>
            </div>
          </motion.section>
        </div>

        <AnimatePresence>
          {lightboxIndex !== null && (
            <ImageLightbox
              images={gallery}
              index={lightboxIndex}
              onClose={closeLightbox}
              onNavigate={navigateLightbox}
            />
          )}
        </AnimatePresence>

        <Footer />
      </div>
    </MotionConfig>
  )
}
