import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, DollarSign, Headset, Zap,
  ChevronDown, ArrowRight,
} from 'lucide-react'
import heroImg from '../assets/partners/partners9.avif'
import tour1 from '../assets/tours/tour1.avif'
import tour2 from '../assets/tours/tour2.avif'
import tour3 from '../assets/tours/tour3.avif'
import tour4 from '../assets/tours/tour4.avif'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuthUser } from '../hooks/useAuthUser'
import { setAuthReturnTo } from '../lib/auth'
import './TravelAgentsPage.css'

interface TravelAgentsPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
}

const STATS = [
  { value: '200k+', label: 'Activities worldwide' },
  { value: '100k+', label: 'Travel agents in our program' },
  { value: '1k+', label: 'Daily travel agent bookings' },
]

const FEATURES = [
  {
    icon: Globe,
    title: 'Access to 200,000+ curated experiences',
    desc: 'Pick from a multitude of travel experiences worldwide to guarantee your clients unforgettable memories.',
  },
  {
    icon: DollarSign,
    title: 'Monetize your expertise',
    desc: 'Earn a competitive commission for every booking you make, paid out monthly.',
  },
  {
    icon: Headset,
    title: 'Dedicated customer support',
    desc: 'Access our in-depth resource center, tutorial videos and support team. All with the mission of guaranteeing your success.',
  },
  {
    icon: Zap,
    title: 'Save 10+ hours weekly on research',
    desc: 'Get access to exclusive hidden gems, top-proofed activities and suppliers. Reduce booking errors by 89% with smart validation.',
  },
]

const STEPS = [
  {
    num: 1,
    title: 'Sign Up',
    desc: 'Click on a sign up button fitting your profile. Provide basic contact and business details.',
  },
  {
    num: 2,
    title: 'Confirm your affiliate account',
    desc: "From there, you'll receive a confirmation email in your inbox. Allowing you access to your partner portal.",
  },
  {
    num: 3,
    title: 'Log in to your portal',
    desc: 'Once logged in, you can begin making bookings for your clients or sharing your personal link for them to book.',
  },
]

const FAQ_ITEMS = [
  {
    q: 'What is the Travel Agent portal?',
    a: 'The Travel Agent portal is a dedicated platform where you can browse, recommend, and book travel experiences for your clients. It gives you access to a wide range of curated activities and tools to manage your bookings efficiently.',
  },
  {
    q: 'What experiences are available?',
    a: 'You have access to over 200,000 curated experiences across 18,000+ cities worldwide. This includes guided tours, adventure activities, cultural experiences, food tours, and much more.',
  },
  {
    q: 'How do I know which experiences to recommend?',
    a: 'Our platform provides personalized recommendations based on your clients\' preferences, destination, and travel style. You can also filter by category, rating, and price to find the perfect match.',
  },
  {
    q: 'How much can I potentially earn?',
    a: 'Earnings vary based on the number of bookings you make. You earn a competitive commission on every successful booking, with top agents earning significant monthly income.',
  },
  {
    q: 'How and when do I get paid?',
    a: 'Commissions are paid out monthly via bank transfer. You can track your earnings in real-time through your partner dashboard.',
  },
  {
    q: 'What support is available when I need help?',
    a: 'You have access to a dedicated support team, an extensive resource center with tutorial videos, and a community of fellow travel agents. We are here to guarantee your success.',
  },
  {
    q: 'Can I use this for clients who want to book some things themselves?',
    a: 'Yes! You can share your personal booking link with clients so they can browse and book experiences directly, while you still earn commission on their bookings.',
  },
  {
    q: 'What happens when I sign up?',
    a: 'After signing up, you will receive a confirmation email. Once confirmed, you gain access to your partner portal where you can start browsing experiences and making bookings for your clients immediately.',
  },
]

export default function TravelAgentsPage({ onOpenAuth }: TravelAgentsPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthUser()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    document.title = `${t('footer.asTravelAgentReseller', 'Travel Agents & Resellers')} | Expedition-Go Tours`
  }, [t])

  const handleSignUp = () => {
    if (!user) {
      setAuthReturnTo('/partners/travel-agents/apply')
      onOpenAuth?.('signup')
      return
    }
    navigate('/partners/travel-agents/apply')
  }

  return (
    <div className="ta-page">
      <Navbar onOpenAuth={onOpenAuth} />

      {/* Hero */}
      <section className="ta-hero">
        <div className="ta-hero-inner">
          <motion.div
            className="ta-hero-copy"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h1 className="ta-hero-title">
              Save up to <span className="ta-highlight">10+ hours weekly</span> with smart experience booking
            </h1>
            <p className="ta-hero-subtitle">
              Start monetizing your expertise and offer unforgettable experiences to your clients with a click of a button.
            </p>
            <button type="button" className="ta-btn ta-btn-primary" onClick={handleSignUp}>
              Sign Up <ArrowRight size={16} />
            </button>
          </motion.div>
          <motion.div
            className="ta-hero-visual"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          >
            <div className="ta-hero-circle">
              <img src={heroImg} alt="Travel agents enjoying a tour experience" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="ta-stats-banner">
        <div className="ta-stats-inner">
          <motion.div
            className="ta-stats-copy"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="ta-stats-title">
              A trusted, globally recognized platform, we help our travel agents unlock new revenue streams effortlessly
            </h2>
          </motion.div>
          <div className="ta-stats-cards">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="ta-stats-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <span className="ta-stats-value">{stat.value}</span>
                <span className="ta-stats-label">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="ta-features">
        <div className="ta-container">
          <motion.h2
            className="ta-section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Why join Expedition-Go Tours
          </motion.h2>
          <div className="ta-features-grid">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                className="ta-feature-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className="ta-feature-icon">
                  <feat.icon size={24} />
                </div>
                <h3 className="ta-feature-title">{feat.title}</h3>
                <p className="ta-feature-desc">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="ta-getting-started">
        <div className="ta-container">
          <motion.div
            className="ta-gs-wrapper"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="ta-gs-dark-card">
              <p className="ta-gs-eyebrow">Getting started is easy</p>
              <h3 className="ta-gs-dark-title">Make your first booking in under 30 minutes</h3>
              <button type="button" className="ta-btn ta-btn-primary" onClick={handleSignUp}>
                Sign Up <ArrowRight size={16} />
              </button>
            </div>
            <div className="ta-gs-steps">
              {STEPS.map((step, i) => (
                <div key={step.num} className="ta-gs-step">
                  <div className="ta-gs-step-top">
                    <span className="ta-gs-step-num">{step.num}</span>
                    {i < STEPS.length - 1 && <div className="ta-gs-step-line" />}
                  </div>
                  <h4 className="ta-gs-step-title">{step.title}</h4>
                  <p className="ta-gs-step-desc">{step.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ta-faq">
        <div className="ta-container">
          <motion.h2
            className="ta-section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Your questions answered
          </motion.h2>
          <div className="ta-faq-layout">
            <div className="ta-faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <motion.div
                  key={i}
                  className={`ta-faq-item${openFaq === i ? ' open' : ''}`}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <button
                    type="button"
                    className="ta-faq-question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{item.q}</span>
                    <span className="ta-faq-icon">
                      {openFaq === i ? <ChevronDown size={20} style={{ transform: 'rotate(180deg)' }} /> : <ChevronDown size={20} />}
                    </span>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        className="ta-faq-answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
            <div className="ta-faq-sidebar">
              <div className="ta-faq-sidebar-card">
                <h4 className="ta-faq-sidebar-title">Resource center</h4>
                <p className="ta-faq-sidebar-desc">Search our knowledge base for answers to common questions.</p>
                <a href="/help-centre" className="ta-faq-sidebar-link">Visit the help centre</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="ta-cta-banner">
        <div className="ta-container">
          <motion.div
            className="ta-cta-inner"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="ta-cta-title">Sign up to become a partner with Expedition-Go Tours</h2>
            <p className="ta-cta-subtitle">Grow and monetize your expertise</p>
            <button type="button" className="ta-btn ta-btn-cta" onClick={handleSignUp}>
              Sign Up <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
