import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import HeroCarousel from './HeroCarousel'
import SearchBar from './SearchBar'
import PaginationDots from './PaginationDots'
import './Hero.css'

export default function Hero() {
  const { t } = useTranslation()
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
        <h1 className="hero-headline">{t('hero.title')}</h1>
        <p className="hero-tagline">{t('hero.subtitle')}</p>
        <SearchBar />
        <PaginationDots total={5} active={activeIndex} onDotClick={handleIndexChange} />
      </div>
    </section>
  )
}
