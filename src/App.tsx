import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
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
import Dashboard from './components/Dashboard'
import TourDetailPage from './components/tour-detail/TourDetailPage'
import AllToursPage from './components/AllToursPage'
import ReviewExperiencePage from './pages/ReviewExperiencePage'
import SupplierPage from './pages/SupplierPage'
import { WishlistProvider } from './context/WishlistContext'
import { ContinuePlanningProvider } from './context/ContinuePlanningContext'
import ContinuePlanningSection from './components/ContinuePlanningSection'
import { subscribeToAuthState, handleGoogleCallback } from './lib/auth'

type PageView = 'home' | 'signin' | 'signup' | 'dashboard'

function HomePage({ onOpenAuth, onOpenDashboard, onOpenWishlist, onOpenBookings }: any) {
  return (
    <>
      <Navbar onOpenAuth={onOpenAuth} onOpenDashboard={onOpenDashboard} onOpenWishlist={onOpenWishlist} onOpenBookings={onOpenBookings} />
      <Hero />
      <ContinuePlanningSection />
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
    </>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageView>('home')
  const [dashboardMenu, setDashboardMenu] = useState<string | undefined>()
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
  const handleOpenDashboard = () => {
    navigate('/')
    setDashboardMenu(undefined)
    setCurrentPage('dashboard')
  }
  const handleOpenWishlist = () => {
    navigate('/')
    setDashboardMenu('wishlist')
    setCurrentPage('dashboard')
  }
  const handleOpenBookings = () => {
    navigate('/')
    setDashboardMenu('bookings')
    setCurrentPage('dashboard')
  }
  const handleGoHome = () => setCurrentPage('home')

  return (
    <>
      <Toaster position="top-center" duration={2500} closeButton />
      <Routes>
        <Route path="/tour/:tourId" element={
          <TourDetailPage
            onOpenAuth={handleOpenAuth}
            onOpenDashboard={handleOpenDashboard}
            onOpenWishlist={handleOpenWishlist}
            onOpenBookings={handleOpenBookings}
          />
        } />
        <Route path="/tours" element={
          <AllToursPage
            onOpenAuth={handleOpenAuth}
            onOpenDashboard={handleOpenDashboard}
            onOpenWishlist={handleOpenWishlist}
            onOpenBookings={handleOpenBookings}
          />
        } />
        <Route path="/review/:tourTitle" element={
          <ReviewExperiencePage />
        } />
        <Route path="/supplier/:supplierName" element={
          <SupplierPage />
        } />
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
            ) : currentPage === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <Dashboard onBack={handleGoHome} initialMenu={dashboardMenu} />
              </motion.div>
            ) : (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <HomePage 
                  onOpenAuth={handleOpenAuth}
                  onOpenDashboard={handleOpenDashboard}
                  onOpenWishlist={handleOpenWishlist}
                  onOpenBookings={handleOpenBookings}
                />
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
