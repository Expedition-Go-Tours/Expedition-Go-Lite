export interface Attraction {
  title: string
  slug: string
  price: string
  rating: string
  reviews: number
  image: string
  lat: number
  lng: number
  location: string
}

/**
 * Curated "top attractions" served client-side (mirrors the reference
 * homepage data). Sorted by the user's distance when geolocation is
 * available, otherwise rendered in this curated order.
 */
export const attractionsNearby: Attraction[] = [
  {
    title: 'Independence Square',
    slug: 'independence-square',
    price: '$15',
    rating: '4.6',
    reviews: 340,
    image: 'https://images.unsplash.com/photo-1590181076255-de1dbbc106ed?auto=format&fit=crop&w=800&q=80',
    lat: 5.5502,
    lng: -0.1969,
    location: 'Accra, Ghana',
  },
  {
    title: 'Jamestown Lighthouse & Arts Tour',
    slug: 'jamestown-lighthouse-arts-tour',
    price: '$38',
    rating: '4.6',
    reviews: 145,
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
    lat: 5.5353,
    lng: -0.2087,
    location: 'Accra, Ghana',
  },
  {
    title: 'Kwame Nkrumah Memorial Park',
    slug: 'kwame-nkrumah-memorial-park',
    price: '$10',
    rating: '4.8',
    reviews: 520,
    image: 'https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=800&q=80',
    lat: 5.5484,
    lng: -0.2074,
    location: 'Accra, Ghana',
  },
  {
    title: 'National Museum of Ghana',
    slug: 'national-museum-ghana',
    price: '$12',
    rating: '4.5',
    reviews: 280,
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    lat: 5.556,
    lng: -0.1965,
    location: 'Accra, Ghana',
  },
  {
    title: 'Makola Market Cultural Walk',
    slug: 'makola-market-cultural-walk',
    price: '$25',
    rating: '4.4',
    reviews: 190,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    lat: 5.5515,
    lng: -0.205,
    location: 'Accra, Ghana',
  },
  {
    title: 'Osu Castle & Oxford Street',
    slug: 'osu-castle-oxford-street',
    price: '$20',
    rating: '4.5',
    reviews: 210,
    image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80',
    lat: 5.555,
    lng: -0.175,
    location: 'Accra, Ghana',
  },
  {
    title: 'La Pleasure Beach',
    slug: 'la-pleasure-beach',
    price: '$18',
    rating: '4.3',
    reviews: 160,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    lat: 5.558,
    lng: -0.165,
    location: 'Accra, Ghana',
  },
  {
    title: 'Labadi Beach Sunset Experience',
    slug: 'labadi-beach-sunset',
    price: '$22',
    rating: '4.7',
    reviews: 380,
    image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
    lat: 5.56,
    lng: -0.155,
    location: 'Accra, Ghana',
  },
  {
    title: 'Shai Hills Wildlife & Caves',
    slug: 'shai-hills-wildlife-caves',
    price: '$68',
    rating: '4.8',
    reviews: 234,
    image: 'https://images.unsplash.com/photo-1535941339077-2dd1c7963098?auto=format&fit=crop&w=800&q=80',
    lat: 5.8333,
    lng: -0.0667,
    location: 'Greater Accra, Ghana',
  },
  {
    title: 'Aburi Botanical Gardens Walk',
    slug: 'aburi-botanical-gardens-walk',
    price: '$42',
    rating: '4.7',
    reviews: 168,
    image: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=800&q=80',
    lat: 5.85,
    lng: -0.1833,
    location: 'Eastern Region, Ghana',
  },
  {
    title: 'Ada Foah River Cruise',
    slug: 'ada-foah-river-cruise',
    price: '$45',
    rating: '4.6',
    reviews: 175,
    image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
    lat: 5.7833,
    lng: 0.6333,
    location: 'Greater Accra, Ghana',
  },
  {
    title: 'Wli Waterfalls Adventure',
    slug: 'wli-waterfalls-adventure',
    price: '$55',
    rating: '4.8',
    reviews: 290,
    image: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=800&q=80',
    lat: 7.0833,
    lng: 0.5833,
    location: 'Volta Region, Ghana',
  },
]

/** Haversine distance in kilometers between two lat/lng points. */
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
