import { useEffect, useCallback } from 'react'
import './HeroCarousel.css'

const images = [
  new URL('../assets/images/QuadBiking.webp', import.meta.url).href,
  new URL('../assets/images/painting.webp', import.meta.url).href,
  new URL('../assets/images/newlaidywhyte.webp', import.meta.url).href,
  new URL('../assets/images/Laughter.webp', import.meta.url).href,
  new URL('../assets/images/kuturedance.webp', import.meta.url).href,
]

interface HeroCarouselProps {
  activeIndex: number
  onIndexChange: (index: number) => void
}

export default function HeroCarousel({ activeIndex, onIndexChange }: HeroCarouselProps) {
  const nextSlide = useCallback(() => {
    onIndexChange((activeIndex + 1) % images.length)
  }, [activeIndex, onIndexChange])

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [nextSlide])

  return (
    <div className="hero-carousel">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`carousel-slide${i === activeIndex ? ' active' : ''}`}
          draggable={false}
        />
      ))}
    </div>
  )
}

export { images }
