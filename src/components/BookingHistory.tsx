import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import './BookingHistory.css'

type BookingStatus = 'All' | 'Pending' | 'Completed' | 'Incomplete' | 'Cancelled' | 'Cancelling'

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
    price: 240
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
    price: 1000
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
    price: 255
  }
]

export default function BookingHistory() {
  const [activeTab, setActiveTab] = useState<BookingStatus>('All')

  const tabs: BookingStatus[] = ['All', 'Pending', 'Completed', 'Incomplete', 'Cancelled', 'Cancelling']

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
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
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
                    <Button size="sm" className="booking-view-btn">
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
    </div>
  )
}
