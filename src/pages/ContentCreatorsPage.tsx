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

const FEATURES = [
  {
    icon: DollarSign,
    text: 'Earn a minimum commission rate of 8%, paid monthly',
  },
  {
    icon: Zap,
    text: 'Optimize your earnings through an easy-to-use analytics suite, automatic widgets, and integrations that fit your content',
  },
  {
    icon: Heart,
    text: 'Have access to a dedicated support system and resources',
  },
]

const CREATOR_EXAMPLES = [
  { label: 'Creator #1', clicks: '170 clicks and bookings to Expedition-Go Tours', earning: 'GH₵ 60 /mo' },
  { label: 'Creator #2', clicks: '6,500 clicks and bookings to Expedition-Go Tours', earning: 'GH₵ 2,300 /mo' },
  { label: 'Creator #3', clicks: '950 clicks and bookings to Expedition-Go Tours', earning: 'GH₵ 110 /mo' },
]

const HOW_IT_WORKS = [
  'Sign up for our content creator program',
  'Create integrations & earn commissions',
  'Join our travel community & apply for free experiences',
]

const CREATOR_IMAGES = [content1, content2, content3, content4, content5, content6, content7]

interface ContentCreatorsPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
}

export default function ContentCreatorsPage({ onOpenAuth }: ContentCreatorsPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthUser()

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
            Monetize your travel content with Expedition-Go Tours
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
                loading={i < 2 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>
        <div className="content-creator-grow-overlay">
          <h2 className="content-creator-grow-title">
            Grow your social media presence by joining our travel community
          </h2>
          <ul className="content-creator-grow-list">
            <li>Apply for sponsored Expedition-Go experiences</li>
            <li>Participate in workshops, networking events, and giveaways</li>
          </ul>
        </div>
      </section>

      {/* Section 2b: Make money */}
      <section className="content-creator-make-section">
        <div className="content-creator-make-inner">
          <h2 className="content-creator-make-title">
            Make money through your website or blog
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
            Sign up
          </button>
        </div>
      </section>

      {/* Section 3: Creator examples */}
      <section className="content-creator-examples-section">
        <div className="content-creator-examples-inner">
          <h2 className="content-creator-examples-title">
            Examples of creators we work with and how their traffic converts to bookings
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
          <h2 className="content-creator-how-title">How it works</h2>
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
            <h2>Become a partner</h2>
            <p>
              Sign up to become a partner with Expedition-Go Tours to grow and monetize your platforms.
            </p>
            <button type="button" className="content-creator-cta" onClick={handleSignUp}>
              Sign up
            </button>
          </div>
          <div className="content-creator-partner-col">
            <h2>Need help?</h2>
            <p>
              Check out our Partner Resource Center or reach out to our support team if you need further assistance.
            </p>
            <a href="/help-centre" className="content-creator-cta">
              Visit Help Centre
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
