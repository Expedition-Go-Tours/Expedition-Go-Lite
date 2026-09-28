import { useState, type FormEvent } from 'react'
import { Mail } from 'lucide-react'
import { useComingSoon } from '../hooks/useComingSoon'
import newsletterImg from '../assets/newsletter-square.jpg'
import './NewsletterSection.css'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const comingSoon = useComingSoon()

  // The mailing-list API is not wired up yet: the button is marked
  // "coming soon" and submission is deliberately a no-op.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
  }

  return (
    <section className="newsletter-section">
      <div className="newsletter-container">
        <div className="newsletter-card">
          <div className="newsletter-image-wrap">
            <img
              src={newsletterImg}
              alt="Aerial view of Black Star Square and Independence Arch in Accra"
              className="newsletter-image"
              loading="lazy"
            />
          </div>

          <div className="newsletter-content">
            <h2 className="newsletter-title">
              Never Miss a Deal or Destination
            </h2>
            <p className="newsletter-sub">
              Get exclusive travel tips, early-bird offers, and curated Ghana experiences
              delivered straight to your inbox. No spam, just adventures.
            </p>

            <form className="newsletter-form" onSubmit={handleSubmit}>
              <div className="newsletter-input-wrap">
                <input
                  type="email"
                  className="newsletter-input"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                />
                <Mail className="newsletter-input-icon" size={20} />
                <button
                  type="submit"
                  className="newsletter-btn is-coming-soon"
                  aria-label="Sign up"
                  {...comingSoon}
                >
                  Sign up
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
