import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Send, CheckCircle } from 'lucide-react'
import newsletterImg from '../assets/newsletter-accra.jpg'
import './NewsletterSection.css'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const reduce = useReducedMotion()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setEmail('')
  }

  return (
    <section className="newsletter-section">
      <div className="newsletter-container">
        <motion.div
          className="newsletter-image-wrap"
          initial={reduce ? undefined : { opacity: 0, x: -30 }}
          whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <img
            src={newsletterImg}
            alt="Accra cityscape at sunset"
            className="newsletter-image"
            loading="lazy"
            width={560}
            height={400}
          />
          <div className="newsletter-image-overlay" />
        </motion.div>

        <motion.div
          className="newsletter-content"
          initial={reduce ? undefined : { opacity: 0, x: 30 }}
          whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span className="newsletter-eyebrow">Stay in the loop</span>
          <h2 className="newsletter-title">
            Never Miss a <span className="newsletter-highlight">Deal</span> or <span className="newsletter-highlight">Destination</span>
          </h2>
          <p className="newsletter-sub">
            Get exclusive travel tips, early-bird offers, and curated Ghana experiences
            delivered straight to your inbox. No spam, just adventures.
          </p>

          {submitted ? (
            <div className="newsletter-success">
              <CheckCircle size={20} />
              <span>You are in! Watch your inbox for something special.</span>
            </div>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubmit}>
              <div className="newsletter-input-wrap">
                <input
                  type="email"
                  className="newsletter-input"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Email address"
                />
                <button type="submit" className="newsletter-btn" aria-label="Subscribe">
                  <Send size={18} />
                  <span className="newsletter-btn-text">Subscribe</span>
                </button>
              </div>
              <p className="newsletter-disclaimer">
                By subscribing you agree to our Privacy Policy. Unsubscribe anytime.
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}
