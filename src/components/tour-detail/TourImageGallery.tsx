import { useState } from 'react'
import PhotoViewerModal from './PhotoViewerModal'
import VideoModal from './VideoModal'
import './TourImageGallery.css'

interface TourImageGalleryProps {
  images: string[]
  videoUrl?: string
  title: string
}

export default function TourImageGallery({ images, videoUrl, title }: TourImageGalleryProps) {
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
    setIsPhotoViewerOpen(true)
  }

  const handleVideoClick = () => {
    setIsVideoModalOpen(true)
  }

  return (
    <>
      <div className="tour-image-gallery">
        <div className="tour-gallery-main" onClick={() => handleImageClick(0)}>
          <img src={images[0]} alt={title} className="tour-main-image" />
          {videoUrl && (
            <button 
              className="tour-video-btn" 
              onClick={(e) => {
                e.stopPropagation()
                handleVideoClick()
              }}
              aria-label="Play video"
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="white" opacity="0.9" />
                <polygon points="10 8 16 12 10 16" fill="#179237" />
              </svg>
            </button>
          )}
        </div>
        {images.length > 1 && (
          <div className="tour-gallery-grid">
            {images.slice(1, 5).map((img, idx) => (
              <div 
                key={idx} 
                className="tour-gallery-item"
                onClick={() => handleImageClick(idx + 1)}
              >
                <img src={img} alt={`${title} ${idx + 2}`} />
                {idx === 3 && images.length > 5 && (
                  <div className="tour-gallery-overlay">
                    <span>+{images.length - 5} Photos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      <PhotoViewerModal
        images={images}
        initialIndex={selectedImageIndex}
        isOpen={isPhotoViewerOpen}
        onClose={() => setIsPhotoViewerOpen(false)}
        tourTitle={title}
      />

      {/* Video Modal */}
      <VideoModal
        videoUrl={videoUrl}
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        tourTitle={title}
      />
    </>
  )
}
