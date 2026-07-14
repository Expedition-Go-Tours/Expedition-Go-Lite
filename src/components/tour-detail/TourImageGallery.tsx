import { useState, useRef, useEffect, useCallback } from 'react'
import PhotoViewerModal from './PhotoViewerModal'
import './TourImageGallery.css'

interface TourImageGalleryProps {
  images: string[]
  title: string
}

export default function TourImageGallery({ images, title }: TourImageGalleryProps) {
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [activeDot, setActiveDot] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
    setIsPhotoViewerOpen(true)
  }

  const scrollTo = useCallback((index: number) => {
    const el = carouselRef.current
    if (!el) return
    const child = el.children[index] as HTMLElement
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }
  }, [])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return

    const handleScroll = () => {
      const scrollLeft = el.scrollLeft
      const width = el.clientWidth
      const idx = Math.round(scrollLeft / width)
      setActiveDot(Math.min(idx, images.length - 1))
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => el.removeEventListener('scroll', handleScroll)
  }, [images.length])

  return (
    <>
      <div className="tour-image-gallery">
        {/* Mobile carousel */}
        <div className="tour-gallery-carousel" ref={carouselRef}>
          {images.map((img, idx) => (
            <div
              key={idx}
              className="tour-gallery-carousel-item"
              onClick={() => handleImageClick(idx)}
            >
              <img src={img} alt={`${title} ${idx + 1}`} loading={idx === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>

        <div className="tour-gallery-carousel-dots">
          {images.map((_, idx) => (
            <button
              key={idx}
              className={`tour-gallery-dot ${idx === activeDot ? 'active' : ''}`}
              onClick={() => scrollTo(idx)}
              aria-label={`Go to image ${idx + 1}`}
            />
          ))}
        </div>

        {/* Desktop grid */}
        <div className="tour-gallery-desktop">
          <div className="tour-gallery-main" onClick={() => handleImageClick(0)}>
            <img src={images[0]} alt={title} className="tour-main-image" loading="lazy" />
          </div>

          {images.length > 1 && (
            <div className="tour-gallery-grid">
              {images.slice(1, 5).map((img, idx) => (
                <div
                  key={idx}
                  className="tour-gallery-item"
                  onClick={() => handleImageClick(idx + 1)}
                >
                  <img src={img} alt={`${title} ${idx + 2}`} loading="lazy" />
                </div>
              ))}
            </div>
          )}
        </div>

        <span className="tour-gallery-counter" onClick={() => handleImageClick(0)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {images.length}
        </span>
      </div>

      <PhotoViewerModal
        images={images}
        initialIndex={selectedImageIndex}
        isOpen={isPhotoViewerOpen}
        onClose={() => setIsPhotoViewerOpen(false)}
        tourTitle={title}
      />
    </>
  )
}
