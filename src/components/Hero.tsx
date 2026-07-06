import { useState, useCallback, useRef } from 'react'
import HeroCarousel from './HeroCarousel'
import SearchBar from './SearchBar'
import PaginationDots from './PaginationDots'
import './Hero.css'

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const heroRef = useRef<HTMLElement>(null)

  const handleIndexChange = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  return (
    <section className="hero" ref={heroRef}>
      <HeroCarousel activeIndex={activeIndex} onIndexChange={handleIndexChange} />
      <div className="hero-overlay" />
      <div className="hero-content">
        <h1 className="hero-headline">Your Next Adventure Awaits.</h1>
        <p className="hero-tagline">Curated tours. Unforgettable memories.</p>
        <SearchBar />
        <PaginationDots total={5} active={activeIndex} onDotClick={handleIndexChange} />
      </div>
    </section>
  )
}
