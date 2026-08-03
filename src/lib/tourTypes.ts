// Tour Detail Page Type Definitions

export interface TourGuide {
  name: string
  memberSince: string
  avatar: string
}

export interface ContactInfo {
  email: string
  website: string
  phone: string
  fax?: string
}

export interface PricingTier {
  from: number
  to: number
  pricePerPerson: number
}

export interface TravelerPricing {
  label: string
  price: number
  minAge?: number | null
  maxAge?: number | null
  /**
   * Age-based category tiers (GetYourGuide-style): the per-person price for
   * this category depends on the TOTAL number of travelers in the whole
   * booking (not just this category's count). When present, the matching
   * tier for the current total headcount should be used instead of `price`.
   */
  tiers?: PricingTier[]
}

export interface GroupSizeBand {
  from: number
  to: number
  price: number
}

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
  shortDescription?: string
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
  travelerPricing?: TravelerPricing[]
  skipTheLine?: string | null
  guide?: TourGuide
  contact?: ContactInfo
  /** How the supplier priced this tour: per traveler, or a flat price per group. */
  pricingModel?: 'perPerson' | 'perGroup'
  /** Only relevant when pricingModel is 'perPerson'. */
  pricingApproach?: 'sameForEveryone' | 'dependsOnAge'
  /** Flat per-person price used for every traveler type when pricingApproach is 'sameForEveryone'. */
  uniformPrice?: number | null
  /** Flat price bands by total group headcount, used when pricingModel is 'perGroup'. */
  groupSizePricing?: GroupSizeBand[]
}

export interface ItineraryDay {
  day: number
  time?: string
  type?: 'activity' | 'transfer'
  title: string
  description: string
  duration?: number
  durationUnit?: 'minute' | 'hour' | 'day'
  importance?: 'major' | 'minor'
  isOptional?: boolean
  additionalFee?: boolean
  activityName?: string
  locationName?: string
  locationAddress?: string
  locationLat?: number | null
  locationLng?: number | null
  isCustomLocation?: boolean
  image?: string
  activities?: string[]
  meals?: string[]
  accommodation?: string
}

export function formatItineraryDuration(duration?: number, unit?: string): string {
  if (duration == null) return ''
  switch (unit) {
    case 'hour':
      return `${duration}h`
    case 'day':
      return `${duration} day${duration > 1 ? 's' : ''}`
    default:
      return `${duration} min`
  }
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
