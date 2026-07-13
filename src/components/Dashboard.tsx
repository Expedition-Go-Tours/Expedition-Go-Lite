import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import logoSrc from '../assets/expo_trans.png'
import userSrc from '../assets/icons/User Circle.png'
import { signOutUser, getStoredAuthUser, type AuthUser } from '../lib/auth'
import { Button } from './ui/button'
import { Input } from './ui/input'
import './Dashboard.css'

interface DashboardProps {
  onBack: () => void
}

export default function Dashboard({ onBack }: DashboardProps) {
  const user: AuthUser | null = getStoredAuthUser()

  const [activeMenu, setActiveMenu] = useState('settings')
  const [signingOut, setSigningOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const [form, setForm] = useState({
    username: user?.name || '',
    email: user?.email || '',
    paypalEmail: '',
    phone: '',
    about: '',
    showContact: false,
    homeAirport: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    currentPassword: '',
    newPassword: '',
    newPasswordAgain: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSave = () => {
    toast.success('Account settings saved')
  }

  const handleChangePassword = () => {
    if (form.newPassword !== form.newPasswordAgain) {
      toast.error('Passwords do not match')
      return
    }
    if (!form.currentPassword || !form.newPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    toast.success('Password changed successfully')
    setForm(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      newPasswordAgain: '',
    }))
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOutUser()
    setSigningOut(false)
    onBack()
    toast.success('Successfully signed out')
  }

  const handleMenuClick = (id: string) => {
    setActiveMenu(id)
    setSidebarOpen(false)
  }

  const menuItems = [
    { id: 'settings', label: 'Settings', icon: 'gear' },
    { id: 'bookings', label: 'Booking History', icon: 'clock' },
    { id: 'wishlist', label: 'Wishlist', icon: 'heart' },
    { id: 'inbox', label: 'Inbox Notification', icon: 'envelope' },
  ]

  const menuIcons: Record<string, ReactNode> = {
    gear: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    clock: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    heart: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    envelope: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
        <circle cx="18" cy="16" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  }

  const sinceDate = 'Jul 2026'

  const SidebarContent = (
    <div className="dashboard-sidebar-inner">
      <div className="dashboard-logo">
        <img src={logoSrc} alt="Expedition-GO" className="dashboard-logo-img" />
      </div>

      <div className="dashboard-user">
        <div className="dashboard-user-avatar">
          <img
            src={user?.photoURL || userSrc}
            alt="User"
            onError={(e) => { (e.target as HTMLImageElement).src = userSrc }}
          />
        </div>
        <div className="dashboard-user-info">
          <span className="dashboard-user-name">{user?.name || 'User'}</span>
          <span className="dashboard-user-since">Since: {sinceDate}</span>
        </div>
      </div>

      <nav className="dashboard-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`dashboard-nav-item${activeMenu === item.id ? ' active' : ''}`}
            onClick={() => handleMenuClick(item.id)}
            title={item.label}
          >
            <span className="dashboard-nav-icon">{menuIcons[item.icon]}</span>
            <span className="dashboard-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="dashboard-sidebar-bottom">
        <button className="dashboard-nav-item dashboard-back-home" onClick={onBack} title="Back to Homepage">
          <span className="dashboard-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span className="dashboard-nav-label">Back to Homepage</span>
        </button>

        <button
          className="dashboard-nav-item dashboard-signout"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Log Out"
        >
          <span className="dashboard-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span className="dashboard-nav-label">{signingOut ? 'Signing Out...' : 'Log Out'}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className={`dashboard-page${sidebarExpanded ? ' sidebar-expanded' : ''}`}>
      <aside className={`dashboard-sidebar dashboard-sidebar-desktop${sidebarExpanded ? ' expanded' : ''}`}>
        <button
          className="dashboard-collapse-btn"
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarExpanded ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
        {SidebarContent}
      </aside>

      {/* Mobile Top Bar */}
      <div className="dashboard-mobile-bar">
        <button
          className="dashboard-mobile-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="dashboard-mobile-title">Account Setting</span>
        <div className="dashboard-mobile-avatar">
          <img
            src={user?.photoURL || userSrc}
            alt="User"
            onError={(e) => { (e.target as HTMLImageElement).src = userSrc }}
          />
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="dashboard-sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="dashboard-sidebar dashboard-sidebar-mobile"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <h1 className="dashboard-title">Account Setting</h1>

          {/* Personal Information */}
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">PERSONAL INFORMATION</h2>
            <div className="dashboard-grid">
              <div className="dashboard-grid-left">
                <div className="dashboard-field">
                  <label className="dashboard-label">Username</label>
                  <Input name="username" value={form.username} onChange={handleChange} placeholder="Username" />
                </div>
                <div className="dashboard-field">
                  <label className="dashboard-label">E-mail</label>
                  <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="E-mail" />
                </div>
                <div className="dashboard-field">
                  <label className="dashboard-label">Paypal Email</label>
                  <Input name="paypalEmail" type="email" value={form.paypalEmail} onChange={handleChange} placeholder="Paypal Email" />
                </div>
                <div className="dashboard-field">
                  <label className="dashboard-label">Phone Number</label>
                  <Input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Phone Number" />
                </div>
              </div>
              <div className="dashboard-grid-right">
                <div className="dashboard-field">
                  <label className="dashboard-label">About Yourself</label>
                  <textarea
                    name="about"
                    className="dashboard-textarea"
                    value={form.about}
                    onChange={handleChange}
                    placeholder="Write something about yourself..."
                    rows={5}
                  />
                </div>
                <label className="dashboard-checkbox">
                  <input
                    type="checkbox"
                    name="showContact"
                    checked={form.showContact}
                    onChange={handleChange}
                  />
                  <span>Show email and phone number to other accounts</span>
                </label>
              </div>
            </div>

            <div className="dashboard-avatar-section">
              <div className="dashboard-avatar-preview">
                <img
                  src={user?.photoURL || userSrc}
                  alt="Avatar"
                  onError={(e) => { (e.target as HTMLImageElement).src = userSrc }}
                />
              </div>
              <div className="dashboard-avatar-info">
                <span className="dashboard-avatar-label">Change Avatar / JPG or PNG</span>
                <Button size="sm" className="dashboard-avatar-btn">Avatar</Button>
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">LOCATION</h2>
            <div className="dashboard-grid dashboard-grid-3col">
              <div className="dashboard-field">
                <label className="dashboard-label">Home Airport</label>
                <Input name="homeAirport" value={form.homeAirport} onChange={handleChange} placeholder="Home Airport" />
              </div>
              <div className="dashboard-field">
                <label className="dashboard-label">Address</label>
                <Input name="address" value={form.address} onChange={handleChange} placeholder="Address" />
              </div>
              <div className="dashboard-field">
                <label className="dashboard-label">City</label>
                <Input name="city" value={form.city} onChange={handleChange} placeholder="City" />
              </div>
              <div className="dashboard-field">
                <label className="dashboard-label">State/Province/Region</label>
                <Input name="state" value={form.state} onChange={handleChange} placeholder="State/Province/Region" />
              </div>
              <div className="dashboard-field">
                <label className="dashboard-label">ZIP code/Postal code</label>
                <Input name="zip" value={form.zip} onChange={handleChange} placeholder="ZIP code/Postal code" />
              </div>
              <div className="dashboard-field">
                <label className="dashboard-label">Country</label>
                <Input name="country" value={form.country} onChange={handleChange} placeholder="Country" />
              </div>
            </div>
            <div className="dashboard-section-action">
              <Button onClick={handleSave}>SAVE CHANGES</Button>
            </div>
          </section>

          {/* Change Password */}
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">CHANGE PASSWORD</h2>
            <div className="dashboard-grid dashboard-grid-3col">
              <div className="dashboard-field">
                <label className="dashboard-label">Current Password</label>
                <Input name="currentPassword" type="password" value={form.currentPassword} onChange={handleChange} placeholder="Current Password" />
              </div>
              <div className="dashboard-field">
                <label className="dashboard-label">New Password</label>
                <Input name="newPassword" type="password" value={form.newPassword} onChange={handleChange} placeholder="New Password" />
              </div>
              <div className="dashboard-field">
                <label className="dashboard-label">New Password Again</label>
                <Input name="newPasswordAgain" type="password" value={form.newPasswordAgain} onChange={handleChange} placeholder="New Password Again" />
              </div>
            </div>
            <div className="dashboard-section-action">
              <Button onClick={handleChangePassword}>CHANGE PASSWORD</Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
