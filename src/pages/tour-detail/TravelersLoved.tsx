import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { SAMPLE_TRAVELERS_LOVED } from '../../data/sampleTravelersLoved'
import './TravelersLoved.css'

export interface TravelerLovedReview {
  id: string
  name: string
  date: string
  rating: number
  title?: string
  text: string
}

interface TravelersLovedProps {
  reviews: TravelerLovedReview[]
  onViewAllReviews: () => void
}

const MAX_VISIBLE = 3

export default function TravelersLoved({ reviews, onViewAllReviews }: TravelersLovedProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const hasRealReviews = !!reviews && reviews.length > 0
  const source = hasRealReviews ? reviews : SAMPLE_TRAVELERS_LOVED

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .substring(0, 2) || '?'

  const featured = [...source]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_VISIBLE)

  return (
    <section className="travelers-loved" aria-labelledby="travelers-loved-title">
      <div className="travelers-loved-header">
        <h2 id="travelers-loved-title" className="travelers-loved-title">
          {t('tourDetail.whatTravellersLoved')}
        </h2>
        <button type="button" className="travelers-loved-view-all" onClick={onViewAllReviews}>
          {t('tourDetail.seeAllReviews')}
        </button>
      </div>

      <div className="travelers-loved-grid">
        {featured.map((review) => {
          const isExpanded = expanded.has(review.id)
          const isLong = review.text.length > 150
          return (
            <article key={review.id} className="travelers-loved-card">
              <div className="travelers-loved-card-head">
                <div className="travelers-loved-avatar">{initials(review.name)}</div>
                <div className="travelers-loved-author">
                  <div className="travelers-loved-author-name">{review.name}</div>
                  <div className="travelers-loved-meta">
                    {review.date}
                    <span className="travelers-loved-verified">· {t('tourDetail.verifiedBooking')}</span>
                  </div>
                </div>
                <div className="travelers-loved-stars" aria-label={`${review.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={15}
                      fill={star <= review.rating ? '#179237' : 'none'}
                      stroke={star <= review.rating ? '#179237' : '#d6d3d1'}
                    />
                  ))}
                </div>
              </div>

              {review.title && <h3 className="travelers-loved-card-title">{review.title}</h3>}

              <div className={`travelers-loved-card-text${!isExpanded ? ' collapsed' : ''}`}>
                <p className={isExpanded ? 'travelers-loved-card-paragraph expanded' : 'travelers-loved-card-paragraph'}>
                  {review.text}
                </p>
              </div>

              {isLong && (
                <button type="button" className="travelers-loved-card-toggle" onClick={() => toggleExpand(review.id)}>
                  {isExpanded ? t('tourDetail.seeLess') : t('tourDetail.seeMore')}
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
