import { useState } from 'react'
import logoSrc from '../assets/new_comp_pic.png'
import './SignUpPage.css'

interface SignUpPageProps {
  onSwitchToSignIn: () => void
  onBack?: () => void
}

export default function SignUpPage({ onSwitchToSignIn, onBack }: SignUpPageProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="signup-overlay">
      {onBack && (
        <button className="signup-back" onClick={onBack} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
      )}
      <div className="signup-card">

        <div className="signup-logo">
          <img src={logoSrc} alt="Expedition-GO" />
        </div>

        <h1 className="signup-heading">Create your account</h1>
        <p className="signup-subtitle">Join us and start exploring</p>

        <form className="signup-form" onSubmit={(e) => e.preventDefault()}>
          <div className="signup-field">
            <label className="signup-label">Full Name</label>
            <input type="text" className="signup-input" placeholder="Enter your full name" />
          </div>

          <div className="signup-field">
            <label className="signup-label">Email or Phone</label>
            <input type="text" className="signup-input" placeholder="Enter your email or phone" />
          </div>

          <div className="signup-field">
            <label className="signup-label">Password</label>
            <div className="signup-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="signup-input signup-password-input"
                placeholder="Create a password"
              />
              <button
                type="button"
                className="signup-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="signup-btn">Sign Up</button>
        </form>

        <div className="signup-divider">
          <span>or continue with</span>
        </div>

        <button className="signup-google-btn">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign up with Google
        </button>

        <p className="signup-footer">
          Already have an account? <a href="#" className="signup-footer-link" onClick={(e) => { e.preventDefault(); onSwitchToSignIn() }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
