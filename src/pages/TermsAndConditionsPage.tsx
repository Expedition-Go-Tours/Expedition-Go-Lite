import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import './SupportPages.css'

export default function TermsAndConditionsPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('footer.termsConditions')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <div className="support-hero">
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.termsConditions')}</h1>
          <p className="support-subtitle">{t('company.termsSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>1. Acceptance of terms</h2>
          <p>
            By accessing or using the Expedition-Go website, you agree to be bound by these Terms
            & Conditions. If you do not agree with any part of them, please do not use the
            platform.
          </p>

          <h2>2. Bookings and payments</h2>
          <p>
            All tours and experiences are booked through the Expedition-Go platform. A booking is
            confirmed once payment is successfully processed and a confirmation is issued. You are
            responsible for providing accurate traveller and contact details at checkout.
          </p>

          <h2>3. Prices and currency</h2>
          <p>
            Prices are displayed in the currency you select and may be converted at the applicable
            exchange rate. The total shown at checkout is the final amount you pay. Prices are set
            by suppliers and may change without notice; however, a confirmed booking is honoured
            at the price agreed at the time of confirmation.
          </p>

          <h2>4. Cancellation and refunds</h2>
          <p>
            Cancellation and refund eligibility depends on the policy attached to each tour, as
            shown on the tour page before booking. Please read our{' '}
            <Link to="/refund-policy">Refund Policy</Link> for full details.
          </p>

          <h2>5. Traveller responsibilities</h2>
          <p>
            You agree to arrive at the meeting point or pickup location on time, follow any safety
            instructions from your guide, and provide accurate information (including any medical
            or accessibility needs) at the time of booking.
          </p>

          <h2>6. Supplier services</h2>
          <p>
            Tours are operated by independent suppliers. Expedition-Go acts as the booking
            platform and does not operate the experiences itself. Suppliers are responsible for
            delivering the service described on the tour page.
          </p>

          <h2>7. Liability</h2>
          <p>
            To the maximum extent permitted by law, Expedition-Go is not liable for indirect,
            incidental or consequential damages arising from the use of the platform or the
            services of third-party suppliers. Nothing in these terms limits liability that cannot
            be limited by law.
          </p>

          <h2>8. Intellectual property</h2>
          <p>
            All content on the Expedition-Go platform, including text, images, logos and
            software, is the property of Expedition-Go or its licensors and may not be
            reproduced without permission.
          </p>

          <h2>9. Changes to these terms</h2>
          <p>
            We may update these Terms & Conditions from time to time. The latest version will
            always be available on this page, and continued use of the platform after changes are
            posted means you accept the updated terms.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about these terms can be sent to{' '}
            <a href="mailto:support@expedition-go.com">support@expedition-go.com</a>.
          </p>

          <p className="support-meta">{t('support.updatedDate')}: August 2026</p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
