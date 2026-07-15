import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import logoSrc from '../assets/expo_trans.png'
import userSrc from '../assets/icons/User Circle.png'
import { subscribeToAuthState, signOutUser, getStoredAuthUser, type AuthUser } from '../lib/auth'
import { useSearchAutocomplete, type SearchSuggestion } from '../hooks/useSearchAutocomplete'
import './Navbar.css'

interface NavbarProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
  onOpenDashboard?: () => void
  onOpenWishlist?: () => void
  onOpenBookings?: () => void
}

export default function Navbar({ onOpenAuth, onOpenDashboard, onOpenWishlist, onOpenBookings }: NavbarProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(getStoredAuthUser)
  const [searchBarSticky, setSearchBarSticky] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [navSearchValue, setNavSearchValue] = useState('')
  const [showNavDropdown, setShowNavDropdown] = useState(false)
  const [navHighlightedIndex, setNavHighlightedIndex] = useState(-1)
  const navSearchRef = useRef<HTMLDivElement>(null)
  const navInputRef = useRef<HTMLInputElement>(null)
  const navSuggestions = useSearchAutocomplete(navSearchValue)

  useEffect(() => {
    const unsub = subscribeToAuthState((u) => setUser(u))
    return () => { unsub.then((fn) => fn()) }
  }, [])

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

  const navigateToSuggestion = useCallback((suggestion: SearchSuggestion) => {
    setShowNavDropdown(false)
    setNavSearchValue('')
    setNavHighlightedIndex(-1)
    if (suggestion.type === 'tour' && suggestion.slug) {
      navigate(`/tour/${suggestion.slug}`)
    }
  }, [navigate])

  const navigateToBestMatch = useCallback(() => {
    setShowNavDropdown(false)
    setNavSearchValue('')
    setNavHighlightedIndex(-1)
    const q = navSearchValue.trim().toLowerCase()
    if (!q) return
    for (const s of navSuggestions) {
      if (s.type === 'tour' && s.slug) {
        navigate(`/tour/${s.slug}`)
        return
      }
    }
  }, [navSearchValue, navSuggestions, navigate])

  const handleNavKeyDown = (e: React.KeyboardEvent) => {
    if (!showNavDropdown) {
      if (e.key === 'ArrowDown' && navSuggestions.length > 0) {
        e.preventDefault()
        setShowNavDropdown(true)
        setNavHighlightedIndex(0)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setNavHighlightedIndex(prev =>
          prev < navSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setNavHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : navSuggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (navHighlightedIndex >= 0 && navHighlightedIndex < navSuggestions.length) {
          navigateToSuggestion(navSuggestions[navHighlightedIndex])
        } else {
          navigateToBestMatch()
        }
        break
      case 'Tab':
        if (navHighlightedIndex >= 0 && navHighlightedIndex < navSuggestions.length) {
          e.preventDefault()
          navigateToSuggestion(navSuggestions[navHighlightedIndex])
        } else {
          setShowNavDropdown(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowNavDropdown(false)
        setNavHighlightedIndex(-1)
        navInputRef.current?.blur()
        break
    }
  }

  useEffect(() => {
    if (navSuggestions.length > 0 && navSearchValue.trim().length >= 2) {
      setShowNavDropdown(true)
      setNavHighlightedIndex(-1)
    } else {
      setShowNavDropdown(false)
      setNavHighlightedIndex(-1)
    }
  }, [navSuggestions, navSearchValue])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (navSearchRef.current && !navSearchRef.current.contains(e.target as Node)) {
        setShowNavDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const dropdownLinks = [
    ...(user ? [{ label: 'Bookings' as const, icon: 'bag' as const }] : []),
    ...(user ? [{ label: 'Dashboard' as const, icon: 'grid' as const }] : []),
    { label: 'About' as const, icon: 'info' as const },
    { label: 'Contact' as const, icon: 'mail' as const },
  ]

  return (
    <nav className={`navbar${searchBarSticky ? ' scrolled' : ''}`}>
      <div className="nav-left">
        <div className="nav-logo">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
            <img src={logoSrc} alt="Expedition-GO" className="nav-logo-img" />
          </a>
        </div>
      </div>

      <div className="nav-center">
        <div className="navbar-compact-search" ref={navSearchRef}>
          <form className="navbar-search-form" onSubmit={(e) => {
            e.preventDefault()
            if (navHighlightedIndex >= 0 && navHighlightedIndex < navSuggestions.length) {
              navigateToSuggestion(navSuggestions[navHighlightedIndex])
            } else {
              navigateToBestMatch()
            }
          }}>
            <div className="navbar-search-inner">
              <svg className="navbar-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <div className="navbar-search-input-inner">
                <input
                  ref={navInputRef}
                  type="text"
                  className="navbar-search-input"
                  placeholder="Where are you going?"
                  autoComplete="off"
                  value={navSearchValue}
                  onChange={(e) => setNavSearchValue(e.target.value)}
                  onKeyDown={handleNavKeyDown}
                  onFocus={() => {
                    if (navSuggestions.length > 0 && navSearchValue.trim().length >= 2) {
                      setShowNavDropdown(true)
                    }
                  }}
                />
              </div>
            </div>
            <div className="navbar-search-btn-wrap">
              <button type="submit" className="navbar-search-btn">Search</button>
            </div>
          </form>

          {showNavDropdown && navSuggestions.length > 0 && (
            <div className="navbar-search-dropdown">
              {navSuggestions.map((suggestion, idx) => {
                const isHighlighted = idx === navHighlightedIndex
                const showDestHeader = suggestion.type === 'destination' && (idx === 0 || navSuggestions[idx - 1]?.type !== 'destination')
                const showTourHeader = suggestion.type === 'tour' && (idx === 0 || navSuggestions[idx - 1]?.type !== 'tour')

                return (
                  <div key={suggestion.id}>
                    {showDestHeader && (
                      <div className="search-dropdown-section">Destinations</div>
                    )}
                    {showTourHeader && (
                      <div className="search-dropdown-section">Tours &amp; Experiences</div>
                    )}
                    <div
                      className={`search-suggestion${isHighlighted ? ' highlighted' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        navigateToSuggestion(suggestion)
                      }}
                      onMouseEnter={() => setNavHighlightedIndex(idx)}
                    >
                      {suggestion.type === 'destination' ? (
                        <>
                          <div className="search-suggestion-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                          </div>
                          <div className="search-suggestion-text">
                            <span className="search-suggestion-title">{suggestion.title}</span>
                            <span className="search-suggestion-sub">{suggestion.subtitle}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="search-suggestion-img">
                            <img src={suggestion.image} alt="" loading="lazy" />
                          </div>
                          <div className="search-suggestion-text">
                            <span className="search-suggestion-title">{suggestion.title}</span>
                            <span className="search-suggestion-sub">{suggestion.subtitle}</span>
                          </div>
                          <span className="search-suggestion-price">{suggestion.price}</span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="nav-right">
        <div className="nav-icons">
          <a href="#" className="nav-icon-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            <span className="nav-icon-label">Tours</span>
          </a>
          <a href="#" className="nav-icon-item" onClick={(e) => { e.preventDefault(); onOpenWishlist?.() }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="nav-icon-label">Wishlist</span>
          </a>
          <div className="nav-icon-item" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="nav-avatar-wrapper" ref={dropdownRef}>
              <button className="nav-avatar-btn" onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen) }} aria-label="Profile menu">
                <img src={user?.photoURL || userSrc} alt="Profile" className="nav-avatar-img" onError={(e) => { (e.target as HTMLImageElement).src = userSrc }} />
              </button>
              {dropdownOpen && (
                <div className="nav-dropdown">
                  {user ? (
                    <div className="nav-dropdown-user">
                      <img
                        src={user.photoURL || userSrc}
                        alt=""
                        className="nav-dropdown-avatar"
                        onError={(e) => { (e.target as HTMLImageElement).src = userSrc }}
                      />
                      <span className="nav-dropdown-email">{user.email}</span>
                    </div>
                  ) : (
                    <div className="nav-dropdown-header" onClick={() => { setDropdownOpen(false); onOpenAuth?.('signup') }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M20 21a8 8 0 1 0-16 0" />
                      </svg>
                      Sign In / Sign Up
                    </div>
                  )}

                  {dropdownLinks.map((link) => (
                    <a
                      key={link.label}
                      href="#"
                      className="nav-dropdown-item"
                      onClick={(e) => {
                        e.preventDefault()
                        if (link.label === 'Dashboard') {
                          setDropdownOpen(false)
                          onOpenDashboard?.()
                        }
                        if (link.label === 'Bookings') {
                          setDropdownOpen(false)
                          onOpenBookings?.()
                        }
                      }}
                    >
                      {link.icon === 'bag' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                      )}
                      {link.icon === 'grid' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                      )}
                      {link.icon === 'info' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                      )}
                      {link.icon === 'mail' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      )}
                      {link.label}
                    </a>
                  ))}

                  {user && (
                    signingOut ? (
                      <div className="nav-dropdown-signingout">
                        <div className="nav-spinner-sm" />
                        Signing Out
                      </div>
                    ) : (
                      <div className="nav-dropdown-signout" onClick={async (e) => {
                        e.stopPropagation()
                        setSigningOut(true)
                        await signOutUser()
                        setSigningOut(false)
                        setDropdownOpen(false)
                        toast.success('Successfully signed out')
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign Out
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
            <span className="nav-icon-label">{user?.name || 'Profile'}</span>
          </div>
        </div>
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
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="nav-mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="nav-mobile-menu"
              onClick={(e) => e.stopPropagation()}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
            <button className="nav-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {user ? (
              <div className="nav-mobile-user">
                <img src={user.photoURL || userSrc} alt="" className="nav-mobile-user-avatar" onError={(e) => { (e.target as HTMLImageElement).src = userSrc }} />
                <div className="nav-mobile-user-info">
                  <span className="nav-mobile-user-name">{user.name}</span>
                  <span className="nav-mobile-user-email">{user.email}</span>
                </div>
              </div>
            ) : (
              <a href="#" className="nav-mobile-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M20 21a8 8 0 1 0-16 0" />
                </svg>
                Profile
              </a>
            )}
            <a href="#" className="nav-mobile-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
              Tours
            </a>
            <a href="#" className="nav-mobile-link" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); onOpenWishlist?.() }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Wishlist
            </a>
            <div className="nav-mobile-divider" />
            {user && (
              <a href="#" className="nav-mobile-link" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); onOpenBookings?.() }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                Bookings
              </a>
            )}
            {user && (
              <a href="#" className="nav-mobile-link" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); onOpenDashboard?.() }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Dashboard
              </a>
            )}
            <a href="#" className="nav-mobile-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              About
            </a>
            <a href="#" className="nav-mobile-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Contact
            </a>
            <div className="nav-mobile-divider" />
            {user ? (
              signingOut ? (
                <div className="nav-mobile-signingout">
                  <div className="nav-spinner-sm" />
                  Signing Out
                </div>
              ) : (
                <div className="nav-mobile-signout" onClick={async () => {
                  setSigningOut(true)
                  await signOutUser()
                  setSigningOut(false)
                  setMobileMenuOpen(false)
                  toast.success('Successfully signed out', {
                    position: 'top-center',
                    duration: 3000,
                  })
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </div>
              )
            ) : (
              <div className="nav-mobile-sign" onClick={() => { setMobileMenuOpen(false); onOpenAuth?.('signup') }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M20 21a8 8 0 1 0-16 0" />
                </svg>
                Sign In / Sign Up
              </div>
            )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </nav>
  )
}
