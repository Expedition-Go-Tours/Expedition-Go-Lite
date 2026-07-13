// import { useParams } from 'react-router-dom'
import { mockTourDetail } from '../../data/mockTourDetail'
import TourImageGallery from './TourImageGallery'
import TourHeader from './TourHeader'
import Breadcrumb from './Breadcrumb'
import TourOverview from './TourOverview'
import TourHighlights from './TourHighlights'
import IncludedExcluded from './IncludedExcluded'
import TourItinerary from './TourItinerary'
import TourInfo from './TourInfo'
import TourFAQ from './TourFAQ'
import TourLocationMap from './TourLocationMap'
import BookingWidget from './BookingWidget'
import './TourDetailPage.css'

export default function TourDetailPage() {
  // const { tourId } = useParams<{ tourId: string }>()
  
  // In production, fetch tour data based on tourId
  // For now, using mock data
  const tour = mockTourDetail

  if (!tour) {
    return (
      <div className="tour-detail-error">
        <h2>Tour not found</h2>
        <p>The tour you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <div className="tour-detail-page">
      <Breadcrumb tour={tour} />
      
      <div className="tour-detail-container">
        <TourImageGallery images={tour.images} videoUrl={tour.videoUrl} title={tour.title} />
        
        <div className="tour-detail-content">
          <div className="tour-detail-main">
            <TourHeader 
              title={tour.title}
              location={tour.location}
              rating={tour.rating}
              reviewCount={tour.reviewCount}
              tourId={tour.id}
            />
            
            <TourOverview description={tour.description} />
            
            <TourHighlights highlights={tour.highlights} />
            
            <IncludedExcluded included={tour.included} excluded={tour.excluded} />
            
            <TourItinerary itinerary={tour.itinerary} />
            
            <TourInfo 
              duration={tour.duration}
              languages={tour.languages}
              difficulty={tour.difficulty}
              groupSize={tour.groupSize}
            />
            
            <TourFAQ faqs={tour.faqs} />
            
            <TourLocationMap 
              coordinates={tour.coordinates}
              location={tour.location}
              title={tour.title}
            />
          </div>
          
          <aside className="tour-detail-sidebar">
            <BookingWidget 
              tour={tour}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
