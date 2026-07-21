import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Image, Upload, Heart, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PhotoViewerModal from './PhotoViewerModal'
import GalleryDialog from './GalleryDialog'
import './TourImageGallery.css'

interface TourImageGalleryProps {
  images: string[]
  title: string
  fallbackImage?: string
  isFavorited?: boolean
  onWishlistToggle?: () => void
  onShare?: () => void
  showStickyHeader?: boolean
}

export default function TourImageGallery({
  images,
  title,
  fallbackImage,
  isFavorited,
  onWishlistToggle,
  onShare,
  showStickyHeader,
}: TourImageGalleryProps) {
  const navigate = useNavigate()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const touchStartXRef = useRef<number | null>(null)
  const thumbnailImages = images.slice(0, 4)

  const showNext = () => {
    if (images.length === 0) return
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const showPrev = () => {
    if (images.length === 0) return
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current
    if (startX === null) return
    const endX = e.changedTouches[0]?.clientX ?? startX
    const deltaX = endX - startX
    if (Math.abs(deltaX) > 45) {
      if (deltaX < -45) showNext()
      if (deltaX > 45) showPrev()
    }
    touchStartXRef.current = null
  }

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.dataset.exhausted) return
    if (fallbackImage && e.currentTarget.src !== fallbackImage) {
      e.currentTarget.src = fallbackImage
      e.currentTarget.dataset.exhausted = 'true'
    }
  }, [fallbackImage])

  return (
    <>
      <div className="tour-image-gallery-new">
        {/* Desktop thumbnail strip */}
        <div className="tour-gallery-thumbnails">
          {thumbnailImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentImageIndex(idx)}
              className={`tour-gallery-thumb ${idx === currentImageIndex ? 'active' : ''}`}
              aria-label={`Show image ${idx + 1}`}
            >
              <img
                src={img || fallbackImage}
                alt=""
                onError={handleImageError}
              />
            </button>
          ))}
        </div>

        {/* Main image */}
        <div
          className="tour-gallery-main-image"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="tour-gallery-main-track"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img || fallbackImage}
                alt={`${title} ${idx + 1}`}
                onError={handleImageError}
                className="tour-gallery-main-slide"
              />
            ))}
          </div>

          {/* Overlay back button */}
          <div className={`tour-gallery-overlay-top-left ${showStickyHeader ? 'hidden' : ''}`}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="tour-gallery-overlay-btn"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          {/* Overlay action buttons */}
          <div className="tour-gallery-overlay-top-right">
            <button
              type="button"
              onClick={onShare}
              className="tour-gallery-overlay-btn"
              aria-label="Share"
            >
              <Upload size={20} />
            </button>
            <button
              type="button"
              onClick={onWishlistToggle}
              className="tour-gallery-overlay-btn"
              aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isFavorited}
            >
              <Heart
                size={24}
                className={isFavorited ? 'wishlist-active' : ''}
              />
            </button>
          </div>

          {/* Nav arrows */}
          <button
            type="button"
            onClick={showPrev}
            className="tour-gallery-nav-arrow left"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={showNext}
            className="tour-gallery-nav-arrow right"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>

          {/* View all button */}
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="tour-gallery-view-all"
          >
            <Image size={14} />
            View All
          </button>

          {/* Mobile dot pagination */}
          <div className="tour-gallery-dots">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentImageIndex(idx)}
                className={`tour-gallery-dot ${idx === currentImageIndex ? 'active' : ''}`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <GalleryDialog
        open={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
        images={images}
        initialIndex={currentImageIndex}
        fallbackImage={fallbackImage}
        onImageError={handleImageError}
      />

      <PhotoViewerModal
        images={images}
        initialIndex={currentImageIndex}
        isOpen={false}
        onClose={() => {}}
        tourTitle={title}
      />
    </>
  )
}
