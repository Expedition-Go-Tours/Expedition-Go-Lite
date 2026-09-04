import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  DollarSign, Layout, Mail, Check,
  ArrowRight,
} from 'lucide-react'
import heroBg from '../assets/images/IMG_3538.webp'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuthUser } from '../hooks/useAuthUser'
import { setAuthReturnTo } from '../lib/auth'
import './TransportProviderPage.css'

interface TransportProviderPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
}

const INTEGRATION_STEPS = [
  {
    num: 1,
    title: 'List your fleet and reach more travelers',
    points: [
      'Showcase your vehicles to a global audience',
      'Get started in minutes with easy onboarding',
      'Maximize your fleet utilization',
    ],
  },
  {
    num: 2,
    title: 'Connect directly with tour operators',
    points: [
      'Receive instant booking requests',
      'Manage availability in real-time',
      'Build lasting partner relationships',
    ],
  },
  {
    num: 3,
    title: 'Grow with a trusted travel platform',
    points: [
      'Access marketing and promotional support',
      'Benefit from secure payment processing',
      'Join a network of verified transport providers',
    ],
  },
]

const WHY_JOIN = [
  {
    icon: DollarSign,
    title: 'Earn competitive rates',
    desc: 'Set your own prices and earn more by partnering with tour operators who need reliable transport. Get paid securely for every booking.',
  },
  {
    icon: Layout,
    title: 'Easy fleet management',
    desc: 'Our platform makes it simple to manage your vehicles, availability, and bookings all in one place. No complex setup required.',
  },
  {
    icon: Mail,
    title: 'Dedicated partner support',
    desc: 'Get a dedicated account manager, access to our resource center, and ongoing support to help you succeed on the platform.',
  },
]

export default function TransportProviderPage({ onOpenAuth }: TransportProviderPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthUser()
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    document.title = `${t('footer.asTransportProvider', 'Transport Provider')} | Expedition-Go Tours`
  }, [t])

  const handleSignUp = () => {
    if (!user) {
      setAuthReturnTo('/partners/transport-providers/apply')
      onOpenAuth?.('signup')
      return
    }
    navigate('/partners/transport-providers/apply')
  }

  const handleScroll = useCallback(() => {
    const el = carouselRef.current
    if (!el) return
    const card = el.querySelector('.transport-integration-card') as HTMLElement
    if (!card) return
    const cardWidth = card.offsetWidth
    const gap = 16
    const index = Math.round(el.scrollLeft / (cardWidth + gap))
    setActiveStep(Math.min(index, INTEGRATION_STEPS.length - 1))
  }, [])

  const scrollToStep = (index: number) => {
    const el = carouselRef.current
    if (!el) return
    const cards = el.querySelectorAll('.transport-integration-card') as NodeListOf<HTMLElement>
    const card = cards[index]
    if (card) {
      el.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
    }
  }

  return (
    <div className="transport-page">
      <Navbar onOpenAuth={onOpenAuth} />

      {/* Hero — full-width image background */}
      <section className="transport-hero">
        <div className="transport-hero-bg">
          <img src={heroBg} alt="" aria-hidden="true" />
        </div>
        <div className="transport-hero-overlay" />
        <motion.div
          className="transport-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <h1 className="transport-hero-title">
            Partner with us and <span className="transport-hero-accent">grow your transport business</span>
          </h1>
          <p className="transport-hero-subtitle">
            Connect with tour operators and travelers who need reliable, safe, and comfortable transport across Ghana.
          </p>
          <button type="button" className="transport-btn transport-btn-primary" onClick={handleSignUp}>
            Sign up for free
          </button>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="transport-stats">
        <div className="transport-container">
          <div className="transport-stats-grid">
            {[
              { value: '500+', label: 'Verified transport providers' },
              { value: '50+', label: 'Destinations covered' },
              { value: '10k+', label: 'Monthly bookings' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="transport-stat-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <span className="transport-stat-value">{stat.value}</span>
                <span className="transport-stat-label">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration steps */}
      <section className="transport-integration">
        <div className="transport-container">
          <motion.div
            className="transport-integration-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="transport-section-title">How to get started</h2>
            <p className="transport-section-desc">
              We make it easy for transport providers to join our platform and start earning. No complicated setup required.
            </p>
          </motion.div>
          <div className="transport-integration-grid" ref={carouselRef} onScroll={handleScroll}>
            {INTEGRATION_STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                className="transport-integration-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <span className="transport-step-num">{step.num}</span>
                <h3 className="transport-step-title">{step.title}</h3>
                <ul className="transport-step-list">
                  {step.points.map((pt) => (
                    <li key={pt}>
                      <Check size={16} className="transport-check-icon" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
          <div className="transport-integration-dots">
            {INTEGRATION_STEPS.map((_, i) => (
              <button
                key={i}
                className={`transport-integration-dot${i === activeStep ? ' active' : ''}`}
                onClick={() => scrollToStep(i)}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="transport-why">
        <div className="transport-container">
          <motion.h2
            className="transport-section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Why partner with Expedition-Go Tours
          </motion.h2>
          <div className="transport-why-grid">
            {WHY_JOIN.map((item, i) => (
              <motion.div
                key={item.title}
                className="transport-why-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="transport-why-icon">
                  <item.icon size={24} />
                </div>
                <h3 className="transport-why-title">{item.title}</h3>
                <p className="transport-why-desc">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About / Contact */}
      <section className="transport-about">
        <div className="transport-container">
          <motion.h2
            className="transport-section-title transport-about-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            About the Expedition-Go Tours Partner Program
          </motion.h2>
          <motion.div
            className="transport-about-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <p className="transport-about-card-text">
              For inquiries, contact <strong>partners@expedition-go.com</strong>
            </p>
            <a href="/contact-us" className="transport-btn transport-btn-contact">
              Contact Us
            </a>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="transport-cta">
        <div className="transport-container">
          <motion.div
            className="transport-cta-inner"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="transport-cta-title">Ready to grow your transport business?</h2>
            <p className="transport-cta-subtitle">Join hundreds of transport partners already earning with us.</p>
            <button type="button" className="transport-btn transport-btn-primary transport-btn-lg" onClick={handleSignUp}>
              Get started <ArrowRight size={18} />
            </button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
