import { useState } from 'react'
import type { ExternalReview } from '../hooks/useExternalReviews'
import SourceBadge from './SourceBadge'
import './SourceBadge.css'
import './ExternalReviewCard.css'

interface ExternalReviewCardProps {
  review: ExternalReview
}

export default function ExternalReviewCard({ review }: ExternalReviewCardProps) {
  const [showModal, setShowModal] = useState(false)

  const formattedDate = review.originalDate
    ? new Date(review.originalDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null

  return (
    <>
      <div className="ext-review-card">
        <div className="ext-review-card__body">
          {/* Tour title */}
          <a
            href={review.tourUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ext-review-card__tour-title"
          >
            {review.tourTitle}
          </a>

          {/* Star rating */}
          <div className="ext-review-card__stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`ext-review-card__star ${i < review.rating ? 'ext-review-card__star--filled' : ''}`}
              >
                ★
              </span>
            ))}
          </div>

          {/* Reviewer info */}
          <div className="ext-review-card__reviewer">
            {review.reviewerAvatar ? (
              <img src={review.reviewerAvatar} alt="" className="ext-review-card__avatar" />
            ) : (
              <div className="ext-review-card__avatar ext-review-card__avatar--initials">
                {review.reviewerName.charAt(0)}
              </div>
            )}
            <span className="ext-review-card__reviewer-name">{review.reviewerName}</span>
            {formattedDate && (
              <span className="ext-review-card__date">, {formattedDate}</span>
            )}
          </div>

          {/* Review title */}
          {review.title && (
            <p className="ext-review-card__title">{review.title}</p>
          )}

          {/* Review text — full, with Read more modal */}
          <p className="ext-review-card__text">
            {review.text}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="ext-review-card__read-more"
          >
            Read more
          </button>

          {/* Footer: source badge + check availability */}
          <div className="ext-review-card__footer">
            <SourceBadge source={review.source} />
            <a
              href={review.tourUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ext-review-card__cta"
            >
              Check Availability
            </a>
          </div>
        </div>
      </div>

      {/* Full review modal */}
      {showModal && (
        <div className="ext-review-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ext-review-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ext-review-modal__close" onClick={() => setShowModal(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="ext-review-modal__header">
              <a
                href={review.tourUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ext-review-modal__tour-title"
              >
                {review.tourTitle}
              </a>
              <div className="ext-review-modal__stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`ext-review-card__star ${i < review.rating ? 'ext-review-card__star--filled' : ''}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <div className="ext-review-modal__reviewer">
                {review.reviewerAvatar ? (
                  <img src={review.reviewerAvatar} alt="" className="ext-review-card__avatar" />
                ) : (
                  <div className="ext-review-card__avatar ext-review-card__avatar--initials">
                    {review.reviewerName.charAt(0)}
                  </div>
                )}
                <span className="ext-review-card__reviewer-name">{review.reviewerName}</span>
                {formattedDate && (
                  <span className="ext-review-card__date">, {formattedDate}</span>
                )}
              </div>
            </div>

            {review.title && (
              <h3 className="ext-review-modal__title">{review.title}</h3>
            )}

            <p className="ext-review-modal__text">{review.text}</p>

            <div className="ext-review-modal__footer">
              <SourceBadge source={review.source} />
              <a
                href={review.tourUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ext-review-card__cta"
              >
                Check Availability
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
