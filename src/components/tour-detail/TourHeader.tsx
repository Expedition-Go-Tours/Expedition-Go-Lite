import { useState } from 'react'
import { useWishlist } from '../../context/WishlistContext'
import './TourHeader.css'

interface TourHeaderProps {
  title: string
  location: string
  rating: number
  reviewCount: number
  tourId: string
}

export default function TourHeader({ 
  title, 
  location, 
  rating, 
  reviewCount,
  tourId 
}: TourHeaderProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const [isAnimating, setIsAnimating] = useState(false)
  
  const inWishlist = isInWishlist(tourId)

  const handleWishlistToggle = () => {
    setIsAnimating(true)
    if (inWishlist) {
      removeFromWishlist(tourId)
    } else {
      // In production, create proper WishlistItem from tour data
      addToWishlist({
        id: tourId,
        title,
        location,
        price: 300,
        duration: '2 days',
        imageUrl: '',
        rating,
        reviewCount,
        addedDate: new Date().toISOString(),
      })
    }
    setTimeout(() => setIsAnimating(false), 300)
  }

  const scrollToReviews = () => {
    const reviewsSection = document.getElementById('tour-reviews')
    if (reviewsSection) {
      reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <header className="tour-header">
      <div className="tour-header-top">
        <h1 className="tour-title">{title}</h1>
        <button 
          className={`tour-wishlist-btn ${inWishlist ? 'active' : ''} ${isAnimating ? 'animating' : ''}`}
          onClick={handleWishlistToggle}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="tour-meta">
        <div className="tour-rating" onClick={scrollToReviews} role="button" tabIndex={0}>
          <div className="tour-stars">
            {[...Array(5)].map((_, index) => (
              <svg 
                key={index} 
                className={`tour-star ${index < rating ? 'filled' : ''}`}
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill={index < rating ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          <span className="tour-rating-text">
            {rating} ({reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'})
          </span>
        </div>

        <div className="tour-location">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{location}</span>
        </div>
      </div>
    </header>
  )
}
