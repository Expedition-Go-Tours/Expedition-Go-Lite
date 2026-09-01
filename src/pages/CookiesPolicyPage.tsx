import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './SupportPages.css'

export default function CookiesPolicyPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('footer.cookiesPolicy')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <Navbar />
      <div className="support-hero">
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.cookiesPolicy')}</h1>
          <p className="support-subtitle">{t('company.cookiesSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>What are cookies?</h2>
          <p>
            Cookies are small text files stored in your browser when you visit a website. They
            help the site remember your preferences and understand how it's being used.
          </p>

          <h2>How we use cookies</h2>
          <ul>
            <li>
              <strong>Essential cookies</strong>, required for the platform to work, including
              keeping you signed in, remembering your wishlist and securing your session.
            </li>
            <li>
              <strong>Preference cookies</strong>, which remember choices such as your language,
              currency and recent searches.
            </li>
            <li>
              <strong>Analytics cookies</strong>, which help us understand how visitors use the site so
              we can improve it. These collect aggregated, non-identifying information.
            </li>
          </ul>

          <h2>Third-party cookies</h2>
          <p>
            Some features are provided by trusted third parties that may set their own cookies,
            for example, payment providers, map services and analytics tools. These providers
            handle data under their own policies.
          </p>

          <h2>Managing cookies</h2>
          <p>
            You can control or delete cookies through your browser settings at any time. Blocking
            essential cookies may affect how the platform works, for example, you may be signed
            out or lose saved preferences.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this Cookies Policy from time to time, and the latest version will always
            be available on this page. For more on how we handle your data, see our{' '}
            <Link to="/privacy-policy">Privacy Policy</Link>.
          </p>

          <p className="support-meta">{t('support.updatedDate')}: August 2026</p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
