import { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Heart, MessageSquare, Star, Shield, Users, Headset,
  Phone, Mail, Globe, MapPin, ChevronDown, Leaf, Award, Route,
} from 'lucide-react'
import {
  recommendedTours, dayTours, topRatedTours,
  sellOutTours, lastMinuteDeals, multiDayTours,
} from '../components/data'
import TourCard from '../components/TourCard'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './SupplierPage.css'

const PAGE_SIZE = 12

const TRUST_BADGES = [
  { icon: Shield, title: 'Trusted Local Operator', desc: 'Verified & vetted' },
  { icon: Users, title: 'Great Reviews', desc: '4.9/5 from 15 travellers' },
  { icon: Star, title: 'Quality Experiences', desc: 'Handpicked tours' },
  { icon: Headset, title: 'Customer Support', desc: "We're here to help" },
]

const FEATURES = [
  { icon: Leaf, heading: 'Local Expertise', desc: 'Experienced guides who know Ghana' },
  { icon: Award, heading: 'Authentic & Immersive', desc: "Real local experiences you'll remember" },
  { icon: Route, heading: 'Sustainable Travel', desc: 'Supporting communities and protecting nature' },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

export default function SupplierPage() {
  const { supplierName } = useParams()
  const navigate = useNavigate()
  const decodedName = supplierName ? decodeURIComponent(supplierName) : ''

  const allTours = [
    ...recommendedTours, ...dayTours, ...topRatedTours,
    ...sellOutTours, ...lastMinuteDeals,
  ]
  const multiDayArray = multiDayTours as any[]

  const supplierTours = allTours.length > 0 ? allTours : multiDayArray

  const [page, setPage] = useState(1)
  const [activeFeature, setActiveFeature] = useState(0)
  const featuresRef = useRef<HTMLDivElement>(null)

  const handleFeaturesScroll = useCallback(() => {
    const el = featuresRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    setActiveFeature(Math.min(idx, FEATURES.length - 1))
  }, [])

  const scrollToFeature = (index: number) => {
    featuresRef.current?.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'start' })
  }

  const startIdx = 0
  const endIdx = page * PAGE_SIZE
  const visibleTours = supplierTours.slice(startIdx, endIdx)
  const hasMore = endIdx < supplierTours.length

  const supplierData = {
    name: decodedName || 'Expedition-Go Tours Ltd',
    logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=240&q=80',
    description: `Expedition-Go Tours Ltd is a trusted local tour operator based in Accra, Ghana. We specialize in creating authentic, immersive travel experiences that showcase the rich culture, history, and natural beauty of Ghana.

From the lush rainforests of Kakum National Park to the historic shores of Cape Coast, our expert guides bring every destination to life with deep local knowledge and genuine hospitality.

We are committed to sustainable tourism practices that support local communities and protect Ghana's incredible natural heritage for generations to come.`,
    rating: 4.8,
    reviewCount: 15,
    totalTours: supplierTours.length,
    verified: true,
    phone: '+233 20 123 4567',
    email: 'info@expeditiongo.com',
    website: 'https://expeditiongo.com',
    address: 'Accra, Ghana',
  }

  const ratingDisplay = supplierData.rating != null
    ? supplierData.rating.toFixed(1)
    : null

  return (
    <motion.div
      className="supplier-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <Navbar />
      <div className="supplier-page-nav-offset" aria-hidden />

      <motion.main
        className="supplier-page-main"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Navigation Row */}
        <motion.div variants={itemVariants} className="supplier-nav-row">
          <button type="button" onClick={() => navigate(-1)} className="supplier-back-btn">
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="supplier-nav-actions">
            <button type="button" className="supplier-save-btn">
              <Heart size={16} />
              Save
            </button>
            <button type="button" className="supplier-contact-btn">
              <MessageSquare size={16} />
              Contact
            </button>
          </div>
        </motion.div>

        {/* Supplier Header */}
        <motion.div variants={itemVariants} className="supplier-header-section">
          <div className="supplier-header-logo-wrap">
            <div className="supplier-header-logo">
              {supplierData.logo ? (
                <img src={supplierData.logo} alt={supplierData.name} />
              ) : (
                <span className="supplier-header-logo-fallback">
                  {supplierData.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {supplierData.verified && (
              <div className="supplier-header-verified">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>
          <div className="supplier-header-info">
            <h1 className="supplier-header-name">{supplierData.name}</h1>
            <div className="supplier-header-meta">
              <Star size={22} className="supplier-header-star" fill="#179237" />
              <span className="supplier-header-rating">{ratingDisplay}</span>
              <span className="supplier-header-dot">&bull;</span>
              <span className="supplier-header-tours">{supplierData.totalTours} tours</span>
            </div>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div variants={itemVariants} className="supplier-trust-badges">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.title} className="supplier-trust-badge">
              <div className="supplier-trust-badge-icon">
                <badge.icon size={22} />
              </div>
              <div className="supplier-trust-badge-text">
                <span className="supplier-trust-badge-title">{badge.title}</span>
                <span className="supplier-trust-badge-desc">{badge.desc}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* About + Contact — Two Column */}
        <motion.div variants={itemVariants} className="supplier-about-layout">
          {/* Left Card — About */}
          <div className="supplier-about-card">
            <h2 className="supplier-about-heading">About this supplier</h2>
            <div className="supplier-about-description">
              {supplierData.description.split('\n\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div
              ref={featuresRef}
              className="supplier-features"
              onScroll={handleFeaturesScroll}
            >
              {FEATURES.map((feature) => (
                <div key={feature.heading} className="supplier-feature">
                  <div className="supplier-feature-icon">
                    <feature.icon size={20} />
                  </div>
                  <div className="supplier-feature-text">
                    <span className="supplier-feature-heading">{feature.heading}</span>
                    <span className="supplier-feature-desc">{feature.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="supplier-features-dots">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`supplier-features-dot ${i === activeFeature ? 'active' : ''}`}
                  onClick={() => scrollToFeature(i)}
                  aria-label={`Go to feature ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right Card — Contact */}
          <div className="supplier-contact-card">
            <h3 className="supplier-contact-heading">Contact Information</h3>
            <div className="supplier-contact-list">
              <div className="supplier-contact-row">
                <div className="supplier-contact-icon-wrap">
                  <Phone size={16} />
                </div>
                <div className="supplier-contact-detail">
                  <span className="supplier-contact-label">Phone</span>
                  <a href={`tel:${supplierData.phone.replace(/\s/g, '')}`} className="supplier-contact-value">
                    {supplierData.phone}
                  </a>
                </div>
              </div>
              <div className="supplier-contact-divider" />
              <div className="supplier-contact-row">
                <div className="supplier-contact-icon-wrap">
                  <Mail size={16} />
                </div>
                <div className="supplier-contact-detail">
                  <span className="supplier-contact-label">Email</span>
                  <a href={`mailto:${supplierData.email}`} className="supplier-contact-value">
                    {supplierData.email}
                  </a>
                </div>
              </div>
              <div className="supplier-contact-divider" />
              <div className="supplier-contact-row">
                <div className="supplier-contact-icon-wrap">
                  <Globe size={16} />
                </div>
                <div className="supplier-contact-detail">
                  <span className="supplier-contact-label">Website</span>
                  <a
                    href={supplierData.website.startsWith('http') ? supplierData.website : `https://${supplierData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="supplier-contact-value"
                  >
                    {supplierData.website}
                  </a>
                </div>
              </div>
              <div className="supplier-contact-divider" />
              <div className="supplier-contact-row">
                <div className="supplier-contact-icon-wrap">
                  <MapPin size={16} />
                </div>
                <div className="supplier-contact-detail">
                  <span className="supplier-contact-label">Location</span>
                  <span className="supplier-contact-value">{supplierData.address}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tours Section */}
        <motion.div variants={itemVariants} className="supplier-tours-section">
          <div className="supplier-tours-header">
            <h2 className="supplier-tours-heading">
              All tours by this supplier
              <span className="supplier-tours-count">({supplierData.totalTours} tours)</span>
            </h2>
            <div className="supplier-tours-sort">
              <span className="supplier-tours-sort-label">Sort by:</span>
              <span className="supplier-tours-sort-value">Recommended</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div className="supplier-tours-grid">
            {visibleTours.map((tour: any, i: number) => (
              <TourCard key={`${tour.title}-${i}`} {...tour} />
            ))}
          </div>

          {hasMore && (
            <div className="supplier-tours-bottom">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="supplier-tours-view-all"
              >
                View all {supplierData.totalTours} tours
                <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
          )}
        </motion.div>
      </motion.main>

      <Footer />
    </motion.div>
  )
}
