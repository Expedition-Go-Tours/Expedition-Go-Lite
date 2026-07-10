import './NewsletterSection.css'
import heroSrc from '../assets/newsletter-hero.jpg'

export default function NewsletterSection() {
  return (
    <section className="newsletter-section">
      <div className="newsletter-container">
        <div className="newsletter-viewport">
          <div className="newsletter-card">
        <div className="newsletter-image">
          <img src={heroSrc} alt="Kwame Nkrumah Memorial Park" loading="lazy" />
        </div>
        <div className="newsletter-content">
          <h2 className="newsletter-heading">Adventure is calling — answer it</h2>
          <p className="newsletter-text">
            Receive curated travel itineraries featuring the most iconic experiences, exclusive deals, and insider tips straight to your inbox.
          </p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <div className="newsletter-input-wrap">
              <input
                type="email"
                className="newsletter-input"
                placeholder="Email"
                required
                autoComplete="email"
              />
              <button type="submit" className="newsletter-btn">Subscribe</button>
            </div>
          </form>
          <p className="newsletter-disclaimer">
            By signing up, you agree to receive promotional emails on activities and insider tips. You can unsubscribe or withdraw your consent at any time. For more information, read our <a href="#" className="newsletter-link">Privacy statement</a>.
          </p>
        </div>
          </div>
        </div>
      </div>
    </section>
  )
}
