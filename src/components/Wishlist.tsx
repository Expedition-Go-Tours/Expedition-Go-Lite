import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import { useWishlist } from '../context/WishlistContext'
import { useTranslation } from 'react-i18next'
import './Wishlist.css'

export default function Wishlist() {
  const { t } = useTranslation()
  const { wishlist: wishlistItems, removeFromWishlist } = useWishlist()

  const handleRemove = (id: string) => {
    removeFromWishlist(id)
  }

  const handleBookNow = (_id: string) => {
    // Navigate to booking page or open booking modal
  }

  return (
    <div className="wishlist-container">
      {wishlistItems.length === 0 ? (
        <motion.div
          className="empty-state"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
          }}
        >
          {/* Animated heart with pulsing halo and floating sparkles */}
          <motion.div
            className="empty-icon-wrap"
            variants={{
              hidden: { opacity: 0, scale: 0.6 },
              visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 14 } },
            }}
          >
            {/* Pulsing halo rings */}
            <motion.span
              className="empty-halo"
              animate={{ scale: [1, 1.5, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="empty-halo empty-halo-2"
              animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0, 0.25] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            />

            {/* Floating, gently beating heart */}
            <motion.div
              className="empty-heart"
              animate={{ y: [0, -8, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </motion.div>

            {/* Twinkling sparkles */}
            {[
              { top: '4%', left: '12%', size: 10, delay: 0 },
              { top: '18%', right: '8%', size: 8, delay: 0.5 },
              { bottom: '10%', left: '4%', size: 7, delay: 1 },
              { bottom: '2%', right: '16%', size: 9, delay: 1.4 },
            ].map((s, i) => (
              <motion.svg
                key={i}
                className="empty-sparkle"
                style={{ top: s.top, left: s.left, right: s.right, bottom: s.bottom, width: s.size, height: s.size }}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 90, 180] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
              >
                <path d="M12 0l2.6 8.4L23 11l-8.4 2.6L12 22l-2.6-8.4L1 11l8.4-2.6z" />
              </motion.svg>
            ))}
          </motion.div>

          <motion.h3
            className="empty-title"
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            {t('wishlist.empty')}
          </motion.h3>
          <motion.p
            className="empty-text"
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            {t('wishlist.emptyDesc')}
          </motion.p>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Button onClick={() => window.location.href = '/'} className="empty-cta">
              {t('wishlist.exploreTours')}
            </Button>
          </motion.div>
        </motion.div>
      ) : (
        <>
          <div className="wishlist-header">
            <div className="wishlist-count">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{wishlistItems.length} {wishlistItems.length === 1 ? t('wishlist.tourSaved') : t('wishlist.toursSaved')}</span>
            </div>
          </div>

          <div className="wishlist-grid">
            <AnimatePresence mode="popLayout">
              {wishlistItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="wishlist-card"
                >
                  <div className="wishlist-card-image">
                    <img src={item.imageUrl} alt={item.title} />
                    <button
                      className="wishlist-remove-btn"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove from wishlist"
                      title="Remove from wishlist"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                    <div className="wishlist-card-badge">{item.duration}</div>
                  </div>

                  <div className="wishlist-card-content">
                    <div className="wishlist-card-header">
                      <h3 className="wishlist-card-title">{item.title}</h3>
                      <div className="wishlist-card-location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{item.location}</span>
                      </div>
                    </div>

                    <div className="wishlist-card-meta">
                      <div className="wishlist-card-rating">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span className="rating-value">
                          {(Number.isFinite(Number(item.rating)) ? Number(item.rating) : 0).toFixed(1)}
                        </span>
                        <span className="rating-count">({Number(item.reviewCount) || 0})</span>
                      </div>

                      <div className="wishlist-card-price">
                        <span className="price-label">{t('common.from')}</span>
                        <span className="price-value">${item.price}</span>
                      </div>
                    </div>

                    <div className="wishlist-card-footer">
                      <span className="wishlist-added-date">
                        Added {new Date(item.addedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <Button
                        onClick={() => handleBookNow(item.id)}
                        className="wishlist-book-btn"
                        size="sm"
                      >
                        {t('tourDetail.bookNow')}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  )
}
