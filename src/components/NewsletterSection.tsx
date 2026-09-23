import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Mail, CheckCircle } from 'lucide-react'
import newsletterImg from '../assets/newsletter-square.jpg'
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
        <div className="newsletter-card">
          <motion.div
            className="newsletter-image-wrap"
            initial={reduce ? undefined : { opacity: 0, x: -30 }}
            whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <img
              src={newsletterImg}
              alt="Aerial view of Black Star Square and Independence Arch in Accra"
              className="newsletter-image"
              loading="lazy"
            />
          </motion.div>

          <motion.div
            className="newsletter-content"
            initial={reduce ? undefined : { opacity: 0, x: 30 }}
            whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h2 className="newsletter-title">
              Never Miss a Deal or Destination
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
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-label="Email address"
                  />
                  <Mail className="newsletter-input-icon" size={20} />
                  <button type="submit" className="newsletter-btn" aria-label="Sign up">
                    Sign up
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
