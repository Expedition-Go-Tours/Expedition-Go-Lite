import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './SupportPages.css'

export default function PrivacyPolicyPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('footer.privacyPolicy')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <Navbar />
      <div className="support-hero">
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.privacyPolicy')}</h1>
          <p className="support-subtitle">{t('company.privacySubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>Information we collect</h2>
          <p>We collect information you provide directly, including:</p>
          <ul>
            <li>Account details (name, email and profile information) when you sign in.</li>
            <li>Booking information, including traveller details, dates and tour selections.</li>
            <li>Payment information, which is processed by our payment providers, as we do not store full card details.</li>
            <li>Your preferences, such as currency and language.</li>
            <li>Optional location information, used to personalise recommendations and show nearby experiences.</li>
          </ul>

          <h2>Information stored on your device</h2>
          <p>
            To keep your experience smooth, we store some data in your browser, including your
            session and login details, wishlist items, recent searches, currency preference and
            booking drafts. This data stays on your device and can be cleared through your browser
            settings at any time.
          </p>

          <h2>How we use your information</h2>
          <ul>
            <li>To process and confirm your bookings.</li>
            <li>To provide customer support by email or live chat.</li>
            <li>To personalise tour recommendations based on your preferences and location.</li>
            <li>To improve our platform through aggregated analytics.</li>
            <li>To communicate with you about your bookings and, where you have consented, promotions.</li>
          </ul>

          <h2>Sharing your information</h2>
          <p>
            We share information only where it's needed to provide our service, for example, with
            the tour supplier to fulfil your booking, and with payment providers (such as card
            networks and digital wallets) to process payments. We do not sell your personal data.
          </p>

          <h2>Your rights</h2>
          <p>
            Depending on your location, you may have the right to access, correct or delete your
            personal information, and to opt out of marketing communications. You can exercise
            these rights by contacting us at{' '}
            <a href="mailto:support@expedition-go.com">support@expedition-go.com</a>.
          </p>

          <h2>Security</h2>
          <p>
            We use appropriate technical and organisational measures to protect your information,
            including encrypted connections and access controls. Payments are processed by
            certified providers, so your card details never touch our servers.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The latest version will always be
            available on this page. See our{' '}
            <Link to="/cookies-policy">Cookies Policy</Link> for details on how we use cookies.
          </p>

          <p className="support-meta">{t('support.updatedDate')}: August 2026</p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
