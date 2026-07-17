import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, Users, Ticket, CreditCard, Mail, Phone, Info } from 'lucide-react'
import { Button } from './ui/button'
import './BookingHistory.css'

type BookingStatus = 'All' | 'Pending' | 'Completed' | 'Incomplete' | 'Cancelled' | 'Cancelling'

interface Customer {
  firstName: string
  lastName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  region?: string
  postalCode: string
  country: string
  specialRequirements?: string
}

interface Booking {
  id: string
  title: string
  date: string
  confirmationCode: string
  status: BookingStatus
  imageUrl: string
  location: string
  participants: number
  price: number
  customer: Customer
}

const mockBookings: Booking[] = [
  {
    id: '1',
    title: 'Cape Coast Castle & Kakum National Park',
    date: '2024-03-15',
    confirmationCode: 'EXP-2024-001',
    status: 'Completed',
    imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400',
    location: 'Cape Coast, Ghana',
    participants: 2,
    price: 240,
    customer: {
      firstName: 'Richard',
      lastName: 'Boachie',
      email: 'qwabs94@gmail.com',
      phone: '0596613749',
      addressLine1: 'The Lords Temple Road, Roman Ridge',
      city: 'Roman Ridge',
      postalCode: '00233',
      country: 'Ghana',
    }
  },
  {
    id: '2',
    title: 'Mole National Park Safari Adventure',
    date: '2024-04-20',
    confirmationCode: 'EXP-2024-002',
    status: 'Pending',
    imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400',
    location: 'Mole, Ghana',
    participants: 4,
    price: 1000,
    customer: {
      firstName: 'Ama',
      lastName: 'Mensah',
      email: 'ama.mensah@example.com',
      phone: '0244123456',
      addressLine1: '12 Independence Ave',
      addressLine2: 'Apartment 4B',
      city: 'Accra',
      region: 'Greater Accra',
      postalCode: 'GA-145',
      country: 'Ghana',
      specialRequirements: 'Vegetarian meals for 2 guests',
    }
  },
  {
    id: '3',
    title: 'Kumasi Cultural Heritage Tour',
    date: '2024-02-10',
    confirmationCode: 'EXP-2024-003',
    status: 'Cancelled',
    imageUrl: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=400',
    location: 'Kumasi, Ghana',
    participants: 3,
    price: 255,
    customer: {
      firstName: 'Kwame',
      lastName: 'Asante',
      email: 'kwame.asante@example.com',
      phone: '0201987654',
      addressLine1: '5 Prempeh II Street',
      city: 'Kumasi',
      region: 'Ashanti',
      postalCode: 'AK-039',
      country: 'Ghana',
    }
  }
]

export default function BookingHistory() {
  const [activeTab, setActiveTab] = useState<BookingStatus>('All')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [modalTab, setModalTab] = useState<'tour' | 'customer'>('tour')

  const openBooking = (booking: Booking) => {
    setModalTab('tour')
    setSelectedBooking(booking)
  }

  const tabs: BookingStatus[] = ['All', 'Pending', 'Completed', 'Incomplete', 'Cancelled', 'Cancelling']

  // Lock background scroll while the details modal is open
  useEffect(() => {
    if (!selectedBooking) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [selectedBooking])

  const getStatusColor = (status: BookingStatus): string => {
    switch (status) {
      case 'Completed':
        return 'status-completed'
      case 'Pending':
        return 'status-pending'
      case 'Cancelled':
      case 'Cancelling':
        return 'status-cancelled'
      case 'Incomplete':
        return 'status-incomplete'
      default:
        return ''
    }
  }

  const filteredBookings = activeTab === 'All' 
    ? mockBookings 
    : mockBookings.filter(booking => booking.status === activeTab)

  return (
    <div className="booking-history">
      <div className="booking-tabs-container">
        <div className="booking-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`booking-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="booking-tab-indicator"
                  className="booking-tab-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="booking-content">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
        {filteredBookings.length === 0 ? (
          <div 
            className="empty-state"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                delay: 0.2, 
                type: "spring", 
                stiffness: 200, 
                damping: 15 
              }}
            >
              <motion.svg 
                width="64" 
                height="64" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="empty-icon"
                animate={{ 
                  rotate: [0, 360]
                }}
                transition={{ 
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <circle cx="12" cy="12" r="10" />
                <motion.polyline 
                  points="12 6 12 12 16 14"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </motion.svg>
            </motion.div>
            
            <motion.h3 
              className="empty-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              No Booking History
            </motion.h3>
            
            <motion.p 
              className="empty-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              You haven't made any bookings yet. Start exploring our amazing tours!
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              <Button onClick={() => window.location.href = '/'} className="empty-cta">
                Find an Experience
              </Button>
            </motion.div>

            {[0, 30, 60].map((angle, i) => (
              <motion.div
                key={i}
                className="clock-tick"
                style={{ 
                  transform: `rotate(${angle}deg) translateY(-40px)`,
                  position: 'absolute',
                  top: '50%',
                  left: '50%'
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, 0.2, 0],
                  scale: [0, 1.5, 0]
                }}
                transition={{ 
                  duration: 2,
                  delay: 1.5 + i * 0.3,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                <div style={{ 
                  width: '4px', 
                  height: '4px', 
                  borderRadius: '50%', 
                  background: 'var(--dash-accent)' 
                }} />
            </motion.div>
          ))}
          </div>
        ) : (
          <div className="booking-list">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="booking-item">
                <div className="booking-item-image">
                  <img src={booking.imageUrl} alt={booking.title} />
                  <span className={`booking-status-badge ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="booking-item-content">
                  <div className="booking-item-header">
                    <h3 className="booking-item-title">{booking.title}</h3>
                    <div className="booking-item-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{booking.location}</span>
                    </div>
                  </div>

                  <div className="booking-item-details">
                    <div className="booking-detail">
                      <span className="booking-detail-label">Date</span>
                      <span className="booking-detail-value">
                        {new Date(booking.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="booking-detail">
                      <span className="booking-detail-label">Confirmation</span>
                      <span className={`booking-detail-value booking-code`}>{booking.confirmationCode}</span>
                    </div>
                    <div className="booking-detail">
                      <span className="booking-detail-label">Participants</span>
                      <span className="booking-detail-value">{booking.participants} {booking.participants === 1 ? 'Person' : 'People'}</span>
                    </div>
                    <div className="booking-detail">
                      <span className="booking-detail-label">Total</span>
                      <span className={`booking-detail-value booking-price`}>${booking.price}</span>
                    </div>
                  </div>

                  <div className="booking-item-footer">
                    <Button size="sm" className="booking-view-btn" onClick={() => openBooking(booking)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            className="booking-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              className="booking-modal"
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 30,
                mass: 0.9,
                opacity: { duration: 0.2, ease: 'easeOut' },
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Booking details"
            >
              <button
                className="booking-modal-close"
                onClick={() => setSelectedBooking(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>

              {/* Hero image */}
              <div className="booking-modal-hero">
                <img src={selectedBooking.imageUrl} alt={selectedBooking.title} />
                <div className="booking-modal-hero-overlay" />
                <span className={`booking-status-badge booking-modal-status ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
                <div className="booking-modal-hero-text">
                  <h3 className="booking-modal-title">{selectedBooking.title}</h3>
                  <div className="booking-modal-location">
                    <MapPin size={15} />
                    <span>{selectedBooking.location}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="booking-modal-tabs">
                <button
                  className={`booking-modal-tab ${modalTab === 'tour' ? 'active' : ''}`}
                  onClick={() => setModalTab('tour')}
                >
                  Tour Details
                  {modalTab === 'tour' && (
                    <motion.span layoutId="booking-modal-tab-indicator" className="booking-modal-tab-indicator" />
                  )}
                </button>
                <button
                  className={`booking-modal-tab ${modalTab === 'customer' ? 'active' : ''}`}
                  onClick={() => setModalTab('customer')}
                >
                  Customer Details
                  {modalTab === 'customer' && (
                    <motion.span layoutId="booking-modal-tab-indicator" className="booking-modal-tab-indicator" />
                  )}
                </button>
              </div>

              {/* Tab panels */}
              <div className="booking-modal-body">
                <AnimatePresence mode="wait">
                  {modalTab === 'tour' ? (
                    <motion.div
                      key="tour"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="booking-modal-grid"
                    >
                      <div className="booking-modal-detail">
                        <div className="booking-modal-detail-icon"><Ticket size={16} /></div>
                        <div>
                          <span className="booking-modal-detail-label">Confirmation</span>
                          <span className="booking-modal-detail-value">{selectedBooking.confirmationCode}</span>
                        </div>
                      </div>
                      <div className="booking-modal-detail">
                        <div className="booking-modal-detail-icon"><Calendar size={16} /></div>
                        <div>
                          <span className="booking-modal-detail-label">Date</span>
                          <span className="booking-modal-detail-value">
                            {new Date(selectedBooking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="booking-modal-detail">
                        <div className="booking-modal-detail-icon"><MapPin size={16} /></div>
                        <div>
                          <span className="booking-modal-detail-label">Location</span>
                          <span className="booking-modal-detail-value">{selectedBooking.location}</span>
                        </div>
                      </div>
                      <div className="booking-modal-detail">
                        <div className="booking-modal-detail-icon"><Users size={16} /></div>
                        <div>
                          <span className="booking-modal-detail-label">Participants</span>
                          <span className="booking-modal-detail-value">
                            {selectedBooking.participants} {selectedBooking.participants === 1 ? 'Person' : 'People'}
                          </span>
                        </div>
                      </div>
                      <div className="booking-modal-detail">
                        <div className="booking-modal-detail-icon"><CreditCard size={16} /></div>
                        <div>
                          <span className="booking-modal-detail-label">Total Paid</span>
                          <span className="booking-modal-detail-value booking-modal-price">${selectedBooking.price}</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="customer"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="booking-modal-customer"
                    >
                      <div className="booking-modal-customer-head">
                        <div className="booking-modal-avatar">
                          {selectedBooking.customer.firstName.charAt(0)}{selectedBooking.customer.lastName.charAt(0)}
                        </div>
                        <div>
                          <span className="booking-modal-customer-name">
                            {selectedBooking.customer.firstName} {selectedBooking.customer.lastName}
                          </span>
                          <span className="booking-modal-customer-sub">Lead traveler</span>
                        </div>
                      </div>

                      <div className="booking-modal-customer-list">
                        <div className="booking-modal-customer-row">
                          <Mail size={15} />
                          <span>{selectedBooking.customer.email}</span>
                        </div>
                        <div className="booking-modal-customer-row">
                          <Phone size={15} />
                          <span>{selectedBooking.customer.phone}</span>
                        </div>
                        <div className="booking-modal-customer-row">
                          <MapPin size={15} />
                          <span>
                            {[
                              selectedBooking.customer.addressLine1,
                              selectedBooking.customer.addressLine2,
                              selectedBooking.customer.city,
                              selectedBooking.customer.region,
                              selectedBooking.customer.postalCode,
                              selectedBooking.customer.country,
                            ].filter(Boolean).join(', ')}
                          </span>
                        </div>
                        {selectedBooking.customer.specialRequirements && (
                          <div className="booking-modal-customer-row">
                            <Info size={15} />
                            <span>{selectedBooking.customer.specialRequirements}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="booking-modal-footer">
                <Button className="booking-modal-close-btn" onClick={() => setSelectedBooking(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
