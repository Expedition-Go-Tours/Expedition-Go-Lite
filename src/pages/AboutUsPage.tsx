import { useEffect, useState, useCallback, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X, Compass, Users, ShieldCheck, BadgeDollarSign, Headset, ArrowRight } from 'lucide-react'
import Footer from '../components/Footer'
import heroImg1 from '../assets/Image01.webp'
import heroImg2 from '../assets/Image02.webp'
import heroImg3 from '../assets/Image03.webp'
import heroImg4 from '../assets/Image04.webp'
import cardTour from '../assets/images/painting.webp'
import cardActivity from '../assets/images/QuadBiking.webp'
import cardTransport from '../assets/images/IMG_3538.webp'
import cardAkosombo from '../assets/Akosombo.jpg'
import extraTraditional from '../assets/traditional.png'
import extraCaption from '../assets/caption.jpg'
import extraEc from '../assets/ec.jpg'
import extraScenic from '../assets/images/IMG_3538.webp'
import './AboutUsPage.css'

const CARD_CATEGORIES = [
  { label: 'tour', image: cardTour, tilt: 'about-floating-card--tilt-left' },
  { label: 'activity', image: cardActivity, tilt: '' },
  { label: 'transport', image: cardTransport, tilt: '' },
  { label: 'akosombo', image: cardAkosombo, tilt: 'about-floating-card--tilt-right' },
]

const STORY_IMAGES = [
  { src: extraTraditional, alt: 'Traditional experience' },
  { src: extraCaption, alt: 'Caption moment' },
  { src: extraEc, alt: 'EC experience' },
  { src: extraScenic, alt: 'Scenic view' },
]

const HERO_IMAGES = [heroImg1, heroImg2, heroImg3, heroImg4]

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.12 } },
}

function useIsMobile(query = '(max-width: 900px)') {
  // useSyncExternalStore is the linter- and production-approved way to track a
  // matchMedia query (no sync setState-in-effect, correct SSR/hydration).
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', callback)
      return () => mq.removeEventListener('change', callback)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * Touch-driven horizontal swipe carousel (mobile only). Uses the same
 * translateX-track + touch handler pattern as the TourCard image carousel:
 * vertical page scrolling is preserved (touch-action: pan-y) while horizontal
 * swipes step one card at a time — no native scroll/snap quirks.
 */
function SwipeCarousel({ slides, ariaLabel }: { slides: ReactNode[]; ariaLabel: string }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const swipeGuard = useRef(false)
  const count = slides.length

  // Reset to the first slide whenever the slide set changes.
  const slidesKey = String(count)
  const [prevKey, setPrevKey] = useState(slidesKey)
  if (prevKey !== slidesKey) {
    setPrevKey(slidesKey)
    setIndex(0)
  }

  useEffect(() => {
    const track = trackRef.current
    const first = track?.firstElementChild as HTMLElement | null
    if (!track || !first) return
    // Card width + the track's 14px gap (kept in sync with .about-swipe CSS).
    const step = first.offsetWidth + 14
    track.style.transform = `translateX(${-index * step}px)`
  }, [index, count])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start == null) return
    const end = e.changedTouches[0]?.clientX ?? start
    const dx = end - start
    if (Math.abs(dx) > 40) {
      // A swipe ends with a click — suppress the resulting card tap so a
      // photo swipe doesn't open the focus overlay (same as TourCard).
      swipeGuard.current = true
      window.setTimeout(() => { swipeGuard.current = false }, 600)
      // Wrap around: swiping past the last card loops back to the first
      // (and vice versa), so the carousel never gets stuck at the ends.
      setIndex((i) => (dx > 0 ? (i - 1 + count) % count : (i + 1) % count))
    }
  }

  return (
    <div
      className="about-swipe"
      aria-label={ariaLabel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClickCapture={(e) => {
        if (swipeGuard.current) {
          e.stopPropagation()
          e.preventDefault()
          swipeGuard.current = false
        }
      }}
    >
      <div ref={trackRef} className="about-swipe-track">
        {slides.map((slide, i) => (
          <div key={i} className="about-swipe-slide">{slide}</div>
        ))}
      </div>
      {count > 1 && (
        <div className="about-swipe-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`about-swipe-dot${i === index ? ' active' : ''}`}
              aria-label={t('about.goToSlide', { number: i + 1 })}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AboutUsPage() {
  const { t } = useTranslation()
  const [focusedImg, setFocusedImg] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const closeFocused = useCallback(() => setFocusedImg(null), [])

  const VALUES = [
    {
      Icon: Compass,
      title: t('about.value1Title'),
      text: t('about.value1Text'),
    },
    {
      Icon: Users,
      title: t('about.value2Title'),
      text: t('about.value2Text'),
    },
    {
      Icon: ShieldCheck,
      title: t('about.value3Title'),
      text: t('about.value3Text'),
    },
    {
      Icon: BadgeDollarSign,
      title: t('about.value4Title'),
      text: t('about.value4Text'),
    },
    {
      Icon: Headset,
      title: t('about.value5Title'),
      text: t('about.value5Text'),
    },
  ]

  useEffect(() => {
    if (!focusedImg) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFocused()
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
    }
  }, [focusedImg, closeFocused])

  useEffect(() => {
    document.title = `${t('footer.aboutUs')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="about-page">

      {/* ===== Hero with Moving Images ===== */}
      <div className="about-hero">
        <div className="about-hero-bg">
          <div className="about-hero-bg-track">
            {[...HERO_IMAGES, ...HERO_IMAGES].map((img, i) => (
              <img key={i} src={img} alt="" aria-hidden="true" />
            ))}
          </div>
        </div>

        <motion.div
          className="about-hero-content"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <p className="about-hero-label">{t('about.heroLabel')}</p>
          <h1 className="about-hero-title">{t('about.heroTitle')}</h1>
          <p className="about-hero-subtitle">{t('company.aboutUsSubtitle')}</p>
        </motion.div>
      </div>

      {/* ===== Our Story + Cards ===== */}
      <div className="about-container">
        <motion.div
          className="about-story"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.div className="about-story-text" variants={fadeUp}>
            <p className="about-story-label">{t('about.storyLabel')}</p>
            <h2 className="about-story-heading">
              {t('about.storyTitle')}
            </h2>
            <p className="about-story-body">
              {t('about.storyText1')}
            </p>
            <p className="about-story-body">
              {t('about.storyText2')}
            </p>
          </motion.div>

          {isMobile ? (
            <SwipeCarousel
              ariaLabel={t('about.storyLabel')}
              slides={STORY_IMAGES.map((img) => (
                <div
                  key={img.alt}
                  className="about-story-img-item about-img-tap"
                  role="button"
                  tabIndex={0}
                  onClick={() => setFocusedImg(img.src)}
                  onKeyDown={(e) => e.key === 'Enter' && setFocusedImg(img.src)}
                >
                  <img src={img.src} alt={img.alt} />
                </div>
              ))}
            />
          ) : (
            <motion.div className="about-story-images" variants={stagger}>
              {STORY_IMAGES.map((img) => (
                <motion.div
                  key={img.alt}
                  className="about-story-img-item about-img-tap"
                  variants={fadeUp}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFocusedImg(img.src)}
                  onKeyDown={(e) => e.key === 'Enter' && setFocusedImg(img.src)}
                >
                  <img src={img.src} alt={img.alt} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* ===== Feature Callout + Cards ===== */}
        <motion.div
          className="about-callout"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.div className="about-callout-text" variants={fadeUp}>
            <h2 className="about-callout-heading">
              {t('about.calloutHeading')}
            </h2>
            <p className="about-callout-body">
              {t('about.calloutBody')}
            </p>
          </motion.div>

          {isMobile ? (
            <SwipeCarousel
              ariaLabel={t('about.categoriesLabel')}
              slides={CARD_CATEGORIES.map((cat) => (
                <div
                  key={`callout-${cat.label}`}
                  className={`about-floating-card ${cat.tilt} about-img-tap`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFocusedImg(cat.image)}
                  onKeyDown={(e) => e.key === 'Enter' && setFocusedImg(cat.image)}
                >
                  <div className="about-floating-card-img">
                    <img src={cat.image} alt={cat.label} />
                  </div>
                </div>
              ))}
            />
          ) : (
            <motion.div className="about-callout-cards" variants={stagger}>
              {CARD_CATEGORIES.map((cat) => (
                <motion.div
                  key={`callout-${cat.label}`}
                  className={`about-floating-card ${cat.tilt} about-img-tap`}
                  variants={fadeUp}
                  role="button"
                  tabIndex={0}
                  onClick={() => setFocusedImg(cat.image)}
                  onKeyDown={(e) => e.key === 'Enter' && setFocusedImg(cat.image)}
                >
                  <div className="about-floating-card-img">
                    <img src={cat.image} alt={cat.label} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* ===== Values ===== */}
        <motion.div
          className="about-values"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <p className="about-section-label">{t('about.valuesLabel')}</p>
            <h2 className="about-section-title">{t('about.valuesTitle')}</h2>
          </motion.div>

          {isMobile ? (
            <SwipeCarousel
              ariaLabel={t('about.valuesTitle')}
              slides={VALUES.map((value) => (
                <div key={value.title} className="about-value-card">
                  <div className="about-value-icon">
                    <value.Icon size={22} />
                  </div>
                  <h3 className="about-value-title">{value.title}</h3>
                  <p className="about-value-text">{value.text}</p>
                </div>
              ))}
            />
          ) : (
            <motion.div className="about-values-grid" variants={stagger}>
              {VALUES.map((value) => (
                <motion.div key={value.title} className="about-value-card" variants={fadeUp}>
                  <div className="about-value-icon">
                    <value.Icon size={22} />
                  </div>
                  <h3 className="about-value-title">{value.title}</h3>
                  <p className="about-value-text">{value.text}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* ===== CTA ===== */}
        <motion.div
          className="about-cta"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <div className="about-dot-pattern about-dot-pattern--1" />
          <div className="about-dot-pattern about-dot-pattern--2" />
          <div className="about-cta-content">
            <h2 className="about-cta-title">{t('about.ctaTitle')}</h2>
            <div className="about-cta-actions">
              <Link to="/tours" className="about-btn about-btn--primary">
                {t('about.ctaBrowse')}
                <ArrowRight size={16} />
              </Link>
              <Link to="/contact-us" className="about-btn about-btn--secondary">
                {t('about.ctaContact')}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== Focused Card Overlay ===== */}
      <AnimatePresence>
        {focusedImg && (
          <motion.div
            className="about-focus-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeFocused}
          >
            <button
              type="button"
              className="about-focus-close"
              onClick={closeFocused}
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <motion.div
              className="about-focus-card"
              initial={{ scale: 0.8, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 40, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={focusedImg} alt="" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
