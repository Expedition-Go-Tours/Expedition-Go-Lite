import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { mockTourDetail, mockReviews, mockReviewStats } from '../../data/mockTourDetail'
import {
  recommendedTours, dayTours, topRatedTours,
  sellOutTours, lastMinuteDeals, multiDayTours
} from '../data'
import Navbar from '../Navbar'

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
import TourGuideCard from './TourGuideCard'
import InformationContact from './InformationContact'
import ReviewSummary from './ReviewSummary'
import ReviewList from './ReviewList'
import WriteReviewForm from './WriteReviewForm'
import RelatedTours from './RelatedTours'
import './TourDetailPage.css'

interface TourDetailPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
  onOpenDashboard?: () => void
  onOpenWishlist?: () => void
  onOpenBookings?: () => void
}

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function TourDetailPage({ onOpenAuth, onOpenDashboard, onOpenWishlist, onOpenBookings }: TourDetailPageProps) {
  const { tourId } = useParams<{ tourId: string }>()

  const allTours = [
    ...recommendedTours, ...dayTours, ...topRatedTours,
    ...sellOutTours, ...lastMinuteDeals,
  ]

  let matchedTour = allTours.find(t => toSlug(t.title) === tourId)

  if (!matchedTour) {
    matchedTour = (multiDayTours as any[]).find((t: any) => toSlug(t.title) === tourId)
  }

  const tour = matchedTour
    ? {
        ...mockTourDetail,
        id: tourId || mockTourDetail.id,
        slug: tourId || mockTourDetail.slug,
        title: matchedTour.title,
        location: matchedTour.location || mockTourDetail.location,
        duration: matchedTour.duration || (matchedTour as any).days || mockTourDetail.duration,
        rating: typeof matchedTour.rating === 'string' ? parseFloat(matchedTour.rating) : (matchedTour as any).rating,
        reviewCount: typeof matchedTour.reviews === 'number' ? matchedTour.reviews : mockTourDetail.reviewCount,
        price: typeof (matchedTour as any).price === 'string'
          ? parseInt((matchedTour as any).price.replace(/[^0-9]/g, ''), 10)
          : mockTourDetail.price,
        images: [matchedTour.image, ...mockTourDetail.images.slice(1)],
      }
    : mockTourDetail

  const reviews = mockReviews
  const reviewStats = mockReviewStats
  const relatedTours = recommendedTours.slice(0, 6)

  useEffect(() => {
    if (tour) {
      document.title = `${tour.title} | Expedition-Go Tours`
    }
    return () => {
      document.title = 'Expedition-Go Tours - Discover Amazing Tours'
    }
  }, [tour])

  if (!tour) {
    return (
      <div className="tour-detail-error">
        <h2>Tour not found</h2>
        <p>The tour you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <>
      <Navbar
        onOpenAuth={onOpenAuth}
        onOpenDashboard={onOpenDashboard}
        onOpenWishlist={onOpenWishlist}
        onOpenBookings={onOpenBookings}
      />
      <div className="tour-detail-page">
      <Breadcrumb tour={tour} />

      <div className="tour-detail-container">
        <div className="tour-detail-content">
          <div className="tour-detail-main">
            <TourImageGallery images={tour.images} title={tour.title} />
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

            <section id="reviews" className="tour-reviews-section">
              <h2 className="section-title">Guest Reviews</h2>
              <ReviewSummary stats={reviewStats} />
              <WriteReviewForm />
              <ReviewList reviews={reviews} />
            </section>
          </div>

          <aside className="tour-detail-sidebar">
            <BookingWidget tour={tour} />

            {tour.guide && (
              <TourGuideCard
                name={tour.guide.name}
                memberSince={tour.guide.memberSince}
                avatar={tour.guide.avatar}
              />
            )}

            {tour.contact && (
              <InformationContact
                email={tour.contact.email}
                website={tour.contact.website}
                phone={tour.contact.phone}
                fax={tour.contact.fax}
              />
            )}
          </aside>
        </div>
      </div>

      <RelatedTours tours={relatedTours} />
      </div>
    </>
  )
}
