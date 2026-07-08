import { useEffect, useRef } from 'react'
import './PartnersSection.css'
import trippySrc from '../assets/icons/trippy.png'
import bookingSrc from '../assets/icons/booking-com.png'
import getyourguideSrc from '../assets/icons/getyourguide.png'
import civitatisSrc from '../assets/icons/Civitatis-Logo.png'

const logos = [
  { src: trippySrc, alt: 'Tripadvisor' },
  { src: bookingSrc, alt: 'Booking.com' },
  { src: getyourguideSrc, alt: 'GetYourGuide' },
  { src: civitatisSrc, alt: 'Civitatis' },
]

export default function PartnersSection() {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let x = 0
    const speed = 0.8
    let animationId: number

    const animate = () => {
      x -= speed
      const half = track.scrollWidth / 2
      if (Math.abs(x) >= half) {
        x = 0
      }
      track.style.transform = `translateX(${x}px)`
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  const items = [...logos, ...logos]

  return (
    <section className="partners-section">
      <div className="partners-container">
        <div className="partners-viewport">
          <h2 className="partners-heading">Our Partners</h2>
          <div className="partners-track-wrap">
            <div className="partners-track" ref={trackRef}>
              {items.map((logo, i) => (
                <div key={`${logo.alt}-${i}`} className="partner-logo-wrap">
                  <div className="partner-logo-card">
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
