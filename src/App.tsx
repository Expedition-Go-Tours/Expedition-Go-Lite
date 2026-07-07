import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import Footer from './components/Footer'
import FeedbackSection from './components/FeedbackSection'
import AuthForm from './components/AuthForm'

function App() {
  const [authPage, setAuthPage] = useState<'signin' | 'signup' | null>(null)

  return (
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
          <FeedbackSection />
          <Footer />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default App
