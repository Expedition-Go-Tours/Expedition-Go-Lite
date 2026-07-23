import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AuthForm from './pages/AuthForm'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import TourDetailPage from './pages/tour-detail/TourDetailPage'
import AllToursPage from './pages/AllToursPage'
import AllStoriesPage from './pages/AllStoriesPage'
import StoryDetailPage from './pages/StoryDetailPage'
import SplashScreen from './components/SplashScreen'
import ContinuePlanningSection from './components/ContinuePlanningSection'
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
import TravelStoriesSection from './components/TravelStoriesSection'
import NewsletterSection from './components/NewsletterSection'
import Footer from './components/Footer'
import MountOnView from './components/MountOnView'
import ReviewExperiencePage from './pages/ReviewExperiencePage'
import SupplierPage from './pages/SupplierPage'
import BookingPage from './pages/BookingPage'
import { WishlistProvider } from './context/WishlistContext'
import { ContinuePlanningProvider } from './context/ContinuePlanningContext'
import SupportChatWidget from './components/SupportChatWidget'
import { subscribeToAuthState, handleGoogleCallback } from './lib/auth'


type PageView = 'home' | 'signin' | 'signup'

function HomePage() {
  return (
    <>
      <Hero />
      <ContinuePlanningSection />
      <MoodSection />
      <RecommendSection />
      <PopularLocations />
      <MountOnView><DayToursSection /></MountOnView>
      <MountOnView><MultiDayToursSection /></MountOnView>
      <MountOnView><TopRatedSection /></MountOnView>
      <MountOnView><SellOutSection /></MountOnView>
      <MountOnView><LastMinuteDealsSection /></MountOnView>
      <MountOnView><CustomReviewsSection /></MountOnView>
      <MountOnView><PartnersSection /></MountOnView>
      <MountOnView><WhyBookSection /></MountOnView>
      <MountOnView><TravelStoriesSection /></MountOnView>
      <MountOnView><NewsletterSection /></MountOnView>
      <Footer />
    </>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageView>('home')
  const [showSplash, setShowSplash] = useState(() => {
    // Show only on the first entrance of a browser session — not on later
    // navigations/reloads (e.g. opening a tour card).
    try {
      return !sessionStorage.getItem('eg_splash_seen')
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (showSplash) {
      try {
        sessionStorage.setItem('eg_splash_seen', '1')
      } catch {
        /* ignore */
      }
    }
  }, [showSplash])
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = subscribeToAuthState(() => {})
    return () => { unsub.then((fn) => fn()) }
  }, [])

  useEffect(() => {
    handleGoogleCallback()
  }, [])

  const handleOpenAuth = (mode: 'signin' | 'signup') => {
    navigate('/')
    setCurrentPage(mode)
  }
  const handleGoHome = () => setCurrentPage('home')

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
          >
            <SplashScreen onFinish={() => setShowSplash(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="top-center" duration={2500} closeButton />
      <Navbar onOpenAuth={handleOpenAuth} />
      <SupportChatWidget />
      <Routes>
        <Route path="/dashboard/*" element={<DashboardLayout />} />
        <Route path="/tour/:tourId" element={
          <TourDetailPage />
        } />
        <Route path="/tours" element={
          <AllToursPage onOpenAuth={handleOpenAuth} />
        } />
        <Route path="/review/:tourTitle" element={
          <ReviewExperiencePage />
        } />
        <Route path="/supplier/:supplierName" element={
          <SupplierPage />
        } />
        <Route path="/booking" element={
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <BookingPage />
          </motion.div>
        } />
        <Route path="/stories" element={<AllStoriesPage />} />
        <Route path="/stories/:slug" element={<StoryDetailPage />} />
        <Route path="/*" element={
          <AnimatePresence mode="wait">
            {currentPage === 'signin' || currentPage === 'signup' ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <AuthForm
                  initialMode={currentPage}
                  onBack={handleGoHome}
                  onAuthSuccess={handleGoHome}
                />
              </motion.div>
            ) : (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <HomePage />
              </motion.div>
            )}
          </AnimatePresence>
        } />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <WishlistProvider>
        <ContinuePlanningProvider>
          <AppContent />
        </ContinuePlanningProvider>
      </WishlistProvider>
    </BrowserRouter>
  )
}

export default App
