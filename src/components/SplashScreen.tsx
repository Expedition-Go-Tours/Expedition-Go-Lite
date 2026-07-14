import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './SplashScreen.css'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Show splash screen for 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 2500)

    // Call onComplete after fade out animation
    const completeTimer = setTimeout(() => {
      onComplete()
    }, 3000)

    return () => {
      clearTimeout(timer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="splash-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="splash-content">
            {/* Logo with animations */}
            <motion.div
              className="splash-logo-container"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                rotate: [0, 360]
              }}
              transition={{ 
                scale: { duration: 0.6, ease: 'easeOut' },
                opacity: { duration: 0.6, ease: 'easeOut' },
                rotate: { duration: 1.2, ease: 'easeInOut' }
              }}
            >
              <img 
                src="/logo.png" 
                alt="Expedition-Go Logo" 
                className="splash-logo"
              />
            </motion.div>

            {/* Pulsing circle effect */}
            <motion.div
              className="splash-pulse-circle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.2, 0.8],
                opacity: [0, 0.6, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />

            {/* Company name text */}
            <motion.div
              className="splash-text"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <h1 className="splash-title">EXPEDITION-GO</h1>
              <p className="splash-subtitle">Travel and Tours</p>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              className="splash-loading-bar"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
