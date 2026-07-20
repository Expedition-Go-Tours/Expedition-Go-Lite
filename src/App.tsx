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
import DashboardLayout from './components/dashboard/DashboardLayout'
import TourDetailPage from './components/tour-detail/TourDetailPage'
import AllToursPage from './components/AllToursPage'
import AllStoriesPage from './components/AllStoriesPage'
import ReviewExperiencePage from './pages/ReviewExperiencePage'
import SupplierPage from './pages/SupplierPage'
import { WishlistProvider } from './context/WishlistContext'
import { ContinuePlanningProvider } from './context/ContinuePlanningContext'
import ContinuePlanningSection from './components/ContinuePlanningSection'
import SupportChatWidget from './components/SupportChatWidget'
import { subscribeToAuthState, handleGoogleCallback } from './lib/auth'

type PageView = 'home' | 'signin' | 'signup'

function HomePage({ onOpenAuth }: any) {
  return (
    <>
      <Navbar onOpenAuth={onOpenAuth} />
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
        <Route path="/stories" element={<AllStoriesPage />} />
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
