import { useRef } from 'react'
import './MoodSection.css'

const MOOD_CATEGORIES = [
  { id: 'adventure', title: 'Adventure', tag: 'Thrill', count: 15, image: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?auto=format&fit=crop&w=600&q=80' },
  { id: 'cultural', title: 'Cultural', tag: 'Heritage', count: 20, image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80' },
  { id: 'nature', title: 'Nature', tag: 'Escape', count: 18, image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80' },
  { id: 'beach', title: 'Beach', tag: 'Sun & Sea', count: 12, image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
  { id: 'wildlife', title: 'Wildlife', tag: 'Safari', count: 10, image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=80' },
  { id: 'city-tours', title: 'City Tours', tag: 'Urban', count: 22, image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80' },
  { id: 'food-drinks', title: 'Food & Drinks', tag: 'Taste', count: 9, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80' },
  { id: 'wellness', title: 'Wellness', tag: 'Recharge', count: 7, image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80' },
]

export default function MoodSection() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 900
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="mood-section">
      <div className="mood-container">
        <div className="mood-header">
          <h2 className="mood-title">What do you want to do?</h2>
          <div className="mood-arrows">
            <button className="mood-arrow" onClick={() => scroll('left')} aria-label="Scroll left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button className="mood-arrow" onClick={() => scroll('right')} aria-label="Scroll right">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mood-carousel" ref={scrollRef}>
          {MOOD_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="mood-card"
              style={{ backgroundImage: `url(${cat.image})` }}
            >
              <span className="mood-tag">{cat.tag}</span>
              <span className="mood-count">{cat.count} tours</span>
              <div className="mood-gradient" />
              <div className="mood-footer">
                <h3 className="mood-card-title">{cat.title}</h3>
                <div className="mood-arrow-btn">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
