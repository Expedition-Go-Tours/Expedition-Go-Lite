import { useState } from 'react'
import './PopularLocationCard.css'
import type { Destination } from './data'

interface PopularLocationCardProps extends Destination {}

export default function PopularLocationCard({ title, tours, image }: PopularLocationCardProps) {
  const [liked, setLiked] = useState(false)

  return (
    <a href="#" className="popular-location-card">
      <div className="popular-location-image">
        <img src={image} alt={title} loading="lazy" />
        <div className="popular-location-gradient" />
        <button
          className={`popular-location-heart${liked ? ' liked' : ''}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked) }}
          aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? '#ef4444' : 'none'} stroke={liked ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <div className="popular-location-info">
          <h3 className="popular-location-title">{title}</h3>
          <span className="popular-location-tours">{tours}</span>
        </div>
      </div>
    </a>
  )
}
