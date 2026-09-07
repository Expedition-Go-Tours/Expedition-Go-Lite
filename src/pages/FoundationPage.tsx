import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Users, User, Heart, Folder, Handshake, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Footer from '../components/Footer'
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

const HERO_IMAGES = [help1, help2, help3, help4, help5]

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.12 } },
}

export default function FoundationPage() {
  const { t } = useTranslation()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [areasSlide, setAreasSlide] = useState(0)
  const [gallerySlide, setGallerySlide] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const areasRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = t('foundation.pageTitle')
  }, [t])

  const CORE_AREAS = [
    { Icon: Users, title: t('foundation.area1Title'), subtitle: t('foundation.area1Subtitle'), description: t('foundation.area1Desc') },
    { Icon: Heart, title: t('foundation.area2Title'), subtitle: t('foundation.area2Subtitle'), description: t('foundation.area2Desc') },
    { Icon: Folder, title: t('foundation.area3Title'), subtitle: t('foundation.area3Subtitle'), description: t('foundation.area3Desc') },
    { Icon: Handshake, title: t('foundation.area4Title'), subtitle: t('foundation.area4Subtitle'), description: t('foundation.area4Desc') },
  ]

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length)
    }, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const goToSlide = (index: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCurrentSlide(index)
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length)
    }, 5000)
  }

  const prevSlide = () => goToSlide((currentSlide - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)
  const nextSlide = () => goToSlide((currentSlide + 1) % HERO_IMAGES.length)

  const scrollToArea = (index: number) => {
    if (!areasRef.current) return
    const cards = areasRef.current.querySelectorAll('.foundation-area-card')
    if (cards[index]) { cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); setAreasSlide(index) }
  }

  const handleAreasScroll = () => {
    if (!areasRef.current) return
    const cardWidth = areasRef.current.querySelector('.foundation-area-card')?.clientWidth || 0
    if (cardWidth > 0) { const index = Math.round(areasRef.current.scrollLeft / (cardWidth + 16)); setAreasSlide(Math.min(index, CORE_AREAS.length - 1)) }
  }

  const GALLERY_IMAGES = [help6, help7, help8, help9]

  const scrollToGallery = (index: number) => {
    if (!galleryRef.current) return
    const items = galleryRef.current.querySelectorAll('.foundation-gallery-item')
    if (items[index]) { items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); setGallerySlide(index) }
  }

  const handleGalleryScroll = () => {
    if (!galleryRef.current) return
    const itemWidth = galleryRef.current.querySelector('.foundation-gallery-item')?.clientWidth || 0
    if (itemWidth > 0) { const index = Math.round(galleryRef.current.scrollLeft / (itemWidth + 16)); setGallerySlide(Math.min(index, GALLERY_IMAGES.length - 1)) }
  }

  return (
    <div className="foundation-page">
      <section className="foundation-hero">
        <div className="foundation-hero-carousel">
          {HERO_IMAGES.map((img, index) => (
            <div key={index} className={`foundation-hero-slide ${index === currentSlide ? 'active' : ''}`}>
              <img src={img} alt="" aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="foundation-hero-overlay" />
        <button className="foundation-hero-nav foundation-hero-nav--prev" onClick={prevSlide} aria-label={t('foundation.prevImage')}>
          <ChevronLeft size={28} />
        </button>
        <button className="foundation-hero-nav foundation-hero-nav--next" onClick={nextSlide} aria-label={t('foundation.nextImage')}>
          <ChevronRight size={28} />
        </button>
        <div className="foundation-hero-dots">
          {HERO_IMAGES.map((_, index) => (
            <button key={index} className={`foundation-hero-dot ${index === currentSlide ? 'active' : ''}`} onClick={() => goToSlide(index)} aria-label={t('foundation.goToSlide', { number: index + 1 })} />
          ))}
        </div>
        <motion.div className="foundation-hero-content" initial="hidden" animate="visible" variants={fadeUp}>
          <p className="foundation-hero-label">{t('foundation.heroLabel')}</p>
          <h1 className="foundation-hero-title">{t('foundation.heroTitle')}</h1>
        </motion.div>
      </section>

      <section className="foundation-mission">
        <motion.div className="foundation-mission-content" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <div className="foundation-mission-icon"><Heart size={32} /></div>
          <h2 className="foundation-mission-title">{t('foundation.missionTitle')}</h2>
          <p className="foundation-mission-text">{t('foundation.missionText1')}</p>
          <p className="foundation-mission-text" dangerouslySetInnerHTML={{ __html: t('foundation.missionText2') }} />
          <p className="foundation-mission-text foundation-mission-highlight">{t('foundation.missionHighlight')}</p>
          <p className="foundation-mission-text foundation-mission-cta-text">{t('foundation.missionCta')}</p>
        </motion.div>
      </section>

      <section className="foundation-areas">
        <motion.div className="foundation-areas-header" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <p className="foundation-section-label">{t('foundation.howWeHelp')}</p>
          <h2 className="foundation-section-title">{t('foundation.focusAreas')}</h2>
        </motion.div>
        <motion.div className="foundation-areas-grid" ref={areasRef} onScroll={handleAreasScroll} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          {CORE_AREAS.map((area) => (
            <motion.div key={area.title} className="foundation-area-card" variants={fadeUp}>
              <div className="foundation-area-icon"><area.Icon size={24} /></div>
              <h3 className="foundation-area-title">{area.title}</h3>
              <p className="foundation-area-subtitle">{area.subtitle}</p>
              <p className="foundation-area-description">{area.description}</p>
            </motion.div>
          ))}
        </motion.div>
        <div className="foundation-areas-dots">
          {CORE_AREAS.map((_, index) => (
            <button key={index} className={`foundation-areas-dot ${index === areasSlide ? 'active' : ''}`} onClick={() => scrollToArea(index)} aria-label={t('foundation.goToSlide', { number: index + 1 })} />
          ))}
        </div>
      </section>

      <section className="foundation-help">
        <motion.div className="foundation-help-header" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <p className="foundation-section-label">{t('foundation.needSupport')}</p>
          <h2 className="foundation-section-title">{t('foundation.requestHelp')}</h2>
          <p className="foundation-help-intro">{t('foundation.helpIntro')}</p>
        </motion.div>
        <motion.div className="foundation-help-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          <motion.div className="foundation-help-card" variants={fadeUp}>
            <div className="foundation-help-card-image">
              <img src={help7} alt={t('foundation.area1Title')} />
              <div className="foundation-help-card-overlay" />
            </div>
            <div className="foundation-help-card-content">
              <div className="foundation-area-icon"><User size={24} /></div>
              <h3 className="foundation-area-title">{t('foundation.forIndividuals')}</h3>
              <p className="foundation-area-subtitle">{t('foundation.individualSubtitle')}</p>
              <p className="foundation-area-description">{t('foundation.individualDesc')}</p>
              <Link to="/contact-us" className="foundation-btn foundation-btn--primary">{t('foundation.requestHelpBtn')}<ArrowRight size={18} /></Link>
            </div>
          </motion.div>
          <motion.div className="foundation-help-card" variants={fadeUp}>
            <div className="foundation-help-card-image">
              <img src={help8} alt={t('foundation.area2Title')} />
              <div className="foundation-help-card-overlay" />
            </div>
            <div className="foundation-help-card-content">
              <div className="foundation-area-icon"><Users size={24} /></div>
              <h3 className="foundation-area-title">{t('foundation.forCommunities')}</h3>
              <p className="foundation-area-subtitle">{t('foundation.communitySubtitle')}</p>
              <p className="foundation-area-description">{t('foundation.communityDesc')}</p>
              <Link to="/contact-us" className="foundation-btn foundation-btn--primary">{t('foundation.getSupport')}<ArrowRight size={18} /></Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="foundation-gallery">
        <motion.div className="foundation-gallery-header" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <p className="foundation-section-label">{t('foundation.ourImpact')}</p>
          <h2 className="foundation-section-title">{t('foundation.impactTitle')}</h2>
        </motion.div>
        <motion.div className="foundation-gallery-grid" ref={galleryRef} onScroll={handleGalleryScroll} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          <motion.div className="foundation-gallery-item" variants={fadeUp}>
            <img src={help6} alt={t('foundation.galleryCaption1')} />
            <div className="foundation-gallery-caption">{t('foundation.galleryCaption1')}</div>
          </motion.div>
          <motion.div className="foundation-gallery-item" variants={fadeUp}>
            <img src={help7} alt={t('foundation.galleryCaption2')} />
            <div className="foundation-gallery-caption">{t('foundation.galleryCaption2')}</div>
          </motion.div>
          <motion.div className="foundation-gallery-item" variants={fadeUp}>
            <img src={help8} alt={t('foundation.galleryCaption3')} />
            <div className="foundation-gallery-caption">{t('foundation.galleryCaption3')}</div>
          </motion.div>
          <motion.div className="foundation-gallery-item" variants={fadeUp}>
            <img src={help9} alt={t('foundation.galleryCaption4')} />
            <div className="foundation-gallery-caption">{t('foundation.galleryCaption4')}</div>
          </motion.div>
        </motion.div>
        <div className="foundation-gallery-dots">
          {GALLERY_IMAGES.map((_, index) => (
            <button key={index} className={`foundation-gallery-dot ${index === gallerySlide ? 'active' : ''}`} onClick={() => scrollToGallery(index)} aria-label={t('foundation.goToSlide', { number: index + 1 })} />
          ))}
        </div>
      </section>

      <section className="foundation-volunteer">
        <motion.div className="foundation-volunteer-content" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <p className="foundation-section-label">{t('foundation.getInvolved')}</p>
          <h2 className="foundation-volunteer-title">{t('foundation.volunteerTitle')}</h2>
          <p className="foundation-volunteer-subtitle">{t('foundation.volunteerSubtitle')}</p>
          <p className="foundation-volunteer-text">{t('foundation.volunteerDesc')}</p>
          <Link to="/contact-us" className="foundation-btn foundation-btn--primary">{t('foundation.volunteerBtn')}<ArrowRight size={18} /></Link>
        </motion.div>
        <motion.div className="foundation-volunteer-image" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <img src={help9} alt={t('foundation.volunteerTitle')} />
        </motion.div>
      </section>

      <section className="foundation-cta">
        <div className="foundation-cta-bg" />
        <motion.div className="foundation-cta-content" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={fadeUp}>
          <h2 className="foundation-cta-title">{t('foundation.ctaTitle')}</h2>
          <p className="foundation-cta-text">{t('foundation.ctaText')}</p>
          <div className="foundation-cta-buttons">
            <Link to="/contact-us" className="foundation-btn foundation-btn--white">{t('foundation.ctaGetInvolved')}<ArrowRight size={18} /></Link>
            <Link to="/about-us" className="foundation-btn foundation-btn--outline">{t('foundation.ctaLearnMore')}</Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
