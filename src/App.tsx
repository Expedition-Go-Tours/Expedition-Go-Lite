import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import MoodSection from './components/MoodSection'
import RecommendSection from './components/RecommendSection'
import PopularLocations from './components/PopularLocations'
import DayToursSection from './components/DayToursSection'
import MultiDayToursSection from './components/MultiDayToursSection'
import TopRatedSection from './components/TopRatedSection'
import SellOutSection from './components/SellOutSection'
import LastMinuteDealsSection from './components/LastMinuteDealsSection'
import CustomReviewsSection from './components/CustomReviewsSection'
import PartnersSection from './components/PartnersSection'
import WhyBookSection from './components/WhyBookSection'
import NewsletterSection from './components/NewsletterSection'
import TravelStoriesSection from './components/TravelStoriesSection'
import Footer from './components/Footer'
import AuthForm from './components/AuthForm'
import { subscribeToAuthState, handleGoogleCallback, type AuthUser } from './lib/auth'

function App() {
  const [authPage, setAuthPage] = useState<'signin' | 'signup' | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const unsub = subscribeToAuthState((u) => setUser(u))
    return () => { unsub.then((fn) => fn()) }
  }, [])

  useEffect(() => {
    handleGoogleCallback()
  }, [])

  return (
    <>
      <Toaster position="top-center" />
      <AnimatePresence mode="wait">
        {authPage ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <AuthForm
              initialMode={authPage}
              onBack={() => setAuthPage(null)}
              onAuthSuccess={() => setAuthPage(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <Navbar onOpenAuth={(mode) => setAuthPage(mode)} />
            <Hero />
            <MoodSection />
            <RecommendSection />
            <PopularLocations />
            <DayToursSection />
            <MultiDayToursSection />
            <TopRatedSection />
            <SellOutSection />
            <LastMinuteDealsSection />
            <CustomReviewsSection />
            <PartnersSection />
            <WhyBookSection />
            <TravelStoriesSection />
            <NewsletterSection />
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App
