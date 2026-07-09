import './PartnersSection.css'
import trippySrc from '../assets/icons/trippy.png'
import bookingSrc from '../assets/icons/booking-com.png'
import getyourguideSrc from '../assets/icons/getyourguide.png'
import civitatisSrc from '../assets/icons/Civitatis-Logo.png'
import toughaSrc from '../assets/icons/TOUGHA.png'
import paypalSrc from '../assets/icons/paypal.png'
import bokunSrc from '../assets/icons/bokun.png'
import gtaSrc from '../assets/icons/GTA.png'
import tourhubSrc from '../assets/icons/tourhub.png'
import sssSrc from '../assets/icons/SSS.png'

const logos = [
  { src: trippySrc, alt: 'Tripadvisor' },
  { src: bookingSrc, alt: 'Booking.com' },
  { src: getyourguideSrc, alt: 'GetYourGuide' },
  { src: civitatisSrc, alt: 'Civitatis' },
  { src: toughaSrc, alt: 'TOUGHA' },
  { src: paypalSrc, alt: 'PayPal', tall: true },
  { src: bokunSrc, alt: 'Bokun', tall: true },
  { src: gtaSrc, alt: 'GTA' },
  { src: tourhubSrc, alt: 'TourHub', tall: true },
  { src: sssSrc, alt: 'SSS' },
]

export default function PartnersSection() {
  return (
    <section className="partners-section">
      <div className="partners-container">
        <div className="partners-viewport">
          <h2 className="partners-heading">Companies We Work With</h2>
          <div className="partners-track-wrap">
            <div className="partners-track">
              {[...logos, ...logos].map((logo, i) => (
                <div key={`${logo.alt}-${i}`} className="partner-logo-wrap">
                  <div className={`partner-logo-card${logo.tall ? ' partner-logo-card--tall' : ''}`}>
                    <img src={logo.src} alt={logo.alt} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
