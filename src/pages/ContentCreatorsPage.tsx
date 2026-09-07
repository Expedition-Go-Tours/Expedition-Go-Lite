import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { DollarSign, Zap, Heart } from 'lucide-react'
import content1 from '../assets/content-creators/content1.avif'
import content2 from '../assets/content-creators/content2.avif'
import content3 from '../assets/content-creators/content3.avif'
import content4 from '../assets/content-creators/content4.avif'
import content5 from '../assets/content-creators/content5.avif'
import content6 from '../assets/content-creators/content6.avif'
import content7 from '../assets/content-creators/content7.avif'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuthUser } from '../hooks/useAuthUser'
import { setAuthReturnTo } from '../lib/auth'
import './ContentCreatorsPage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
}

const CREATOR_IMAGES = [content1, content2, content3, content4, content5, content6, content7]

interface ContentCreatorsPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
}

export default function ContentCreatorsPage({ onOpenAuth }: ContentCreatorsPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthUser()

  const FEATURES = [
    {
      icon: DollarSign,
      text: t('contentCreators.feature1'),
    },
    {
      icon: Zap,
      text: t('contentCreators.feature2'),
    },
    {
      icon: Heart,
      text: t('contentCreators.feature3'),
    },
  ]

  const CREATOR_EXAMPLES = [
    { label: 'Creator #1', clicks: '170 clicks and bookings to Expedition-Go Tours', earning: 'GH₵ 60 /mo' },
    { label: 'Creator #2', clicks: '6,500 clicks and bookings to Expedition-Go Tours', earning: 'GH₵ 2,300 /mo' },
    { label: 'Creator #3', clicks: '950 clicks and bookings to Expedition-Go Tours', earning: 'GH₵ 110 /mo' },
  ]

  const HOW_IT_WORKS = [
    t('contentCreators.step1'),
    t('contentCreators.step2'),
    t('contentCreators.step3'),
  ]

  useEffect(() => {
    document.title = `${t('footer.asContentCreator')} | Expedition-Go Tours`
  }, [t])

  const handleSignUp = () => {
    if (!user) {
      setAuthReturnTo('/partners/content-creators/apply')
    }
    navigate('/partners/content-creators/apply')
  }

  return (
    <div className="content-creator-page">
      <Navbar onOpenAuth={onOpenAuth} />

      {/* Section 1: Hero */}
      <section className="content-creator-hero-top">
        <motion.div
          className="content-creator-hero-top-inner"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <h1 className="content-creator-hero-top-title">
            {t('contentCreators.heroTitle')}
          </h1>
        </motion.div>
      </section>

      <section className="content-creator-hero-strip" aria-label="Creators we work with">
        <div className="content-creator-hero-strip-track">
          {[...CREATOR_IMAGES, ...CREATOR_IMAGES].map((img, i) => (
            <div
              className="content-creator-strip-card"
              aria-hidden={i >= CREATOR_IMAGES.length}
              key={`${img}-${i}`}
            >
              <img
                src={img}
                alt={i < CREATOR_IMAGES.length ? `Content creator ${i + 1}` : ''}
                width={300}
                height={400}
                decoding="async"
                loading={i < 2 ? 'eager' : 'lazy'}
                fetchPriority={i < 2 ? 'high' : undefined}
              />
            </div>
          ))}
        </div>
        <div className="content-creator-grow-overlay">
          <h2 className="content-creator-grow-title">
            {t('contentCreators.growTitle')}
          </h2>
          <ul className="content-creator-grow-list">
            <li>{t('contentCreators.growItem1')}</li>
            <li>{t('contentCreators.growItem2')}</li>
          </ul>
        </div>
      </section>

      {/* Section 2b: Make money */}
      <section className="content-creator-make-section">
        <div className="content-creator-make-inner">
          <h2 className="content-creator-make-title">
            {t('contentCreators.makeTitle')}
          </h2>
          <div className="content-creator-features">
            {FEATURES.map((feature) => (
              <div key={feature.text} className="content-creator-feature-card">
                <div className="content-creator-feature-icon">
                  <feature.icon size={24} strokeWidth={2} />
                </div>
                <p className="content-creator-feature-text">{feature.text}</p>
              </div>
            ))}
          </div>
          <button type="button" className="content-creator-cta" onClick={handleSignUp}>
            {t('contentCreators.signupBtn')}
          </button>
        </div>
      </section>

      {/* Section 3: Creator examples */}
      <section className="content-creator-examples-section">
        <div className="content-creator-examples-inner">
          <h2 className="content-creator-examples-title">
            {t('contentCreators.examplesTitle')}
          </h2>
          <div className="content-creator-example-rows">
            {CREATOR_EXAMPLES.map((row) => (
              <div key={row.label} className="content-creator-example-row">
                <span className="content-creator-example-label">{row.label}</span>
                <div className="content-creator-example-bar">
                  <span>{row.clicks}</span>
                  <span className="content-creator-example-earning">{row.earning}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3b: How it works */}
      <section className="content-creator-how-section">
        <div className="content-creator-how-inner">
          <h2 className="content-creator-how-title">{t('contentCreators.howTitle')}</h2>
          <div className="content-creator-how-steps">
            {HOW_IT_WORKS.map((step) => (
              <div key={step} className="content-creator-how-card">
                <p className="content-creator-how-card-text">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Become a partner + Need help */}
      <section className="content-creator-partner-section">
        <div className="content-creator-partner-inner">
          <div className="content-creator-partner-col">
            <h2>{t('contentCreators.partnerTitle')}</h2>
            <p>
              {t('contentCreators.partnerDesc')}
            </p>
            <button type="button" className="content-creator-cta" onClick={handleSignUp}>
              {t('contentCreators.signupBtn')}
            </button>
          </div>
          <div className="content-creator-partner-col">
            <h2>{t('contentCreators.helpTitle')}</h2>
            <p>
              {t('contentCreators.helpDesc')}
            </p>
            <a href="/help-centre" className="content-creator-cta">
              {t('contentCreators.helpBtn')}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
