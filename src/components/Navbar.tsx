import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import logoSrc from '../assets/new_comp_pic.png'
import userSrc from '../assets/icons/User.png'
import SignUpPage from './SignUpPage'
import SignInPage from './SignInPage'
import './Navbar.css'

export default function Navbar() {
  const [searchBarSticky, setSearchBarSticky] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cleanup: (() => void) | null = null

    const setup = () => {
      const heroSearch = document.getElementById('hero-search-bar')
      if (!heroSearch) {
        const id = setTimeout(setup, 100)
        cleanup = () => clearTimeout(id)
        return
      }

      document.body.classList.remove('hero--search-sticky')
      setSearchBarSticky(false)

      const navbar = document.querySelector('.navbar')
      const navbarHeight = navbar ? navbar.clientHeight : 64

      const handleScroll = () => {
        if (window.scrollY < 10) {
          document.body.classList.remove('hero--search-sticky')
          setSearchBarSticky(false)
          return
        }
        const rect = heroSearch.getBoundingClientRect()
        if (rect.height === 0) return
        const sticky = rect.top <= navbarHeight + 4
        document.body.classList.toggle('hero--search-sticky', sticky)
        setSearchBarSticky(sticky)
      }

      window.addEventListener('scroll', handleScroll, { passive: true })
      handleScroll()

      cleanup = () => {
        window.removeEventListener('scroll', handleScroll)
        document.body.classList.remove('hero--search-sticky')
      }
    }

    setup()

    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navLinks = [
    { label: 'Tours', href: '#' },
    { label: 'About', href: '#' },
    { label: 'Contact', href: '#' },
  ]

  return (
    <nav className={`navbar${searchBarSticky ? ' scrolled' : ''}`}>
      <div className="nav-left">
        <button className="nav-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
        <div className="nav-logo">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <img src={logoSrc} alt="Expedition-GO" className="nav-logo-img" />
          </a>
        </div>
      </div>

      <div className="nav-center">
        <div className="navbar-compact-search">
          <form className="navbar-search-form" onSubmit={(e) => e.preventDefault()}>
            <div className="navbar-search-inner">
              <svg className="navbar-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <div className="navbar-search-input-inner">
                <input
                  type="text"
                  className="navbar-search-input"
                  placeholder="Where are you going?"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="navbar-search-btn-wrap">
              <button type="submit" className="navbar-search-btn">Search</button>
            </div>
          </form>
        </div>
      </div>

      <div className="nav-right">
        <div className="nav-icons">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <div className="nav-avatar-wrapper" ref={dropdownRef}>
            <button className="nav-avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)} aria-label="Profile menu">
              <img src={userSrc} alt="Profile" className="nav-avatar-img" />
            </button>
            {dropdownOpen && (
              <div className="nav-dropdown">
                <div className="nav-dropdown-header" onClick={() => { setDropdownOpen(false); setShowAuth(true); setAuthMode('signup') }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M20 21a8 8 0 1 0-16 0" />
                  </svg>
                  Sign In / Sign Up
                </div>
                {navLinks.map((link) => (
                  <a key={link.label} href={link.href} className="nav-dropdown-item">{link.label}</a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="nav-mobile-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="nav-mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="nav-mobile-sign" onClick={() => { setMobileMenuOpen(false); setShowAuth(true); setAuthMode('signup') }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
              Sign In / Sign Up
            </div>
            <div className="nav-mobile-divider" />
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="nav-mobile-link">{link.label}</a>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showAuth && authMode === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ position: 'fixed', inset: 0, zIndex: 500 }}
          >
            <SignUpPage onSwitchToSignIn={() => setAuthMode('signin')} onBack={() => setShowAuth(false)} />
          </motion.div>
        )}
        {showAuth && authMode === 'signin' && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ position: 'fixed', inset: 0, zIndex: 500 }}
          >
            <SignInPage onSwitchToSignUp={() => setAuthMode('signup')} onBack={() => setShowAuth(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
