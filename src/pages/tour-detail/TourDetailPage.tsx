import { Component, useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarCheck, Clock, Users, UserCheck, Bus, Gauge,
} from 'lucide-react'
import Footer from '../../components/Footer'
import { useContinuePlanning, toContinuePlanningItem } from '../../context/ContinuePlanningContext'
import { useWishlist } from '../../context/WishlistContext'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useExpeditionTour, useSimilarTours } from '../../hooks/useExpeditionTours'
import { useExpeditionTourReviews, useCreateReview } from '../../hooks/useExpeditionReviews'
import { useTourAvailability } from '../../hooks/useExpeditionBookings'
import type { DayAvailability } from '../../lib/tourAvailability'

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

const EXTERNAL_FALLBACK_IMAGES = [
  'https://ecotourghana.com/img/n10.jpg',
  'https://grassroottours.com/wp-content/uploads/2019/04/IMG_5843-370x260.jpg',
  'https://images.squarespace-cdn.com/content/v1/65cfd1369377d32bcd0051fa/1713964352006-GG68CSEC76Z06G1JZBFQ/Accra+City+Tour-+Sheeda+Travel+Tribe.jpg',
  'https://images.squarespace-cdn.com/content/v1/65cfd1369377d32bcd0051fa/f0eaf879-3685-41fb-ba88-5fbab02dda4a/Travel+to+Ghana-+Sheeda+Travel+Tribe.jpg',
]

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function TourDetailPage() {
  const { t } = useTranslation()
  const tourDetailTabs = useMemo(() => [
    { key: 'overview', label: 'Overview' },
    { key: 'details', label: t('tourDetail.details') },
    { key: 'itinerary', label: t('tourDetail.itinerary') },
    { key: 'reviews', label: t('sections.reviews') },
    { key: 'supplier', label: t('tourDetail.supplier') },
  ], [t])
  const { tourId } = useParams<{ tourId: string }>()
  const navigate = useNavigate()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const { addToContinuePlanning } = useContinuePlanning()

  const { data: tour, isLoading, isError } = useExpeditionTour(tourId)
  const { data: reviewsData } = useExpeditionTourReviews(tourId, 1, 10)
  const { data: similarTours } = useSimilarTours(tourId)

  const now = new Date()
  const availStart = now.toISOString().slice(0, 10)
  const availEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: availabilityCalendar } = useTourAvailability(tourId, availStart, availEnd)

  const availabilityMap = useMemo(() => {
    const map = new Map<string, DayAvailability>()
    if (availabilityCalendar) {
      for (const day of availabilityCalendar) {
        const dateStr = day.date
        let status: DayAvailability = 'available'
        if (day.status === 'FULL') status = 'full'
        else if (day.status === 'LIMITED') status = 'limited'
        else if (day.status === 'BLOCKED') status = 'full'
        map.set(dateStr, status)
      }
    }
    return map
  }, [availabilityCalendar])

  const reviews = reviewsData?.reviews || []
  const relatedTours = similarTours || []

  const mergedImages = useMemo(() => {
    const seen = new Set<string>()
    const all = [
      ...(tour?.images || []),
      ...EXTERNAL_FALLBACK_IMAGES,
    ]
    return all.filter((url) => {
      const key = String(url || '').toLowerCase().replace(/[?#].*$/, '').replace(/\/$/, '')
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [tour?.images])

  useEffect(() => {
    if (tour) {
      document.title = `${tour.title} | Expedition-Go Tours`
    }
    if (tour) {
      addToContinuePlanning(toContinuePlanningItem({
        title: tour.title,
        location: tour.location,
        image: mergedImages[0] || '',
        price: `$${tour.price}`,
        rating: String(tour.rating),
        reviews: tour.reviewCount,
        source: tour.bookingFlow === 'EXTERNAL' ? 'travio-africa' as const : 'expedition-go' as const,
        externalUrl: tour.externalUrl || undefined,
      } as any))
    }
  }, [tour, addToContinuePlanning, mergedImages])

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
  const [isMobile, setIsMobile] = useState(false)

  const createReview = useCreateReview()

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    setActiveTab('overview')
    setReviewStarFilter(null)
    setReviewSearchQuery('')
  }, [tourId])

  const isExternal = tour?.bookingFlow === 'EXTERNAL'
  const selectedTourTitle = tour?.title || ''
  const selectedTourRating = tour?.rating || 0
  const selectedTourReviews = tour?.reviewCount || 0
  const slug = tourId || tour?.slug || ''

  const isFavorited = isInWishlist(selectedTourTitle)

  const handleWishlistToggle = () => {
    if (isFavorited) {
      removeFromWishlist(selectedTourTitle)
      if (!isMobile) toast.success(t('common.removedFromWishlist'))
    } else {
      addToWishlist({
        id: selectedTourTitle,
        title: selectedTourTitle,
        location: tour?.location || '',
        price: tour?.price || 0,
        duration: tour?.duration || '',
        imageUrl: mergedImages[0] || '',
        rating: selectedTourRating,
        reviewCount: selectedTourReviews,
        addedDate: new Date().toISOString(),
        source: isExternal ? 'travio-africa' : 'expedition-go',
        externalUrl: tour?.externalUrl || undefined,
      })
      toast.success(t('common.addedToWishlist'))
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
          duration: tour?.duration || '',
          price: tour?.price || 0,
          image: mergedImages[0],
          images: mergedImages.slice(0, 5),
          location: tour?.location || 'Accra, Ghana',
          tourId: tour?.id || '',
          supplierName: tour?.supplierName || 'Expedition-Go Tours Ltd',
          supplierLogo: tour?.supplierPhoto || '',
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
    return reviews.map((r) => ({
      id: r.id,
      name: r.author,
      tag: t('reviews.traveler'),
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      rating: r.rating,
      text: r.content,
      title: r.title,
    }))
  }, [reviews, t])

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
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    allReviewCards.forEach((r) => { if (counts[r.rating] !== undefined) counts[r.rating]++ })
    const total = allReviewCards.length || 1
    return labels.map((item) => ({
      ...item,
      count: counts[item.stars],
      percentage: Math.round((counts[item.stars] / total) * 100),
    }))
  }, [allReviewCards])

  const difficultyColorMap: Record<string, string> = {
    'Easy': '#22c55e',
    'Moderate': '#f59e0b',
    'Challenging': '#ef4444',
    'Strenuous': '#dc2626',
  }

  const overviewHighlightsGrid = useMemo(() => {
    const rawDifficulty = tour?.difficulty?.trim()
    // Default to "Easy" when the tour has no difficulty value so the card always shows.
    const diffLabel = rawDifficulty
      ? rawDifficulty.charAt(0).toUpperCase() + rawDifficulty.slice(1).toLowerCase()
      : 'Easy'
    // Match the normalized label against the color map, falling back to a neutral color.
    const diffColor = difficultyColorMap[diffLabel] ?? '#6b7280'

    return [
      { icon: CalendarCheck, title: t('tourDetail.freeCancellation'), desc: t('tourDetail.cancelRefundDesc') },
      { icon: Clock, title: t('tourDetail.duration'), desc: tour?.duration || t('tourDetail.checkAvailabilityDesc') },
      { icon: Users, title: t('tourDetail.liveGuide'), desc: t('tourDetail.guideLanguage') },
      ...(diffLabel && diffColor ? [{
        icon: Gauge,
        title: t('tourInfo.difficulty'),
        desc: null,
        renderValue: () => (
          <>
            <p className="overview-highlight-card-title">{t('tourInfo.difficulty')}</p>
            <span
              className="difficulty-grid-badge"
              style={{ backgroundColor: `${diffColor}15`, color: diffColor }}
            >
              {diffLabel}
            </span>
          </>
        ),
      }] : []),
      { icon: UserCheck, title: t('tourDetail.skipTheLine'), desc: null },
      { icon: Bus, title: t('tourDetail.pickupIncluded'), desc: t('tourDetail.checkAvailabilityDesc') },
    ]
  }, [t, tour?.difficulty, tour?.duration])

  const descriptionSteps = useMemo(() => {
    if (!tour?.description) return []
    const truncated = tour.description.length > 250
      ? tour.description.slice(0, 250) + '...'
      : tour.description
    return [
      { title: 'Short description', body: truncated },
    ]
  }, [tour?.description])

  const highlights = tour?.highlights || []
  const cancellationPolicy = tour?.cancellationPolicy || 'Free cancellation up to 24 hours before'

  const infoSections = useMemo(() => [
    {
      key: 'included',
      title: t('tourDetail.included'),
      content: buildIncludedExcludedContent(tour?.included, tour?.excluded),
    },
    {
      key: 'expect',
      title: t('tourDetail.aboutTour'),
      content: buildAboutContent(tour?.description || ''),
    },
    {
      key: 'pickup',
      title: t('tourDetail.meetingPickup'),
      content: buildMeetingContent('', t('tourDetail.pickupConfirmedAfterBooking')),
    },
    {
      key: 'accessibility',
      title: t('tourDetail.accessibility'),
      content: buildAccessibilityContent('', '', ''),
    },
    {
      key: 'policy',
      title: t('tourDetail.cancellationPolicy'),
      content: buildCancellationContent(undefined, cancellationPolicy),
    },
  ], [t, tour?.included, tour?.excluded, tour?.description, cancellationPolicy])

  const supplierData = useMemo(() => ({
    name: tour?.supplierName || 'Expedition-Go Tours Ltd',
    logo: tour?.supplierPhoto || '',
    description: `${tour?.supplierName || 'This supplier'} offers authentic guided experiences.`,
    rating: tour?.rating || null,
    totalTours: relatedTours.length,
    phone: '',
    email: '',
    website: '',
    address: tour?.location || '',
  }), [tour, relatedTours])

  const supplierTours = useMemo(() => relatedTours.map((t) => ({
    title: t.title,
    slug: toSlug(t.title),
    image: t.image,
    duration: t.duration,
    price: parseInt(t.price.replace(/[^0-9]/g, ''), 10) || 100,
    rating: t.rating,
    reviews: t.reviews,
    features: t.features,
    location: t.location,
    category: t.category,
    source: t.source,
    externalUrl: t.externalUrl,
  })), [relatedTours])

  const handleWriteReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const comment = (form.elements.namedItem('review-comment') as HTMLTextAreaElement)?.value
    const ratingEl = form.elements.namedItem('review-rating') as HTMLInputElement
    const rating = ratingEl ? parseInt(ratingEl.value) : 5

    if (comment && tour?.id) {
      createReview.mutate({
        bookingId: tour.id,
        rating,
        comment,
        title: selectedTourTitle,
      })
    }
    setIsWriteReviewOpen(false)
    toast.success(t('reviews.thankYou'))
  }

  if (isLoading) {
    return (
      <div className="tour-detail-loading" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h2>Loading tour...</h2>
      </div>
    )
  }

  if (isError || !tour) {
    return (
      <div className="tour-detail-error" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h2>{t('tourDetail.tourNotFound')}</h2>
        <p>{t('tourDetail.tourNotFoundDesc')}</p>
      </div>
    )
  }

  return (
    <TourDetailErrorBoundary>
    <>
      <div className="tour-detail-page">
        <div className="tour-detail-container">
          <div className="tour-detail-content">
            <div className="tour-detail-main">
              <div className="tour-detail-header-row">
                <TourHeader
                  title={selectedTourTitle}
                  rating={selectedTourRating}
                  reviewCount={selectedTourReviews}
                  location={tour.location}
                  supplierName={tour.supplierName}
                  onReviewsClick={handleReviewsTab}
                />
                <button
                  type="button"
                  onClick={handleWriteReview}
                  className="tour-detail-write-review-btn"
                >
                  {t('reviews.writeAReview')}
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
              {isExternal && tour.externalUrl ? (
                <div className="external-booking-card" style={{
                  background: '#fff', borderRadius: 12, padding: 24,
                  border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  textAlign: 'center',
                }}>
                  <img src="/travio_logo.png" alt="Travio Africa" style={{ height: 32, marginBottom: 16 }} />
                  <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                    This tour is operated by a partner on Travio Africa
                  </p>
                  <a
                    href={tour.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block', width: '100%', padding: '12px 24px',
                      background: '#179237', color: '#fff', borderRadius: 8,
                      fontWeight: 600, textDecoration: 'none', fontSize: 16,
                    }}
                  >
                    Book on Travio Africa
                  </a>
                </div>
              ) : (
                <BookingWidget
                  tour={tour as any}
                  getAvailability={(date: Date) => {
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                    return availabilityMap.get(key) || 'available'
                  }}
                />
              )}
            </aside>

            <div className="tour-detail-bottom">
              <TourDetailTabs
                tabs={tourDetailTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              <div className="tour-detail-tab-content">
                <AnimatePresence mode="wait">
                  {activeTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <OverviewSection
                        highlightsGrid={overviewHighlightsGrid}
                        descriptionSteps={descriptionSteps}
                        highlights={highlights}
                        reviews={allReviewCards.map(r => ({ id: r.id, name: r.name, date: r.date, rating: r.rating, text: r.text, country: '' }))}
                        onTabChange={setActiveTab}
                        onReviewReadMore={setReviewDetail}
                      />
                    </motion.div>
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
                      qaItems={[]}
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
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <RelatedTours tours={relatedTours} />
        </div>
      </div>

      <Footer />

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
                <h3 className="dialog-title">{t('tourDetail.reviewDetails')}</h3>
                <button type="button" onClick={() => setReviewDetail(null)} className="dialog-close">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="dialog-body">
                <div className="review-detail-avatar">
                  {reviewDetail.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
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

      {isReplyDialogOpen && (
        <div className="dialog-overlay" onClick={() => setIsReplyDialogOpen(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">{t('tourDetail.replyToCustomer')}</h3>
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
                <label htmlFor="reply-textarea" className="reply-label">{t('tourDetail.yourReply')}</label>
                <textarea
                  id="reply-textarea"
                  value={replyMessage}
                  onChange={(e) => { setReplyMessage(e.target.value); setReplyConfirmation('') }}
                  rows={5}
                  placeholder={t('tourDetail.replyPlaceholder')}
                  className="reply-textarea"
                />
                {replyConfirmation && <p className="reply-confirmation">{replyConfirmation}</p>}
                <div className="reply-actions">
                  <button type="button" onClick={() => setIsReplyDialogOpen(false)} className="reply-cancel">{t('common.cancel')}</button>
                  <button type="submit" disabled={!replyMessage.trim()} className="reply-submit">{t('tourDetail.acceptReply')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isWriteReviewOpen && (
        <div className="dialog-overlay" onClick={() => setIsWriteReviewOpen(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">{t('reviews.writeAReview')}</h3>
              <button type="button" onClick={() => setIsWriteReviewOpen(false)} className="dialog-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="dialog-body">
              <p className="write-review-info">{t('reviews.shareExperience')}</p>
              <form onSubmit={handleWriteReviewSubmit} className="write-review-form-dialog">
                <input type="hidden" name="review-rating" value="5" />
                <div className="write-review-field">
                  <label>{t('reviews.yourRating')}</label>
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
                  <label htmlFor="review-comment">{t('reviews.yourReview')}</label>
                  <textarea id="review-comment" name="review-comment" rows={5} required placeholder={t('reviews.contentPlaceholder')} className="write-review-textarea" />
                </div>
                <div className="reply-actions">
                  <button type="button" onClick={() => setIsWriteReviewOpen(false)} className="reply-cancel">{t('common.cancel')}</button>
                  <button type="submit" className="reply-submit">{t('reviews.postReview')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
    </TourDetailErrorBoundary>
  )
}

class TourDetailErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '60px 24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: 24, marginBottom: 8, color: '#1a1a1a' }}>Something went wrong</h2>
          <p style={{ fontSize: 16, color: '#6b7280' }}>Please try refreshing the page.</p>
        </div>
      )
    }
    return this.props.children
  }
}
