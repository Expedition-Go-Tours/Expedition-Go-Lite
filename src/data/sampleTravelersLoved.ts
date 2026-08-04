import type { TravelerLovedReview } from '../pages/tour-detail/TravelersLoved'

// Placeholder reviews shown in the "What travellers loved" section while a
// tour has no real traveller reviews yet. They are replaced automatically by
// the live reviews as soon as real data becomes available.
export const SAMPLE_TRAVELERS_LOVED: TravelerLovedReview[] = [
  {
    id: 'sample-1',
    name: 'Amara Osei',
    date: 'Jun 2025',
    rating: 5,
    title: 'Absolutely worth it',
    text: 'An incredible experience from start to finish. The guide was knowledgeable, the pacing was perfect, and we always felt safe and well taken care of.',
  },
  {
    id: 'sample-2',
    name: 'Daniel Mensah',
    date: 'May 2025',
    rating: 5,
    title: 'Best tour of our trip',
    text: 'This was the highlight of our entire holiday. Amazing views, great stories and a friendly group. Highly recommended for anyone visiting.',
  },
  {
    id: 'sample-3',
    name: 'Naa Adjeley',
    date: 'Apr 2025',
    rating: 4,
    title: 'Great day out',
    text: 'Really enjoyed it. Well organised and the local food stop was a lovely touch. Would have liked a little more time at the final stop.',
  },
]
