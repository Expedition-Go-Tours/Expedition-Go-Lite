import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarCheck, Clock, Users, CreditCard, UserCheck, Bus,
} from 'lucide-react'
import { mockTourDetail, mockReviews } from '../../data/mockTourDetail'
import {
  recommendedTours, dayTours, topRatedTours,
  sellOutTours, lastMinuteDeals, multiDayTours,
} from '../data'
import Navbar from '../Navbar'
import Footer from '../Footer'
import { useContinuePlanning, toContinuePlanningItem } from '../../context/ContinuePlanningContext'
import { useWishlist } from '../../context/WishlistContext'
import { toast } from 'sonner'

import TourImageGallery from './TourImageGallery'
import TourHeader from './TourHeader'
import BookingWidget from './BookingWidget'
import RelatedTours from './RelatedTours'

import TourDetailTabs from './TourDetailTabs'
import OverviewSection from './OverviewSection'
import DetailsSection, {
  buildIncludedExcludedContent,
  buildAboutContent,
  buildMeetingContent,
  buildAccessibilityContent,
  buildCancellationContent,
} from './DetailsSection'
import TourItinerary from './TourItinerary'
import ReviewsSection from './ReviewsSection'
import SupplierSection from './SupplierSection'

import './TourDetailPage.css'

interface TourDetailPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
  onOpenDashboard?: () => void
  onOpenWishlist?: () => void
  onOpenBookings?: () => void
}

const TOUR_DETAIL_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'details', label: 'Details' },
  { key: 'itinerary', label: 'Itinerary' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'supplier', label: 'Supplier' },
]

const EXTERNAL_FALLBACK_IMAGES = [
  'https://ecotourghana.com/img/n10.jpg',
  'https://grassroottours.com/wp-content/uploads/2019/04/IMG_5843-370x260.jpg',
  'https://images.squarespace-cdn.com/content/v1/65cfd1369377d32bcd0051fa/1713964352006-GG68CSEC76Z06G1JZBFQ/Accra+City+Tour-+Sheeda+Travel+Tribe.jpg',
  'https://images.squarespace-cdn.com/content/v1/65cfd1369377d32bcd0051fa/f0eaf879-3685-41fb-ba88-5fbab02dda4a/Travel+to+Ghana-+Sheeda+Travel+Tribe.jpg',
]

const OVERVIEW_HIGHLIGHTS_DEFAULT: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; desc: string | null }[] = [
  { icon: CalendarCheck, title: 'Free cancellation', desc: 'Cancel up to 24 hours in advance for a full refund' },
  { icon: Clock, title: 'Duration Flexible', desc: 'Check availability to see starting times' },
  { icon: Users, title: 'Live tour guide', desc: 'English' },
  { icon: CreditCard, title: 'Reserve now & pay later', desc: 'Keep your travel plans flexible — book your spot and pay nothing today.' },
  { icon: UserCheck, title: 'Skip the line through a separate entrance', desc: null },
  { icon: Bus, title: 'Pickup included', desc: 'Check availability for details' },
]

const DESCRIPTION_STEPS = [
  {
    title: 'Start Your Journey from Accra to Cape Coast:',
    body: 'Set out from Accra on a scenic drive of approximately three hours along the coast. Along the way you\'ll pass villages, palm-lined roads, and ocean views as you head toward one of Ghana\'s most historic regions.',
  },
  {
    title: 'Experience the Adventure of Kakum National Park:',
    body: 'Trek through lush rainforest and cross the famous canopy walkway suspended high above the forest floor. Your guide will point out birds, butterflies, and the rich biodiversity that makes Kakum a highlight for nature lovers.',
  },
  {
    title: 'Discover the History of Elmina Castle:',
    body: 'Visit Elmina Castle (St. George\'s Castle), a UNESCO World Heritage site and one of the oldest European buildings in sub-Saharan Africa. Learn about its role in trade and the trans-Atlantic slave trade with time to reflect on this powerful history.',
  },
  {
    title: 'Explore Cape Coast Castle and Township:',
    body: 'Continue to Cape Coast Castle to tour the chambers, courtyards, and museum exhibits. Your guide shares stories of resilience and remembrance before you have a chance to explore the surrounding township and coastal atmosphere.',
  },
  {
    title: 'Drive Back to Accra:',
    body: 'After a full day of culture, history, and nature, relax on the return drive to Accra with drop-off at your hotel or agreed meeting point, carrying memories of Ghana\'s Central Region.',
  },
]

const DUMMY_REVIEWS = [
  { id: 'dummy-1', name: 'Sarah Johnson', date: 'Mar 2026', rating: 5, text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', country: 'United States' },
  { id: 'dummy-2', name: 'Michael Chen', date: 'Feb 2026', rating: 4, text: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', country: 'United States' },
  { id: 'dummy-3', name: 'Emma Williams', date: 'Jan 2026', rating: 5, text: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores.', country: 'United States' },
  { id: 'dummy-4', name: 'James Rodriguez', date: 'Dec 2025', rating: 4, text: 'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.', country: 'United States' },
  { id: 'dummy-5', name: 'Olivia Brown', date: 'Nov 2025', rating: 5, text: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.', country: 'United States' },
  { id: 'dummy-6', name: 'David Kim', date: 'Oct 2025', rating: 3, text: 'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', country: 'United States' },
]

const QA_ITEMS = [
  { asker: 'Mish', question: 'What is the pick up and drop off time? I land at 6am and have a 8pm returning flight.', answer: 'Contact the operator to confirm shorter versions of the tour and custom pickup timing.' },
  { asker: 'Charlie B', question: 'Hello what time is pick up and return from Accra?', answer: 'Pickup is usually early morning and return timing depends on traffic and selected stops.' },
]

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function TourDetailPage({ onOpenAuth, onOpenDashboard, onOpenWishlist, onOpenBookings }: TourDetailPageProps) {
  const { tourId } = useParams<{ tourId: string }>()
  const navigate = useNavigate()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const { addToContinuePlanning } = useContinuePlanning()

  const allTours = useMemo(() => [
    ...recommendedTours, ...dayTours, ...topRatedTours,
    ...sellOutTours, ...lastMinuteDeals,
  ], [])

  const matchedTour = useMemo(() => {
    const found = allTours.find(t => toSlug(t.title) === tourId)
    if (found) return found
    return (multiDayTours as any[]).find((t: any) => toSlug(t.title) === tourId)
  }, [allTours, tourId])

  const tour = useMemo(() => matchedTour
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
    : mockTourDetail, [matchedTour, tourId])

  const reviews = mockReviews
  const relatedTours = recommendedTours.slice(0, 6)

  const slug = tourId || tour.slug
  const selectedTourTitle = tour.title
  const selectedTourRating = tour.rating
  const selectedTourReviews = tour.reviewCount

  const mergedImages = useMemo(() => {
    const seen = new Set<string>()
    const all = [
      ...(tour.images || []),
      ...EXTERNAL_FALLBACK_IMAGES,
    ]
    return all.filter((url) => {
      const key = String(url || '').toLowerCase().replace(/[?#].*$/, '').replace(/\/$/, '')
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [tour.images])

  useEffect(() => {
    if (tour) {
      document.title = `${tour.title} | Expedition-Go Tours`
    }
    if (matchedTour) {
      addToContinuePlanning(toContinuePlanningItem(matchedTour as any))
    }
    return () => {
      document.title = 'Expedition-Go Tours - Discover Amazing Tours'
    }
  }, [tour, matchedTour, addToContinuePlanning])

  const pricingRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [reviewDetail, setReviewDetail] = useState<any>(null)
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false)
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false)
  const [replyTarget, setReplyTarget] = useState<any>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyConfirmation, setReplyConfirmation] = useState('')
  const [reviewStarFilter, setReviewStarFilter] = useState<number | null>(null)
  const [reviewSearchQuery, setReviewSearchQuery] = useState('')
  const [supplierInfoOpen, setSupplierInfoOpen] = useState(false)
  const [hasMoreReviews, setHasMoreReviews] = useState(false)
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false)

  useEffect(() => {
    setActiveTab('overview')
    setReviewStarFilter(null)
    setReviewSearchQuery('')
  }, [tourId])



  const isFavorited = isInWishlist(selectedTourTitle)

  const handleWishlistToggle = () => {
    if (isFavorited) {
      removeFromWishlist(selectedTourTitle)
      toast.success('Removed from wishlist')
    } else {
      addToWishlist({
        id: selectedTourTitle,
        title: selectedTourTitle,
        location: tour.location,
        price: tour.price,
        duration: tour.duration,
        imageUrl: mergedImages[0] || '',
        rating: Number(selectedTourRating) || 0,
        reviewCount: Number(selectedTourReviews) || 0,
        addedDate: new Date().toISOString(),
      })
      toast.success('Added to wishlist')
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: selectedTourTitle, url: window.location.href })
      } else {
        await navigator.clipboard?.writeText(window.location.href)
      }
    } catch { /* ignore */ }
  }

  const handleWriteReview = () => {
    navigate(`/review/${encodeURIComponent(slug)}`, {
      state: {
        returnTo: `/tour/${slug}#reviews`,
        tour: {
          title: selectedTourTitle,
          slug,
          rating: selectedTourRating,
          reviews: selectedTourReviews,
          duration: tour.duration,
          price: tour.price,
          image: mergedImages[0],
          images: mergedImages.slice(0, 5),
          location: tour.location || 'Accra, Ghana',
          tourId: tour.id,
          supplierName: 'Expedition-Go Tours Ltd',
          supplierLogo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=120&q=80',
        },
      },
    })
  }

  const handleReviewsTab = () => setActiveTab('reviews')

  const loadMoreReviews = async () => {
    setLoadingMoreReviews(true)
    setTimeout(() => {
      setHasMoreReviews(false)
      setLoadingMoreReviews(false)
    }, 800)
  }

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyMessage.trim()) return
    setReplyConfirmation('Your reply has been accepted and is ready to be sent to the customer.')
    setReplyMessage('')
  }

  const allReviewCards = useMemo(() => {
    const apiCards = reviews.map((r) => ({
      id: r.id,
      name: r.author,
      tag: r.verified ? 'Verified' : 'Traveler',
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      rating: r.rating,
      text: r.content,
      title: r.title,
    }))
    return apiCards
  }, [reviews])

  const filteredReviewCards = useMemo(() => {
    const q = reviewSearchQuery.trim().toLowerCase()
    return allReviewCards.filter((r) => {
      if (reviewStarFilter !== null && r.rating !== reviewStarFilter) return false
      if (!q) return true
      return r.text.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    })
  }, [allReviewCards, reviewSearchQuery, reviewStarFilter])

  const reviewBreakdown = useMemo(() => {
    const labels = [
      { label: '5 stars', stars: 5 },
      { label: '4 stars', stars: 4 },
      { label: '3 stars', stars: 3 },
      { label: '2 stars', stars: 2 },
      { label: '1 star', stars: 1 },
    ]
    return labels.map((item) => ({ ...item, count: 0, percentage: 0 }))
  }, [])

  const convertPrice = (price: number) => ({
    formatted: `$${price.toLocaleString()}`,
    value: price,
  })

  const overviewHighlightsGrid = OVERVIEW_HIGHLIGHTS_DEFAULT

  const descriptionSteps = DESCRIPTION_STEPS
  const highlights = tour.highlights || []

  const infoSections = [
    {
      key: 'included',
      title: 'Included',
      content: buildIncludedExcludedContent(tour.included, tour.excluded),
    },
    {
      key: 'expect',
      title: 'About this tour',
      content: buildAboutContent(tour.description),
    },
    {
      key: 'pickup',
      title: 'Meeting and pickup',
      content: buildMeetingContent('', 'Pickup details are confirmed after booking.'),
    },
    {
      key: 'accessibility',
      title: 'Accessibility',
      content: buildAccessibilityContent('', '', ''),
    },
    {
      key: 'policy',
      title: 'Cancellation policy',
      content: buildCancellationContent(undefined, tour.cancellationPolicy || ''),
    },
  ]

  const supplierData = {
    name: 'Expedition-Go Tours Ltd',
    logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=120&q=80',
    description: 'Expedition-Go Tours Ltd offers authentic guided experiences across Ghana, showcasing the country\'s rich culture, history, and natural beauty.',
    rating: 4.8,
    totalTours: relatedTours.length,
    phone: '+233 20 123 4567',
    email: 'info@expeditiongo.com',
    website: 'https://expeditiongo.com',
    address: 'Accra, Ghana',
  }

  const supplierTours = relatedTours.map((t) => ({
    title: t.title,
    slug: toSlug(t.title),
    image: t.image,
    duration: t.duration,
    price: parseInt(String(t.price).replace(/[^0-9]/g, ''), 10) || 100,
    rating: t.rating,
    reviews: t.reviews,
  }))

  const handleNavigateTour = (slug: string) => {
    navigate(`/tour/${encodeURIComponent(slug)}`)
  }

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
        <div className="tour-detail-container">
          <div className="tour-detail-content">
            <div className="tour-detail-main">
              <div className="tour-detail-header-row">
                <TourHeader
                  title={selectedTourTitle}
                  rating={selectedTourRating}
                  reviewCount={selectedTourReviews}
                  onReviewsClick={handleReviewsTab}
                />
                <button
                  type="button"
                  onClick={handleWriteReview}
                  className="tour-detail-write-review-btn"
                >
                  Write a review
                </button>
              </div>

              <TourImageGallery
                images={mergedImages}
                title={selectedTourTitle}
                fallbackImage={mergedImages[0]}
                isFavorited={isFavorited}
                onWishlistToggle={handleWishlistToggle}
                onShare={handleShare}
              />
            </div>

            <aside className="tour-detail-sidebar" ref={pricingRef}>
              <BookingWidget tour={tour as any} />
            </aside>

            <div className="tour-detail-bottom">
              {/* Tab Navigation */}
              <TourDetailTabs
                tabs={TOUR_DETAIL_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {/* Tab Content */}
              <div className="tour-detail-tab-content">
                <AnimatePresence mode="wait">
                  {activeTab === 'overview' && (
                    <OverviewSection
                      key="overview"
                      highlightsGrid={overviewHighlightsGrid}
                      descriptionSteps={descriptionSteps}
                      highlights={highlights}
                      reviews={DUMMY_REVIEWS}
                      onTabChange={setActiveTab}
                      onReviewReadMore={setReviewDetail}
                    />
                  )}

                  {activeTab === 'details' && (
                    <DetailsSection
                      key="details"
                      sections={infoSections}
                    />
                  )}

                  {activeTab === 'itinerary' && (
                    <TourItinerary
                      key="itinerary"
                      itinerary={tour.itinerary}
                      coordinates={tour.coordinates}
                      location={tour.location}
                      title={selectedTourTitle}
                    />
                  )}

                  {activeTab === 'reviews' && (
                    <ReviewsSection
                      key="reviews"
                      rating={selectedTourRating}
                      reviewCount={selectedTourReviews}
                      reviewBreakdown={reviewBreakdown}
                      reviews={filteredReviewCards}
                      hasMore={hasMoreReviews}
                      loadingMore={loadingMoreReviews}
                      onLoadMore={loadMoreReviews}
                      onWriteReview={handleWriteReview}
                      onReplyToQuestion={(item) => {
                        setReplyTarget(item)
                        setIsReplyDialogOpen(true)
                      }}
                      qaItems={QA_ITEMS}
                      starFilter={reviewStarFilter}
                      onStarFilterChange={setReviewStarFilter}
                      searchQuery={reviewSearchQuery}
                      onSearchQueryChange={setReviewSearchQuery}
                    />
                  )}

                  {activeTab === 'supplier' && (
                    <SupplierSection
                      key="supplier"
                      name={supplierData.name}
                      logo={supplierData.logo}
                      description={supplierData.description}
                      rating={supplierData.rating}
                      totalTours={supplierData.totalTours}
                      phone={supplierData.phone}
                      email={supplierData.email}
                      website={supplierData.website}
                      address={supplierData.address}
                      tours={supplierTours}
                      infoOpen={supplierInfoOpen}
                      onToggleInfo={() => setSupplierInfoOpen((v) => !v)}
                      onOpenInfo={() => setSupplierInfoOpen(true)}
                      onNavigateTour={handleNavigateTour}
                      formatPrice={convertPrice}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Similar Experiences */}
          <RelatedTours tours={relatedTours} />
        </div>
      </div>

      <Footer />

      {/* Review Detail Dialog */}
      <AnimatePresence>
        {reviewDetail && (
          <motion.div
            className="dialog-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setReviewDetail(null)}
          >
            <motion.div
              className="dialog-content"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dialog-header">
                <h3 className="dialog-title">Review details</h3>
                <button type="button" onClick={() => setReviewDetail(null)} className="dialog-close">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="dialog-body">
                <div className="review-detail-avatar">
                  {reviewDetail.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <p className="review-detail-name">{reviewDetail.name}</p>
                <p className="review-detail-date">{reviewDetail.date}</p>
                <div className="review-detail-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`star ${i < reviewDetail.rating ? 'filled' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill={i < reviewDetail.rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <p className="review-detail-text">{reviewDetail.text}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Dialog */}
      {isReplyDialogOpen && (
        <div className="dialog-overlay" onClick={() => setIsReplyDialogOpen(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">Reply to customer comment</h3>
              <button type="button" onClick={() => setIsReplyDialogOpen(false)} className="dialog-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="dialog-body">
              {replyTarget && (
                <div className="reply-target">
                  <p className="reply-target-asker">{replyTarget.asker}</p>
                  <p className="reply-target-question">{replyTarget.question}</p>
                </div>
              )}
              <form onSubmit={handleReplySubmit} className="reply-form">
                <label htmlFor="reply-textarea" className="reply-label">Your reply</label>
                <textarea
                  id="reply-textarea"
                  value={replyMessage}
                  onChange={(e) => { setReplyMessage(e.target.value); setReplyConfirmation('') }}
                  rows={5}
                  placeholder="Write a helpful reply for the customer..."
                  className="reply-textarea"
                />
                {replyConfirmation && <p className="reply-confirmation">{replyConfirmation}</p>}
                <div className="reply-actions">
                  <button type="button" onClick={() => setIsReplyDialogOpen(false)} className="reply-cancel">Cancel</button>
                  <button type="submit" disabled={!replyMessage.trim()} className="reply-submit">Accept reply</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Write Review Dialog */}
      {isWriteReviewOpen && (
        <div className="dialog-overlay" onClick={() => setIsWriteReviewOpen(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">Write a review</h3>
              <button type="button" onClick={() => setIsWriteReviewOpen(false)} className="dialog-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="dialog-body">
              <p className="write-review-info">Share your experience. You can add photos only as part of this review.</p>
              <form onSubmit={(e) => { e.preventDefault(); setIsWriteReviewOpen(false) }} className="write-review-form-dialog">
                <div className="write-review-field">
                  <label>Your rating</label>
                  <div className="write-review-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" className="write-review-star-btn">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="#16a34a" stroke="#16a34a" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="write-review-field">
                  <label htmlFor="review-textarea-dialog">Your review</label>
                  <textarea id="review-textarea-dialog" rows={5} required placeholder="Tell travelers what stood out…" className="write-review-textarea" />
                </div>
                <div className="reply-actions">
                  <button type="button" onClick={() => setIsWriteReviewOpen(false)} className="reply-cancel">Cancel</button>
                  <button type="submit" className="reply-submit">Post review</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
