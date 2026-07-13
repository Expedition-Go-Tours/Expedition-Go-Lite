import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import { useWishlist } from '../context/WishlistContext'
import './Wishlist.css'

export default function Wishlist() {
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
        <div className="empty-state">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="empty-icon"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <h3 className="empty-title">Your Wishlist is Empty</h3>
          <p className="empty-text">
            Save your favorite tours and experiences to your wishlist for easy access later
          </p>
          <Button onClick={() => window.location.href = '/'} className="empty-cta">
            Explore Tours
          </Button>
        </div>
      ) : (
        <>
          <div className="wishlist-header">
            <div className="wishlist-count">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{wishlistItems.length} {wishlistItems.length === 1 ? 'Item' : 'Items'} Saved</span>
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
                        <span className="rating-value">{item.rating}</span>
                        <span className="rating-count">({item.reviewCount})</span>
                      </div>

                      <div className="wishlist-card-price">
                        <span className="price-label">From</span>
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
                        Book Now
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
