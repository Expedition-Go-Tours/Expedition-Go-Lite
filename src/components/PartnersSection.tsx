import { useTranslation } from 'react-i18next'
import './PartnersSection.css'
import trippySrc from '../assets/icons/partners/trippy.webp'
import bookingSrc from '../assets/icons/partners/booking-com.webp'
import getyourguideSrc from '../assets/icons/partners/getyourguide.webp'
import civitatisSrc from '../assets/icons/partners/civitatis.webp'
import toughaSrc from '../assets/icons/partners/tougha.webp'
import paypalSrc from '../assets/icons/partners/paypal.webp'
import bokunSrc from '../assets/icons/partners/bokun.webp'
import gtaSrc from '../assets/icons/partners/gta.webp'
import tourhubSrc from '../assets/icons/partners/tourhub.webp'
import stripeSrc from '../assets/icons/partners/stripe.webp'
import nextSrc from '../assets/icons/partners/next1.webp'
import peSrc from '../assets/icons/partners/pe.webp'
import tqSrc from '../assets/icons/partners/tq.webp'
import marriotSrc from '../assets/icons/partners/marriott.webp'
import viatorSrc from '../assets/icons/partners/viator.webp'

type PartnerLogo = {
  src: string
  alt: string
  tall?: boolean
  /**
   * Expedition-Go Tours' public page on that platform, when one exists.
   * Tripadvisor and GetYourGuide expose operator/supplier profiles; Viator has
   * no public operator page (its product pages only show the supplier as a
   * non-linkable button), so its card points at the flagship Viator listing
   * run by Expedition-Go Tours Ltd instead.
   */
  href?: string
}

const logos: PartnerLogo[] = [
  {
    src: trippySrc,
    alt: 'Tripadvisor',
    href: 'https://www.tripadvisor.com/Attraction_Review-g293797-d24155300-Reviews-Expedition_Go_Tours_Ltd-Accra_Greater_Accra.html',
  },
  { src: bookingSrc, alt: 'Booking.com' },
  {
    src: getyourguideSrc,
    alt: 'GetYourGuide',
    href: 'https://www.getyourguide.com/expedition-go-tours-s484318/',
  },
  { src: civitatisSrc, alt: 'Civitatis' },
  { src: toughaSrc, alt: 'TOUGHA' },
  { src: paypalSrc, alt: 'PayPal', tall: true },
  { src: bokunSrc, alt: 'Bokun', tall: true },
  { src: gtaSrc, alt: 'GTA' },
  { src: tourhubSrc, alt: 'TourHub', tall: true },
  { src: stripeSrc, alt: 'Stripe', tall: true },
  { src: nextSrc, alt: 'NEXT', tall: true },
  { src: peSrc, alt: 'PE', tall: true },
  { src: tqSrc, alt: 'TQ' },
  { src: marriotSrc, alt: 'Marriot' },
  {
    src: viatorSrc,
    alt: 'Viator',
    href: 'https://www.viator.com/tours/Accra/Touring-Cape-Coast/d5517-358551P1',
  },
]

export default function PartnersSection() {
  const { t } = useTranslation()
  return (
    <section className="partners-section" aria-labelledby="partners-heading">
      <div className="partners-container">
        <div className="partners-viewport">
          <div className="partners-divider">
            <span className="partners-divider-line"></span>
            <span className="partners-divider-star">&#10022;</span>
            <span className="partners-divider-line"></span>
          </div>
          <h2 className="partners-heading" id="partners-heading">{t('partners.heading')}</h2>
          <p className="partners-subtitle">{t('partners.subtitle')}</p>
          <div className="partners-track-wrap">
            <div className="partners-track">
              {[...logos, ...logos].map((logo, i) => {
                // The second half duplicates the first for the seamless marquee
                // loop — it is decorative and must stay out of the a11y tree.
                const isClone = i >= logos.length
                const card = (
                  <div className={`partner-logo-card${logo.tall ? ' partner-logo-card--tall' : ''}`}>
                    <img
                      src={logo.src}
                      alt={isClone ? '' : logo.alt}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                      width={120}
                      height={40}
                    />
                  </div>
                )
                return (
                  <div
                    key={`${logo.alt}-${i}`}
                    className="partner-logo-wrap"
                    aria-hidden={isClone || undefined}
                  >
                    {logo.href ? (
                      <a
                        className="partner-logo-link"
                        href={logo.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('partners.profileLabel', { platform: logo.alt })}
                        tabIndex={isClone ? -1 : undefined}
                      >
                        {card}
                      </a>
                    ) : (
                      card
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
