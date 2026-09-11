import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import RouteErrorBoundary from './components/RouteErrorBoundary'
import ContinuePlanningSection from './components/ContinuePlanningSection'
import MoodSection from './components/MoodSection'
import RecommendSection from './components/RecommendSection'
import PopularLocations from './components/PopularLocations'
import ExternalReviewsSection from './components/ExternalReviewsSection'
import PartnersSection from './components/PartnersSection'
import WhyBookSection from './components/WhyBookSection'
import LocationSearchSkeleton from './components/LocationSearchSkeleton'
import HomeSectionSkeleton from './components/HomeSectionSkeleton'
import HistorySections from './components/HistorySections'
import PreviousSearchSections from './components/PreviousSearchSections'

import Footer from './components/Footer'
import MountOnView from './components/MountOnView'
import { WishlistProvider } from './context/WishlistContext'
import { ContinuePlanningProvider } from './context/ContinuePlanningContext'
import { SellOutProvider } from './context/SellOutContext'
import { LocationSearchProvider, useLocationSearch } from './context/LocationSearchContext'
import GoogleOneTapPrompt from './components/GoogleOneTapPrompt'
import { subscribeToAuthState, handleGoogleCallback, getAuthReturnTo, clearAuthReturnTo } from './lib/auth'
import { AuthProvider } from './context/AuthContext'
import { startSessionWatchdog, stopSessionWatchdog } from './auth/sessionManager'
import { trackPageView, requestLocation } from './lib/analytics'
import { useHomepage, useHomepageByCity } from './hooks/useHomepageSections'

// Route-level code splitting
const AuthForm = lazy(() => import('./pages/AuthForm'))
const DashboardApp = lazy(() => import('./pages/dashboard/DashboardApp'))
const TourDetailPage = lazy(() => import('./pages/tour-detail/TourDetailPage'))
const AllToursPage = lazy(() => import('./pages/AllToursPage'))
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'))
const AllStoriesPage = lazy(() => import('./pages/AllStoriesPage'))
const StoryDetailPage = lazy(() => import('./pages/StoryDetailPage'))
const AllReviewsPage = lazy(() => import('./pages/AllReviewsPage'))
const ReviewExperiencePage = lazy(() => import('./pages/ReviewExperiencePage'))
const SupplierPage = lazy(() => import('./pages/SupplierPage'))
const SupplierRegisterPage = lazy(() => import('./pages/supplier/SupplierRegisterPage'))
const SupplierLandingPage = lazy(() => import('./pages/supplier/SupplierLandingPage'))
const BookingPage = lazy(() => import('./pages/BookingPage'))
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const BookingPickupPage = lazy(() => import('./pages/BookingPickupPage'))

/** Old flat "Edit trip" URL → the dashboard-hosted page (keeps deep links working). */
function BookingModifyRedirect() {
  const { bookingId = '' } = useParams<{ bookingId: string }>()
  return <Navigate to={`/dashboard/bookings/${encodeURIComponent(bookingId)}/modify`} replace />
}
const HelpCentrePage = lazy(() => import('./pages/HelpCentrePage'))
const ContactUsPage = lazy(() => import('./pages/ContactUsPage'))
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'))
const FAQPage = lazy(() => import('./pages/FAQPage'))
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'))
const CareersPage = lazy(() => import('./pages/CareersPage'))
const PartnershipsPage = lazy(() => import('./pages/PartnershipsPage'))
const TermsAndConditionsPage = lazy(() => import('./pages/TermsAndConditionsPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const CookiesPolicyPage = lazy(() => import('./pages/CookiesPolicyPage'))
const SupplierTermsPage = lazy(() => import('./pages/SupplierTermsPage'))
const FoundationPage = lazy(() => import('./pages/FoundationPage'))
const PartnerApplyPage = lazy(() => import('./pages/partner/PartnerApplyPage'))
const ContentCreatorsPage = lazy(() => import('./pages/ContentCreatorsPage'))
const TravelAgentsPage = lazy(() => import('./pages/TravelAgentsPage'))
const HotelsProviderPage = lazy(() => import('./pages/HotelsProviderPage'))
const TransportPage = lazy(() => import('./pages/TransportPage'))
const TransportProviderPage = lazy(() => import('./pages/TransportProviderPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))

// Below-fold homepage sections (lazy loaded, mounted on scroll)
const TopRatedSection = lazy(() => import('./components/TopRatedSection'))
const SellOutSection = lazy(() => import('./components/SellOutSection'))
const LastMinuteDealsSection = lazy(() => import('./components/LastMinuteDealsSection'))
const NewExperiencesSection = lazy(() => import('./components/NewExperiencesSection'))
const TopAttractionsNearbySection = lazy(() => import('./components/TopAttractionsNearbySection'))


type PageView = 'home' | 'signin' | 'signup'

function HomePage() {
  const { currentLocation, previousLocations, hasActiveSearch } = useLocationSearch()
  const { data: homepage, isLoading } = useHomepage({ enabled: !hasActiveSearch })
  const { data: cityHomepage, isLoading: isCityLoading, isError: isCityError } = useHomepageByCity(currentLocation)

  // Use city-scoped data when a location search is active, fall back to global on error
  const data = hasActiveSearch && !isCityError ? (cityHomepage ?? homepage) : homepage
  const loading = hasActiveSearch ? isCityLoading : isLoading

  // Prefetch below-fold section chunks during browser idle time.
  useEffect(() => {
    const prefetch = () => {
      import('./components/TopRatedSection')
      import('./components/SellOutSection')
      import('./components/LastMinuteDealsSection')
      import('./components/NewExperiencesSection')
      import('./components/TopAttractionsNearbySection')
    }
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetch, { timeout: 3000 })
    } else {
      setTimeout(prefetch, 1000)
    }
  }, [])

  // Memoize the title formatter to avoid re-renders in section components
  // (must be above any conditional returns — Rules of Hooks)
  const locationTitle = useMemo(() => {
    if (!hasActiveSearch || !currentLocation) return undefined
    return (section: string) => `${section} in ${currentLocation}`
  }, [hasActiveSearch, currentLocation])
  const locationFilter = hasActiveSearch ? currentLocation ?? undefined : undefined

  // While a location search is loading, keep the real hero visible (instant
  // paint) and show the prototype's "Finding the best experiences in {loc}…"
  // loader with shimmer rows underneath.
  if (hasActiveSearch && isCityLoading) {
    return (
      <SellOutProvider tours={[]}>
        <GoogleOneTapPrompt />
        <Hero />
        <LocationSearchSkeleton location={currentLocation} />
        <Footer />
      </SellOutProvider>
    )
  }

  return (
    <SellOutProvider tours={data?.sellOut ?? []}>
      <GoogleOneTapPrompt />
      <Hero />
      <ContinuePlanningSection />
      {/* Show history when no active search and user has previous locations */}
      {!hasActiveSearch && previousLocations.length > 0 && <HistorySections />}
      {/* Categories: "What do you want to do?" on the generic homepage,
          "Based on your search in {city}" when personalized. */}
      <MoodSection
        preloaded={data?.mood}
        isLoading={loading}
        title={locationTitle?.('Based on your search')}
      />
      <RecommendSection
        preloaded={data?.recommended}
        isLoading={loading}
        title={locationTitle?.('Recommended')}
        location={locationFilter}
      />
      {/* PopularLocations: hidden when personalized per spec */}
      {!hasActiveSearch && <PopularLocations preloaded={data?.destinations} />}
      <Suspense fallback={<HomeSectionSkeleton />}><TopRatedSection preloaded={data?.topRated} isLoading={loading} title={locationTitle?.('Top Rated')} location={locationFilter} /></Suspense>
      <Suspense fallback={<HomeSectionSkeleton />}><SellOutSection preloaded={data?.sellOut} isLoading={loading} title={locationTitle?.('Likely To Sell Out')} location={locationFilter} /></Suspense>
      <Suspense fallback={<HomeSectionSkeleton />}><LastMinuteDealsSection preloaded={data?.offers} isLoading={loading} title={locationTitle?.('Special Offers')} location={locationFilter} /></Suspense>
      <Suspense fallback={<HomeSectionSkeleton />}><NewExperiencesSection isLoading={loading} title={locationTitle?.('New Experiences')} location={locationFilter} /></Suspense>
      <Suspense fallback={<HomeSectionSkeleton />}><TopAttractionsNearbySection preloaded={data?.attractions} title={locationTitle?.('Top Attractions Nearby')} location={locationFilter} /></Suspense>
      <MountOnView><ExternalReviewsSection /></MountOnView>
      <MountOnView><PreviousSearchSections /></MountOnView>
      {/* Trust block only on the generic homepage (matches the prototype) */}
      {!hasActiveSearch && <MountOnView><PartnersSection /></MountOnView>}
      {!hasActiveSearch && <MountOnView><WhyBookSection /></MountOnView>}
      <Footer />
    </SellOutProvider>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageView>('home')
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = subscribeToAuthState(() => {})
    return () => { unsub.then((fn) => fn()) }   
  }, [])

  // Mount the session watchdog — runs for the lifetime of the app.
  useEffect(() => {
    startSessionWatchdog()
    return () => stopSessionWatchdog()
  }, [])

  useEffect(() => {
    // Processes the Google OAuth callback (a full page-load back from Google
    // with ?accessToken=...&refreshToken=...) and then honors any pending
    // return-to. Mount-only: react-router's useNavigate() returns a new
    // function whenever the pathname changes, so listing it in the deps would
    // re-run this on every navigation and consume the pending return-to.
    (async () => {
      const processed = await handleGoogleCallback()
      const returnTo = processed ? getAuthReturnTo() : null
      if (returnTo) {
        clearAuthReturnTo()
        navigate(returnTo)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenAuth = (mode: 'signin' | 'signup') => {
    navigate('/')
    setCurrentPage(mode)
  }
  const handleGoHome = () => setCurrentPage('home')
  const location = useLocation()

  // Land at the top of the page on every route change (e.g. clicking a supplier
  // link deep in a tour page shouldn't drop you mid-way down the next page).
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
    trackPageView(location.pathname + location.search)
  }, [location.pathname, location.search])

  // Request location once on mount for personalized recommendations
  useEffect(() => {
    requestLocation()
  }, [])

  const isBookingConfirmation = location.pathname.startsWith('/booking/confirmation')
  // The confirmation receipt is a normal page (keeps the navbar + footer). The
  // checkout + pickup steps stay focused (no chrome) to reduce distraction.
  const hideNav =
    currentPage === 'signin' ||
    currentPage === 'signup' ||
    location.pathname.startsWith('/dashboard') ||
    (location.pathname.startsWith('/booking') && !isBookingConfirmation) ||
    location.pathname.endsWith('/booking') ||
    location.pathname.startsWith('/supplier/register') ||
    location.pathname.startsWith('/supplier/list-experience') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/auth/callback')

  // /login?mode=signup opens the auth page straight on the sign-up tab
  // (used by flows like the partner application where sign-up is the primary action).
  const loginInitialMode = new URLSearchParams(location.search).get('mode') === 'signup' ? 'signup' : 'signin'

  return (
    <>
      <Toaster position="top-center" duration={2500} closeButton />
      {!hideNav && <Navbar onOpenAuth={handleOpenAuth} />}
      {/* Route shell: keyed so each navigation mounts a fresh subtree, but NOT
          animated to opacity 0 — an interrupted fade used to leave the new
          page permanently invisible (blank white until a manual refresh). */}
      <div
        key={location.pathname.startsWith('/dashboard') ? '/dashboard' : location.pathname}
        style={{ isolation: 'isolate' }}
      >
        <RouteErrorBoundary>
        <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}>
        <Routes>
          <Route path="/dashboard/*" element={<DashboardApp />} />
          <Route path="/tour/:tourId" element={
            <TourDetailPage />
          } />
          <Route path="/tours" element={
            <AllToursPage />
          } />
          <Route path="/search" element={
            <SearchResultsPage />
          } />
          <Route path="/help-centre" element={<HelpCentrePage />} />
          <Route path="/contact-us" element={<ContactUsPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/about-us" element={<AboutUsPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/partnerships" element={<PartnershipsPage />} />
          <Route path="/content-creators" element={
            <ContentCreatorsPage onOpenAuth={handleOpenAuth} />
          } />
          <Route path="/travel-agents" element={
            <TravelAgentsPage onOpenAuth={handleOpenAuth} />
          } />
          <Route path="/hotels" element={
            <HotelsProviderPage onOpenAuth={handleOpenAuth} />
          } />
          <Route path="/transport" element={
            <TransportPage onOpenAuth={handleOpenAuth} />
          } />
          <Route path="/transport-providers" element={
            <TransportProviderPage onOpenAuth={handleOpenAuth} />
          } />
          <Route path="/partners/:type/apply" element={
            <PartnerApplyPage onOpenAuth={handleOpenAuth} />
          } />
          <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/cookies-policy" element={<CookiesPolicyPage />} />
          <Route path="/foundation" element={<FoundationPage />} />
        <Route path="/supplier-terms" element={<SupplierTermsPage />} />
          <Route path="/review/:tourTitle" element={
            <ReviewExperiencePage />
          } />
          <Route path="/supplier/:supplierName" element={
            <SupplierPage />
          } />
          <Route path="/supplier/register" element={
            <SupplierRegisterPage onOpenAuth={handleOpenAuth} />
          } />
          <Route path="/supplier/list-experience" element={
            <SupplierLandingPage onOpenAuth={handleOpenAuth} />
          } />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/:tourId/booking" element={<BookingPage />} />
          <Route path="/booking/checkout" element={<CheckoutPage />} />
          <Route path="/booking/confirmation/:bookingId" element={<BookingConfirmationPage />} />
          <Route path="/booking/confirmation" element={<BookingConfirmationPage />} />
          <Route path="/booking/:bookingId/pickup" element={<BookingPickupPage />} />
          <Route path="/booking/:bookingId/modify" element={<BookingModifyRedirect />} />
          <Route path="/login" element={
            <AuthForm
              initialMode={loginInitialMode}
              onBack={() => navigate('/')}
              onAuthSuccess={() => navigate('/')}
            />
          } />
          <Route path="/auth/callback" element={
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          } />
          <Route path="/stories" element={<AllStoriesPage />} />
          <Route path="/stories/:slug" element={<StoryDetailPage />} />
          <Route path="/reviews" element={<AllReviewsPage />} />
          <Route path="/blog" element={<BlogPage onOpenAuth={handleOpenAuth} />} />
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
        </Suspense>
        </RouteErrorBoundary>
      </div>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <WishlistProvider>
        <AuthProvider>
          <ContinuePlanningProvider>
            <LocationSearchProvider>
              <AppContent />
            </LocationSearchProvider>
          </ContinuePlanningProvider>
        </AuthProvider>
      </WishlistProvider>
    </BrowserRouter>
  )
}

export default App
