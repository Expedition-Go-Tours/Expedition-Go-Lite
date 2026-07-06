export interface Tour {
  title: string
  category: string
  duration: string
  features: string
  price: string
  rating: string
  reviews: number
  location: string
  image: string
}

const recommendedTours: Tour[] = [
  {
    title: 'From Accra: Cape Coast, Elmina Castle & Kakum Park Day Tour',
    category: 'Accra · Day trip',
    duration: '9 hours',
    features: 'Pickup available · Skip the line',
    price: '$127',
    rating: '4.8',
    reviews: 21,
    location: 'Accra, Ghana',
    image: 'https://images.unsplash.com/photo-1612878010854-1250dfc1a109?w=400&q=80',
  },
  {
    title: 'Kakum National Park Canopy Walk & Rainforest Adventure',
    category: 'Central · Adventure',
    duration: '8 hours',
    features: 'Guide included · Lunch included',
    price: '$84',
    rating: '4.9',
    reviews: 34,
    location: 'Central Region, Ghana',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80',
  },
  {
    title: 'Cape Coast Castle & Slave River Tour with Transporation',
    category: 'Cape Coast · History',
    duration: '6 hours',
    features: 'Pickup available · Entry fees included',
    price: '$57',
    rating: '4.7',
    reviews: 45,
    location: 'Cape Coast, Ghana',
    image: 'https://images.unsplash.com/photo-1590868169155-f1a0c43106ef?w=400&q=80',
  },
  {
    title: 'Accra City Tour: Markets, Museums & Local Cuisine',
    category: 'Accra · City tour',
    duration: '5 hours',
    features: 'Guide included · Tastings included',
    price: '$46',
    rating: '4.6',
    reviews: 28,
    location: 'Accra, Ghana',
    image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400&q=80',
  },
  {
    title: 'Mole National Park Wildlife Safari & Lodge Stay',
    category: 'Northern · Safari',
    duration: '3 days',
    features: 'Accommodation · All meals · Guide',
    price: '$171',
    rating: '4.9',
    reviews: 17,
    location: 'Northern Region, Ghana',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80',
  },
  {
    title: 'Boti Falls Waterfall Hike & Eastern Region Tour',
    category: 'Eastern · Nature',
    duration: '7 hours',
    features: 'Hiking gear · Guide · Lunch',
    price: '$38',
    rating: '4.5',
    reviews: 13,
    location: 'Eastern Region, Ghana',
    image: 'https://images.unsplash.com/photo-1578926378480-5e050966f37e?w=400&q=80',
  },
  {
    title: 'Jamestown Walking Tour: History, Art & Street Food',
    category: 'Accra · Walking tour',
    duration: '3 hours',
    features: 'Local guide · Food included',
    price: '$26',
    rating: '4.6',
    reviews: 31,
    location: 'Accra, Ghana',
    image: 'https://images.unsplash.com/photo-1591843336309-cbfcbad9b118?w=400&q=80',
  },
  {
    title: 'Lake Volta Sunset Cruise & Island Exploration',
    category: 'Volta · Cruise',
    duration: '6 hours',
    features: 'Drinks included · Return transfer',
    price: '$62',
    rating: '4.7',
    reviews: 19,
    location: 'Volta Region, Ghana',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80',
  },
  {
    title: 'Elmina Fishing Village & Dutch Heritage Tour',
    category: 'Elmina · Cultural',
    duration: '5 hours',
    features: 'Local guide · Entry fees',
    price: '$43',
    rating: '4.5',
    reviews: 22,
    location: 'Elmina, Ghana',
    image: 'https://images.unsplash.com/photo-1590868169155-f1a0c43106ef?w=400&q=80',
  },
  {
    title: 'Shai Hills Nature Reserve & Rock Climbing Day Trip',
    category: 'Accra · Adventure',
    duration: '6 hours',
    features: 'Climbing gear · Guide · Lunch',
    price: '$52',
    rating: '4.4',
    reviews: 16,
    location: 'Greater Accra, Ghana',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80',
  },
]

export { recommendedTours }
