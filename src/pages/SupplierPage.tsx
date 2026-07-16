import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, Phone, Mail, Globe, MapPin, ArrowLeft, ChevronDown } from 'lucide-react'
import {
  recommendedTours, dayTours, topRatedTours,
  sellOutTours, lastMinuteDeals, multiDayTours,
} from '../components/data'
import TourCard from '../components/TourCard'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './SupplierPage.css'

const PAGE_SIZE = 8

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

  const [supplierInfoOpen, setSupplierInfoOpen] = useState(true)
  const [page, setPage] = useState(1)

  const startIdx = 0
  const endIdx = page * PAGE_SIZE
  const visibleTours = supplierTours.slice(startIdx, endIdx)
  const hasMore = endIdx < supplierTours.length

  const supplierData = {
    name: decodedName || 'Expedition-Go Tours Ltd',
    logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=120&q=80',
    description: 'Expedition-Go Tours Ltd offers authentic guided experiences across Ghana, showcasing the country\'s rich culture, history, and natural beauty.',
    rating: 4.8,
    totalTours: supplierTours.length,
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="supplier-back-btn"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="supplier-profile-header">
          <div className="supplier-profile-logo">
            {supplierData.logo ? (
              <img src={supplierData.logo} alt="" />
            ) : (
              <span>
                {supplierData.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="supplier-profile-name">{supplierData.name}</h1>
            <div className="supplier-profile-meta">
              {ratingDisplay && (
                <>
                  <Star size={14} className="supplier-profile-star" />
                  <span className="supplier-profile-rating">{ratingDisplay}</span>
                  <span className="supplier-profile-dot">&bull;</span>
                </>
              )}
              <span>{supplierTours.length} tours</span>
            </div>
          </div>
        </div>

        <div className="supplier-about-section">
          <button
            type="button"
            onClick={() => setSupplierInfoOpen((o) => !o)}
            className="supplier-about-btn"
          >
            About this supplier
            <motion.span
              initial={false}
              animate={{ rotate: supplierInfoOpen ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronDown size={16} />
            </motion.span>
          </button>
          <div
            className="supplier-about-content"
            style={{ maxHeight: supplierInfoOpen ? '500px' : '0', opacity: supplierInfoOpen ? 1 : 0 }}
          >
            <div className="supplier-about-body">
              {supplierData.description && (
                <p className="supplier-about-desc">{supplierData.description}</p>
              )}
              <div className="supplier-about-contact">
                {supplierData.phone && (
                  <div className="supplier-about-contact-item">
                    <Phone size={16} />
                    <a href={`tel:${supplierData.phone.replace(/\s/g, '')}`}>{supplierData.phone}</a>
                  </div>
                )}
                {supplierData.email && (
                  <div className="supplier-about-contact-item">
                    <Mail size={16} />
                    <a href={`mailto:${supplierData.email}`}>{supplierData.email}</a>
                  </div>
                )}
                {supplierData.website && (
                  <div className="supplier-about-contact-item">
                    <Globe size={16} />
                    <a href={supplierData.website.startsWith('http') ? supplierData.website : `https://${supplierData.website}`}
                      target="_blank" rel="noopener noreferrer">
                      {supplierData.website}
                    </a>
                  </div>
                )}
                {supplierData.address && (
                  <div className="supplier-about-contact-item">
                    <MapPin size={16} />
                    <span>{supplierData.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="supplier-tours-section">
          <h2 className="supplier-tours-heading">
            All tours by this supplier
            <span className="supplier-tours-count">{supplierTours.length} tours</span>
          </h2>
          <div className="supplier-tours-grid">
            {visibleTours.map((tour: any, i: number) => (
              <TourCard key={`${tour.title}-${i}`} {...tour} />
            ))}
          </div>
          {hasMore && (
            <div className="supplier-tours-pagination">
              <span className="supplier-tours-showing">
                Showing {endIdx} of {supplierTours.length} tours
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="supplier-tours-load-more"
              >
                Load more
              </button>
            </div>
          )}
          {!hasMore && supplierTours.length > PAGE_SIZE && (
            <div className="supplier-tours-pagination">
              <span className="supplier-tours-showing">
                Showing all {supplierTours.length} tours
              </span>
            </div>
          )}
        </div>
      </motion.main>

      <Footer />
    </motion.div>
  )
}
