import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AuthForm from './components/AuthForm'
import DashboardLayout from './components/dashboard/DashboardLayout'
import TourDetailPage from './components/tour-detail/TourDetailPage'
import AllToursPage from './components/AllToursPage'
import AllStoriesPage from './components/AllStoriesPage'
import StoryDetailPage from './components/StoryDetailPage'
import SplashScreen from './components/SplashScreen'
import ReviewExperiencePage from './pages/ReviewExperiencePage'
import SupplierPage from './pages/SupplierPage'
import BookingPage from './pages/BookingPage'
import { WishlistProvider } from './context/WishlistContext'
import { ContinuePlanningProvider } from './context/ContinuePlanningContext'
import SupportChatWidget from './components/SupportChatWidget'
import { subscribeToAuthState, handleGoogleCallback } from './lib/auth'
import LazySection from './components/LazySection'

type PageView = 'home' | 'signin' | 'signup'

function HomePage({ onOpenAuth }: any) {
  return (
    <>
      <Navbar onOpenAuth={onOpenAuth} />
      <Hero />
      <LazySection load={() => import('./components/ContinuePlanningSection')} />
      <LazySection load={() => import('./components/MoodSection')} />
      <LazySection load={() => import('./components/RecommendSection')} />
      <LazySection load={() => import('./components/PopularLocations')} />
      <LazySection load={() => import('./components/DayToursSection')} />
      <LazySection load={() => import('./components/MultiDayToursSection')} />
      <LazySection load={() => import('./components/TopRatedSection')} />
      <LazySection load={() => import('./components/SellOutSection')} />
      <LazySection load={() => import('./components/LastMinuteDealsSection')} />
      <LazySection load={() => import('./components/CustomReviewsSection')} />
      <LazySection load={() => import('./components/PartnersSection')} />
      <LazySection load={() => import('./components/WhyBookSection')} />
      <LazySection load={() => import('./components/TravelStoriesSection')} />
      <LazySection load={() => import('./components/NewsletterSection')} />
      <LazySection load={() => import('./components/Footer')} />
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
      <SupportChatWidget />
      <Routes>
        <Route path="/dashboard/*" element={<DashboardLayout />} />
        <Route path="/tour/:tourId" element={
          <TourDetailPage onOpenAuth={handleOpenAuth} />
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
                <HomePage onOpenAuth={handleOpenAuth} />
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
