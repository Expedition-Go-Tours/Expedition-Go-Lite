import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronRight, ArrowLeft, Calendar, Camera, Image, Info,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ReviewTourCard from '../components/tour-detail/ReviewTourCard'
import { CalendarPicker } from '../components/ui/apple-calendar-picker'
import './ReviewExperiencePage.css'

const REVIEW_DRAFT_PREFIX = 'eg_review_draft:'
const REVIEW_SUBMISSION_PREFIX = 'eg_submitted_review:'

function getDraftKey(tourTitle: string) {
  return `${REVIEW_DRAFT_PREFIX}${encodeURIComponent(tourTitle || 'unknown-tour')}`
}

function readDraft(key: string) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeDraft(key: string, data: any) {
  try { sessionStorage.setItem(key, JSON.stringify(data)) } catch { }
}

function clearDraft(key: string) {
  try { sessionStorage.removeItem(key) } catch { }
}

function writeSubmittedHandoff(tourTitle: string, tourId: string | null, review: any) {
  try {
    const keys = [
      tourId ? `${REVIEW_SUBMISSION_PREFIX}tour:${tourId}` : null,
      tourTitle ? `${REVIEW_SUBMISSION_PREFIX}title:${encodeURIComponent(tourTitle)}` : null,
    ].filter(Boolean)
    keys.forEach((k) => sessionStorage.setItem(k!, JSON.stringify(review)))
  } catch { }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function StarRating({ value, onChange, count = 5 }: { value: number; onChange: (v: number) => void; count?: number }) {
  return (
    <div className="review-star-rating">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="review-star-btn"
        >
          <svg
            className={`review-star-svg ${i < value ? 'filled' : ''}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function CompanionToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`companion-toggle ${active ? 'active' : ''}`}
    >
      {label}
    </button>
  )
}

export default function ReviewExperiencePage() {
  const { tourTitle: tourSlugParam } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const stateTour = location.state?.tour
  const returnTo = location.state?.returnTo || `/tour/${tourSlugParam || ''}#reviews`

  const tour = stateTour || {
    title: tourSlugParam ? decodeURIComponent(tourSlugParam).replace(/-/g, ' ') : 'Tour',
    rating: 4.8,
    reviews: 248,
    duration: '8h',
    price: 85,
    image: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?auto=format&fit=crop&w=600&q=80',
    location: 'Accra, Ghana',
    slug: tourSlugParam || '',
    supplierName: 'Expedition-Go Tours Ltd',
    supplierLogo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=120&q=80',
  }

  const tourCardImages = [tour.image, ...(Array.isArray(tour.images) ? tour.images : [])].filter(Boolean)

  const [overallRating, setOverallRating] = useState(0)
  const [subRatings, setSubRatings] = useState({ valueForMoney: 0, guide: 0, meeting: 0 })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [companions, setCompanions] = useState<Record<string, boolean>>({
    business: false, couples: false, family: false, friends: false, solo: false,
  })
  const [reviewText, setReviewText] = useState('')
  const [reviewTitle, setReviewTitle] = useState('')
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [certified, setCertified] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const draftKey = tour.slug || 'unknown-tour'

  // Load draft from session storage on mount
  useEffect(() => {
    const draft = readDraft(getDraftKey(draftKey))
    if (draft) {
      if (draft.overallRating) setOverallRating(draft.overallRating)
      if (draft.subRatings) setSubRatings(draft.subRatings)
      if (draft.selectedDate) setSelectedDate(new Date(draft.selectedDate))
      if (draft.companions) setCompanions(draft.companions)
      if (draft.reviewText) setReviewText(draft.reviewText)
      if (draft.reviewTitle) setReviewTitle(draft.reviewTitle)
      if (draft.certified) setCertified(draft.certified)
    }
  }, [draftKey])

  // Save draft on changes
  useEffect(() => {
    const hasContent = overallRating || subRatings.valueForMoney || subRatings.guide ||
      subRatings.meeting || selectedDate || Object.values(companions).some(Boolean) ||
      reviewText.trim() || reviewTitle.trim() || certified
    if (!hasContent) return
    writeDraft(getDraftKey(draftKey), {
      tour, overallRating, subRatings, selectedDate: selectedDate?.toISOString() || null,
      companions, reviewText, reviewTitle, certified, returnTo,
    })
  }, [overallRating, subRatings, selectedDate, companions, reviewText, reviewTitle, certified, draftKey, tour, returnTo])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPreviews = files.map((f) => URL.createObjectURL(f))
    setUploadedPhotos((prev) => [...prev, ...files].slice(0, 10))
    setPhotoPreviews((prev) => [...prev, ...newPreviews].slice(0, 10))
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index])
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!overallRating) {
      toast.error('Please select an overall rating')
      return
    }
    if (!reviewText.trim() || reviewText.trim().length < 20) {
      toast.error('Please write at least 20 characters in your review')
      return
    }
    if (!certified) {
      toast.error('Please certify that this review is based on your own experience')
      return
    }

    setIsSubmitting(true)
    try {
      const submittedReview = {
        id: `submitted-${Date.now()}`,
        name: 'You',
        tag: 'Traveler',
        title: reviewTitle.trim() || null,
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        rating: overallRating,
        text: reviewText.trim(),
        photos: [],
        valueForMoneyRating: subRatings.valueForMoney || null,
        guideRating: subRatings.guide || null,
        meetingRating: subRatings.meeting || null,
        tourId: tour.tourId || tour.id,
        tourTitle: tour.title,
      }

      writeSubmittedHandoff(tour.title, tour.tourId || tour.id, submittedReview)
      clearDraft(getDraftKey(draftKey))
      toast.success('Review submitted successfully!')
      navigate(returnTo, {
        replace: true,
        state: { submittedReview, submittedReviewTourId: tour.tourId || tour.id, submittedReviewTourTitle: tour.title },
      })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="review-page">
      <Navbar />
      <div className="review-page-navbar-offset" aria-hidden />

      <main className="review-main">
        <div className="review-container">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="review-back-btn"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <div className="review-container review-main-content">
            <div className="review-columns">
              {/* Left Column */}
              <aside className="review-sidebar-col">
                <h1 className="review-heading">Tell Us, How Was Your Trip</h1>
                <div className="review-sidebar-content">
                  <ReviewTourCard
                    images={tourCardImages}
                    rating={tour.rating}
                    title={tour.title}
                    supplierName={tour.supplierName}
                    supplierLogo={tour.supplierLogo}
                    location={tour.location}
                    duration={tour.duration}
                  />
                  <Link to="/tours" className="review-change-link">
                    Not the right one? Change activity
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </aside>

              {/* Right Column */}
              <div className="review-form-col">
                {/* Overall Rating */}
                <section className="review-form-section">
                  <h2 className="review-form-section-title">How would you rate your experience?</h2>
                  <StarRating value={overallRating} onChange={setOverallRating} />
                </section>

                {/* Sub-ratings */}
                <section className="review-form-section">
                  <h2 className="review-form-section-title">How would you rate these?</h2>
                  <div className="review-subratings">
                    <div className="review-subrating-row">
                      <span>Value for money</span>
                      <StarRating value={subRatings.valueForMoney} onChange={(v) => setSubRatings((p) => ({ ...p, valueForMoney: v }))} />
                    </div>
                    <div className="review-subrating-row">
                      <span>Guide</span>
                      <StarRating value={subRatings.guide} onChange={(v) => setSubRatings((p) => ({ ...p, guide: v }))} />
                    </div>
                    <div className="review-subrating-row">
                      <span>Meeting or pickup</span>
                      <StarRating value={subRatings.meeting} onChange={(v) => setSubRatings((p) => ({ ...p, meeting: v }))} />
                    </div>
                  </div>
                </section>

                {/* Date */}
                <section className="review-form-section">
                  <h2 className="review-form-section-title">When did you go?</h2>
                  <div className="review-date-wrapper">
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className="review-date-btn"
                    >
                      {selectedDate
                        ? `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                        : <span className="review-date-placeholder">Select month and year</span>}
                    </button>
                    <Calendar size={16} className="review-date-icon" />
                    <CalendarPicker
                      isOpen={isCalendarOpen}
                      onClose={() => setIsCalendarOpen(false)}
                      onDateSelect={(date: Date) => setSelectedDate(date)}
                      selectedDate={selectedDate}
                    />
                  </div>
                </section>

                {/* Companions */}
                <section className="review-form-section">
                  <h2 className="review-form-section-title">Who did you go with?</h2>
                  <div className="review-companions">
                    {Object.entries(companions).map(([key, active]) => (
                      <CompanionToggle
                        key={key}
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                        active={active}
                        onClick={() => setCompanions((prev) => ({ ...prev, [key]: !prev[key] }))}
                      />
                    ))}
                  </div>
                </section>

                <hr className="review-divider" />

                {/* Write Review */}
                <section className="review-form-section">
                  <div className="review-write-header">
                    <h2 className="review-form-section-title">Write your review</h2>
                    <button
                      type="button"
                      className="review-info-btn"
                      title="Your review helps other travellers make informed decisions."
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  <div className="review-categories">
                    {['Experience', 'Admission fee', 'Length of visit', 'Atmosphere', 'Crowd size', 'Staff', 'Best for'].map((cat) => (
                      <span key={cat} className="review-category-tag">{cat}</span>
                    ))}
                  </div>
                  <div className="review-textarea-wrapper">
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience..."
                      rows={6}
                      className="review-textarea"
                    />
                    <div className="review-textarea-count">
                      <span>{reviewText.length}/25 min</span>
                    </div>
                  </div>
                </section>

                {/* Title */}
                <section className="review-form-section">
                  <h2 className="review-form-section-title">Title your review</h2>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="Give us the gist of your experience"
                    className="review-title-input"
                  />
                </section>

                {/* Photos */}
                <section className="review-form-section">
                  <h2 className="review-form-section-title">Add some photos</h2>
                  <p className="review-photos-subtitle">Optional</p>
                  <div className="review-photos-info">
                    <div className="review-photos-info-icon">
                      <Camera size={20} />
                    </div>
                    <div>
                      <p className="review-photos-info-title">Reach a Photos milestone</p>
                      <p className="review-photos-info-desc">Upload your first photo to start your journey as a top contributor.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="review-photos-upload"
                  >
                    <Image size={32} />
                    <span className="review-photos-upload-text">Click to add photos</span>
                    <span className="review-photos-upload-hint">or drag and drop</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="review-photos-input"
                  />
                  {uploadedPhotos.length > 0 && (
                    <div className="review-photos-previews">
                      {photoPreviews.map((url, i) => (
                        <div key={i} className="review-photo-preview">
                          <img src={url} alt={`Upload ${i + 1}`} />
                          <button type="button" onClick={() => removePhoto(i)} className="review-photo-remove">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Certification */}
                <section className="review-form-section">
                  <label className="review-certify">
                    <input
                      type="checkbox"
                      checked={certified}
                      onChange={(e) => setCertified(e.target.checked)}
                      className="review-certify-checkbox"
                    />
                    <span className="review-certify-text">
                      I certify that this review is based on my own experience and is my genuine opinion
                      of this tour experience. I understand that TravioAfrica has a zero-tolerance policy
                      on fake reviews and that my review may be removed if found to violate these terms.
                    </span>
                  </label>
                </section>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !overallRating || !certified}
                  className="review-submit-btn"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit review'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
