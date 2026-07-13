// Tour Detail Page Type Definitions

export interface TourDetail {
  id: string
  slug: string
  title: string
  location: string
  price: number
  currency: string
  duration: string
  groupSize: number
  languages: string[]
  rating: number
  reviewCount: number
  images: string[]
  videoUrl?: string
  description: string
  highlights: string[]
  included: string[]
  excluded: string[]
  itinerary: ItineraryDay[]
  faqs: FAQ[]
  coordinates: { lat: number; lng: number }
  tourType: string
  availability: string[]
  difficulty?: 'Easy' | 'Moderate' | 'Challenging' | 'Strenuous'
  minAge?: number
  maxAge?: number
  pickupIncluded?: boolean
  cancellationPolicy?: string
}

export interface ItineraryDay {
  day: number
  title: string
  description: string
  image?: string
  duration?: string
  activities?: string[]
  meals?: string[]
  accommodation?: string
}

export interface FAQ {
  id: string
  question: string
  answer: string
  category?: string
}

export interface Review {
  id: string
  tourId: string
  author: string
  authorId?: string
  rating: number
  date: string
  title: string
  content: string
  avatar?: string
  helpful?: number
  verified?: boolean
  images?: string[]
}

export interface ReviewStats {
  average: number
  total: number
  breakdown: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

export interface BookingRequest {
  tourId: string
  date: string
  adults: number
  children: number
  infants: number
  totalPrice: number
  specialRequests?: string
}

export interface RelatedTour {
  id: string
  slug: string
  title: string
  location: string
  image: string
  price: number
  currency: string
  duration: string
  rating: number
  reviewCount: number
}
