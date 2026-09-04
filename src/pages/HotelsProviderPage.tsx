import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  DollarSign, Layout, Mail, Check,
  ArrowRight,
} from 'lucide-react'
import heroBg from '../assets/images/painting.webp'
import partners2 from '../assets/partners/partners2.avif'
import partners7 from '../assets/partners/partners7.avif'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuthUser } from '../hooks/useAuthUser'
import { setAuthReturnTo } from '../lib/auth'
import './HotelsProviderPage.css'

interface HotelsProviderPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
}

const INTEGRATION_STEPS = [
  {
    num: 1,
    title: 'Earn money with easy white label integration',
    points: [
      'Promote our products under your brand',
      'Get started in minutes',
      'Enjoy the best conversion rates',
    ],
  },
  {
    num: 2,
    title: 'Include tours and activities in your checkout',
    points: [
      'Add touchpoints instantly',
      'Benefit from fast implementation',
      'Display relevant content',
    ],
  },
  {
    num: 3,
    title: 'Add recommended tours to marketing emails',
    points: [
      'Enjoy top conversion opportunities',
      'Create customer loyalty',
      'Learn best practices',
    ],
  },
]

const WHY_JOIN = [
  {
    icon: DollarSign,
    title: 'Earn competitive commissions',
    desc: 'Monetize your guest base by offering curated local experiences. Earn a commission on every booking made through your platform.',
  },
  {
    icon: Layout,
    title: 'Seamless integration',
    desc: 'Our white-label solution integrates directly into your existing booking flow. No heavy engineering required — go live in days.',
  },
  {
    icon: Mail,
    title: 'Dedicated partner support',
    desc: 'Get a dedicated account manager, access to our resource center, and ongoing optimization tips to maximize your revenue.',
  },
]

export default function HotelsProviderPage({ onOpenAuth }: HotelsProviderPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthUser()

  useEffect(() => {
    document.title = `${t('footer.asAccommodationProvider', 'Hotels & Accommodations')} | Expedition-Go Tours`
  }, [t])

  const handleSignUp = () => {
    if (!user) {
      setAuthReturnTo('/partners/hotels/apply')
      onOpenAuth?.('signup')
      return
    }
    navigate('/partners/hotels/apply')
  }

  return (
    <div className="hotel-page">
      <Navbar onOpenAuth={onOpenAuth} />

      {/* Hero — full-width image background */}
      <section className="hotel-hero">
        <div className="hotel-hero-bg">
          <img src={heroBg} alt="" aria-hidden="true" />
        </div>
        <div className="hotel-hero-overlay" />
        <motion.div
          className="hotel-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <h1 className="hotel-hero-title">
            Connect your customers to <span className="hotel-hero-accent">incredible experiences</span>
          </h1>
          <p className="hotel-hero-subtitle">
            Help your customers plan every step of their trip with the world's largest marketplace for tours and activities.
          </p>
          <button type="button" className="hotel-btn hotel-btn-primary" onClick={handleSignUp}>
            Sign up for free
          </button>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="hotel-stats">
        <div className="hotel-container">
          <div className="hotel-stats-grid">
            {[
              { value: '200k+', label: 'Curated experiences worldwide' },
              { value: '18k+', label: 'Destinations covered' },
              { value: '30M+', label: 'Travelers served annually' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="hotel-stat-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <span className="hotel-stat-value">{stat.value}</span>
                <span className="hotel-stat-label">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration steps */}
      <section className="hotel-integration">
        <div className="hotel-container">
          <motion.div
            className="hotel-integration-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="hotel-section-title">Drive revenue via seamless integration</h2>
            <p className="hotel-section-desc">
              We make integration easy so our partners can focus on what matters — driving revenue. No engineering required.
            </p>
          </motion.div>
          <div className="hotel-integration-grid">
            {INTEGRATION_STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                className="hotel-integration-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <span className="hotel-step-num">{step.num}</span>
                <h3 className="hotel-step-title">{step.title}</h3>
                <ul className="hotel-step-list">
                  {step.points.map((pt) => (
                    <li key={pt}>
                      <Check size={16} className="hotel-check-icon" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="hotel-why">
        <div className="hotel-container">
          <motion.h2
            className="hotel-section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Why partner with Expedition-Go Tours
          </motion.h2>
          <div className="hotel-why-grid">
            {WHY_JOIN.map((item, i) => (
              <motion.div
                key={item.title}
                className="hotel-why-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="hotel-why-icon">
                  <item.icon size={24} />
                </div>
                <h3 className="hotel-why-title">{item.title}</h3>
                <p className="hotel-why-desc">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About / Contact */}
      <section className="hotel-about">
        <div className="hotel-container">
          <motion.h2
            className="hotel-section-title hotel-about-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            About the Expedition-Go Tours Partner Program
          </motion.h2>
          <motion.div
            className="hotel-about-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <p className="hotel-about-card-text">
              For inquiries, contact <strong>partners@expedition-go.com</strong>
            </p>
            <a href="/contact-us" className="hotel-btn hotel-btn-contact">
              Contact Us
            </a>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="hotel-cta">
        <div className="hotel-container">
          <motion.div
            className="hotel-cta-inner"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="hotel-cta-title">Ready to grow your business?</h2>
            <p className="hotel-cta-subtitle">Join thousands of accommodation partners already earning with us.</p>
            <button type="button" className="hotel-btn hotel-btn-primary hotel-btn-lg" onClick={handleSignUp}>
              Get started <ArrowRight size={18} />
            </button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
