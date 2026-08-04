import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TravelersLoved, { type TravelerLovedReview } from './TravelersLoved'
import { SAMPLE_TRAVELERS_LOVED } from '../../data/sampleTravelersLoved'

const reviews: TravelerLovedReview[] = [
  { id: '1', name: 'Ama Mensah', date: 'Mar 2025', rating: 5, title: 'Unforgettable', text: 'Amazing experience, the guide was fantastic.' },
  { id: '2', name: 'Kwame Boateng', date: 'Jan 2025', rating: 4, title: 'Great day', text: 'Really enjoyed the scenery and the pace of the tour.' },
  { id: '3', name: 'Yaa Asantewaa', date: 'Feb 2025', rating: 5, title: 'Highly recommended', text: 'Worth every penny, I would do it again.' },
  { id: '4', name: 'Kojo Antwi', date: 'Dec 2024', rating: 3, title: 'Okay', text: 'It was decent but a bit crowded.' },
]

describe('TravelersLoved', () => {
  it('shows sample reviews when the tour has no real reviews yet', () => {
    render(<TravelersLoved reviews={[]} onViewAllReviews={() => {}} />)

    expect(screen.getByText('What travellers loved')).toBeInTheDocument()
    expect(screen.getByText('Sample reviews')).toBeInTheDocument()
    expect(screen.getByText(SAMPLE_TRAVELERS_LOVED[0].name)).toBeInTheDocument()
    expect(screen.getByText(SAMPLE_TRAVELERS_LOVED[0].title!)).toBeInTheDocument()
  })

  it('hides the sample badge and shows real reviews when they exist', () => {
    render(<TravelersLoved reviews={reviews} onViewAllReviews={() => {}} />)

    expect(screen.getByText('What travellers loved')).toBeInTheDocument()
    expect(screen.queryByText('Sample reviews')).not.toBeInTheDocument()
    expect(screen.getByText('Ama Mensah')).toBeInTheDocument()
    expect(screen.queryByText(SAMPLE_TRAVELERS_LOVED[0].name)).not.toBeInTheDocument()
  })

  it('renders the "What travellers loved" section with reviews', () => {
    render(<TravelersLoved reviews={reviews} onViewAllReviews={() => {}} />)
    expect(screen.getByText('What travellers loved')).toBeInTheDocument()
    expect(screen.getByText('Ama Mensah')).toBeInTheDocument()
    expect(screen.getByText('Unforgettable')).toBeInTheDocument()
  })

  it('shows at most 3 reviews, prioritising the highest ratings', () => {
    render(<TravelersLoved reviews={reviews} onViewAllReviews={() => {}} />)

    // Ratings 5, 5, 4 are the top three; the 3-star one is left out.
    expect(screen.getByText('Ama Mensah')).toBeInTheDocument()
    expect(screen.getByText('Yaa Asantewaa')).toBeInTheDocument()
    expect(screen.getByText('Kwame Boateng')).toBeInTheDocument()
    expect(screen.queryByText('Kojo Antwi')).not.toBeInTheDocument()
  })

  it('calls onViewAllReviews when "See all reviews" is clicked', () => {
    const onViewAllReviews = vi.fn()
    render(<TravelersLoved reviews={reviews} onViewAllReviews={onViewAllReviews} />)

    fireEvent.click(screen.getByText(/See all reviews/))
    expect(onViewAllReviews).toHaveBeenCalledTimes(1)
  })

  it('shows a "See more" toggle for long reviews and expands on click', () => {
    const longText =
      'This is an exceptionally detailed review that goes on for quite a while. ' +
      'It contains a lot of useful information about the tour, the guide, the food, ' +
      'the scenery and everything else a potential traveler might want to know before booking.'
    render(
      <TravelersLoved
        reviews={[{ id: 'long', name: 'Efua Sarpong', date: 'Apr 2025', rating: 5, text: longText }]}
        onViewAllReviews={() => {}}
      />
    )

    const toggle = screen.getByText('See more')
    expect(toggle).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByText('See less')).toBeInTheDocument()
  })
})
