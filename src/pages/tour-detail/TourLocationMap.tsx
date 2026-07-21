import './TourLocationMap.css'

interface TourLocationMapProps {
  coordinates: { lat: number; lng: number }
  location: string
  title: string
}

export default function TourLocationMap({ coordinates, location, title }: TourLocationMapProps) {
  const googleMapsUrl = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
  // const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=13&size=800x400&markers=color:green%7C${coordinates.lat},${coordinates.lng}&key=YOUR_API_KEY`

  return (
    <section className="tour-location-map" id="tour-location">
      <h2 className="tour-section-title">Tour Location</h2>
      
      <div className="location-info">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{location}</span>
      </div>

      <div className="map-container">
        <a 
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="map-link"
          aria-label={`View ${title} location on Google Maps`}
        >
          <div className="map-placeholder">
            <svg className="map-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="map-overlay-text">Click to view on Google Maps</span>
          </div>
        </a>
        
        <div className="map-details">
          <p>Click the map to explore the tour location on Google Maps and get directions.</p>
        </div>
      </div>
    </section>
  )
}
