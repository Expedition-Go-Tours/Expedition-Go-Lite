import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import './ReviewsSection.css'

interface Review {
  id: string
  name: string
  tag?: string
  date: string
  rating: number
  text: string
  title?: string | null
  photos?: string[]
  valueForMoneyRating?: number | null
  guideRating?: number | null
  meetingRating?: number | null
  travelMonth?: string | null
  companions?: string[]
  supplierResponse?: string | null
  supplierResponseAt?: string | null
  country?: string
}

interface ReviewsSectionProps {
  rating: number
  reviewCount: number
  reviewBreakdown: { label: string; stars: number; count: number; percentage: number }[]
  reviews: Review[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onWriteReview: () => void
  onReplyToQuestion: (question: { asker: string; question: string }) => void
  qaItems: { asker: string; question: string; answer: string }[]
  starFilter: number | null
  onStarFilterChange: (stars: number | null) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

export default function ReviewsSection({
  rating,
  reviewCount,
  reviewBreakdown,
  reviews,
  hasMore,
  loadingMore,
  onLoadMore,
  onWriteReview,
  onReplyToQuestion,
  qaItems,
  starFilter,
  onStarFilterChange,
  searchQuery,
  onSearchQueryChange,
}: ReviewsSectionProps) {
  const ratingDots = Array.from({ length: 5 })

  return (
    <motion.div
      key="reviews"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Reviews Section */}
      <section className="reviews-section-content">
        <div className="reviews-header">
          <h2 className="reviews-title">Reviews</h2>
          <button type="button" onClick={onWriteReview} className="reviews-write-btn">
            Write a review
          </button>
        </div>

        <div className="reviews-layout">
          <div className="reviews-main">
            {/* Rating Summary */}
            <div className="reviews-rating-summary">
              <div className="reviews-rating-score">
                <p className="reviews-rating-number">{rating.toFixed(1)}</p>
                <div className="reviews-rating-stars">
                  {ratingDots.map((_, i) => (
                    <Star key={i} size={24} className="reviews-star-filled" />
                  ))}
                </div>
                <p className="reviews-rating-label">based on {reviewCount} reviews</p>
              </div>
              <div className="reviews-rating-breakdown">
                {reviewBreakdown.map((item) => {
                  const isActive = starFilter === item.stars
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onStarFilterChange(isActive ? null : item.stars)}
                      className={`reviews-breakdown-row ${isActive ? 'active' : ''}`}
                      aria-label={`Filter reviews by ${item.label}`}
                      aria-pressed={isActive}
                    >
                      <span className="reviews-breakdown-label">{item.label}</span>
                      <span className="reviews-breakdown-bar">
                        <span
                          className="reviews-breakdown-bar-fill"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </span>
                      <span className="reviews-breakdown-count">{item.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Search & Filter */}
            <div className="reviews-search">
              <input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="reviews-search-input"
                placeholder="Search reviews..."
              />
              {starFilter !== null && (
                <button
                  type="button"
                  onClick={() => onStarFilterChange(null)}
                  className="reviews-clear-filter"
                >
                  Clear star filter
                </button>
              )}
            </div>

            {/* Review Cards */}
            {reviews.length === 0 ? (
              <p className="reviews-empty">
                No reviews match
                {starFilter !== null ? ` ${starFilter}-star` : ''} ratings
                {searchQuery.trim() ? ' and your search' : ''}. Try another rating or adjust your search.
              </p>
            ) : (
              <div className="reviews-cards">
                {reviews.map((review) => (
                  <article key={review.id} className="review-card">
                    <p className="review-card-author">{review.name}</p>
                    <p className="review-card-date">{review.date} &bull; {review.tag || 'Traveler'}</p>
                    <div className="review-card-stars">
                      {ratingDots.map((_, i) => (
                        <Star
                          key={i}
                          size={10}
                          className={i < review.rating ? 'review-star-filled-sm' : 'review-star-empty-sm'}
                        />
                      ))}
                    </div>
                    {review.title && <p className="review-card-title">{review.title}</p>}
                    <p className="review-card-text">{review.text}</p>
                    {(review.valueForMoneyRating || review.guideRating || review.meetingRating) && (
                      <div className="review-card-subratings">
                        {review.valueForMoneyRating && <span>Value: {review.valueForMoneyRating}/5</span>}
                        {review.guideRating && <span>Guide: {review.guideRating}/5</span>}
                        {review.meetingRating && <span>Meeting: {review.meetingRating}/5</span>}
                      </div>
                    )}
                    {(review.travelMonth || (review.companions && review.companions.length > 0)) && (
                      <div className="review-card-tags">
                        {review.travelMonth && <span className="review-tag">{review.travelMonth}</span>}
                        {review.companions?.map((c) => (
                          <span key={c} className="review-tag">{c}</span>
                        ))}
                      </div>
                    )}
                    {review.photos && review.photos.length > 0 && (
                      <div className="review-card-photos">
                        {review.photos.map((url, i) => (
                          <img key={i} src={url} alt="" className="review-card-photo" />
                        ))}
                      </div>
                    )}
                    {review.supplierResponse && (
                      <div className="review-card-response">
                        <p className="review-card-response-title">
                          Response from supplier
                          {review.supplierResponseAt && (
                            <span className="review-card-response-date">
                              {new Date(review.supplierResponseAt).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </p>
                        <p className="review-card-response-text">{review.supplierResponse}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            {hasMore && !starFilter && !searchQuery.trim() && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="reviews-load-more"
              >
                {loadingMore ? 'Loading...' : 'Load more reviews'}
              </button>
            )}
          </div>

        </div>
      </section>

      {/* Q&A Section */}
      <section className="reviews-qa">
        <h2 className="reviews-qa-title">Q&A</h2>
        <div className="reviews-qa-list">
          {qaItems.map((item) => (
            <article key={item.question} className="qa-item">
              <p className="qa-asker">{item.asker}</p>
              <p className="qa-question">{item.question}</p>
              <p className="qa-answer">{item.answer}</p>
              <button
                type="button"
                onClick={() => onReplyToQuestion(item)}
                className="qa-reply-btn"
              >
                Answer
              </button>
            </article>
          ))}
        </div>
      </section>
    </motion.div>
  )
}
