import { useEffect, useCallback } from 'react'
import './HeroCarousel.css'

const images = [
  new URL('../assets/images/Image01.webp', import.meta.url).href,
  new URL('../assets/images/IMG_3538.webp', import.meta.url).href,
  new URL('../assets/images/QuadBiking.webp', import.meta.url).href,
  new URL('../assets/images/painting.webp', import.meta.url).href,
  new URL('../assets/images/Image04.webp', import.meta.url).href,
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

  // Preload the first hero image so the browser discovers it before CSS
  // parsing — critical for LCP. The link is removed on unmount.
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = images[0]
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  return (
    <div className="hero-carousel">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`carousel-slide${i === activeIndex ? ' active' : ''}${i === 4 ? ' shift-down' : ''}`}
          width={1920}
          height={1080}
          decoding="async"
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchPriority={i === 0 ? 'high' : undefined}
          draggable={false}
        />
      ))}
    </div>
  )
}

export { images }
