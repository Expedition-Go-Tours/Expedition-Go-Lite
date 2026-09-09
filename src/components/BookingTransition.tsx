import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import './BookingTransition.css'

/**
 * Full-screen transition played between clicking "Book Now" and landing on the
 * booking page. Shows the Sandy Loading Lottie animation with a caption and
 * progress bar.
 *
 * Rendered via a portal to <body> so it sits above the navbar and all page
 * chrome (gallery buttons, share, wishlist, etc.).
 */

const TOTAL_MS = 2600

const ANIMATION_PATHS = [
  '/animations/vintage-car.lottie',
  '/animations/sandy-loading.lottie',
  '/animations/globe.lottie',
  '/animations/dice-roll.lottie',
]

function getRandomAnimation(): string {
  return ANIMATION_PATHS[Math.floor(Math.random() * ANIMATION_PATHS.length)]
}

interface BookingTransitionProps {
  onDone: () => void
  caption?: string
  animationSrc?: string
}

export default function BookingTransition({ onDone, caption = 'Preparing your booking', animationSrc }: BookingTransitionProps) {
  const [ready, setReady] = useState(false)
  const [selectedAnimation] = useState(() => animationSrc || getRandomAnimation())

  useEffect(() => {
    const timer = setTimeout(onDone, TOTAL_MS)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = prevOverflow
    }
  }, [onDone])

  const overlay = (
    <motion.div
      className="bt-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="bt-lottie">
        <DotLottieReact
          src={selectedAnimation}
          loop
          autoplay
          dotLottieRefCallback={() => setReady(true)}
          style={{ width: '100%', height: '100%' }}
        />
        {!ready && (
          <div className="bt-lottie-placeholder" />
        )}
      </div>

      <div className="bt-caption">
        <span>{caption}</span>
        <span className="bt-dots">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="bt-dot"
              animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            />
          ))}
        </span>
      </div>

      <div className="bt-bar">
        <motion.span
          className="bt-bar-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: TOTAL_MS / 1000, ease: 'linear' }}
        />
      </div>
    </motion.div>
  )

  return createPortal(overlay, document.body)
}


