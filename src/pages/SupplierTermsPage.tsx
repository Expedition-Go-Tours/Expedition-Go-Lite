import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Rocket, ArrowRight } from 'lucide-react'
import Footer from '../components/Footer'
import './SupportPages.css'

export default function SupplierTermsPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('footer.supplierTerms')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <div className="support-hero">
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.supplierTerms')}</h1>
          <p className="support-subtitle">{t('supplier.termsSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>1. Introduction</h2>
          <p>
            These Supplier Terms apply to tour operators, activity providers and independent
            guides who list and sell tours on the Expedition-Go marketplace. By registering as a
            supplier, you agree to these terms alongside our general{' '}
            <Link to="/terms-and-conditions">Terms & Conditions</Link>.
          </p>

          <h2>2. Registration and approval</h2>
          <p>
            Every supplier application is reviewed before going live. We check each listing for
            quality, safety and compliance before it is published, and we may request additional
            business documentation at any time. Applications can be pending, approved, rejected or
            suspended, and we will let you know the status of your application.
          </p>
          <p>
            Certain activities are not permitted on the platform. You are responsible for making
            sure your experiences comply with our platform guidelines and all applicable laws.
          </p>

          <h2>3. Listing obligations</h2>
          <p>
            You are responsible for keeping your listings accurate and up to date — including
            descriptions, photos, availability, pricing, pickup and meeting details, and
            cancellation policies. You keep full control of your availability and prices and can
            modify them at any time from your supplier dashboard.
          </p>

          <h2>4. Commission</h2>
          <p>
            There is no cost to add or maintain an activity on the platform. For every successful
            booking, Expedition-Go charges a flat <strong>15% commission</strong> — you keep the
            remaining <strong>85%</strong> of each booking. The commission covers platform
            management, tools, insights and promoting your activities across our marketing
            channels.
          </p>

          <h2>5. Payouts</h2>
          <p>
            Client payments are consolidated by Expedition-Go and paid out to you on a monthly or
            bi-monthly schedule, depending on your preference. Each pay run includes all fulfilled
            bookings minus the commission fee.
          </p>
          <p>
            To receive payouts on time you must provide key business information, including your
            company registration number, tax identification number and bank details. Missing or
            incorrect information may delay your payments.
          </p>

          <h2>6. Bookings and cancellations</h2>
          <p>
            You are responsible for delivering the experience exactly as described on your
            listing, including honouring the cancellation policy shown to travellers at booking —
            such as free cancellation up to 24 hours before the start time, or non-refundable
            policies where selected.
          </p>

          <h2>7. Conduct and quality standards</h2>
          <p>
            You agree to operate your experiences safely, professionally and in compliance with
            all applicable laws and regulations. Expedition-Go is registered with the Ghana
            Tourism Authority (GTA), and we expect our partners to uphold the same standards of
            safety, professionalism and quality.
          </p>

          <h2>8. Suspension and termination</h2>
          <p>
            We may suspend or terminate your account or a listing if you breach these terms, act
            fraudulently, or repeatedly fail to meet quality or safety standards. You are never
            locked in: you may deactivate an activity or your account at any time from your
            dashboard.
          </p>

          <h2>9. Liability and intellectual property</h2>
          <p>
            You retain the rights to the content you provide, and you grant Expedition-Go a
            licence to display and promote your listings on the platform and partner channels.
            Expedition-Go's platform content and branding remain our property. To the maximum
            extent permitted by law, Expedition-Go is not liable for indirect or consequential
            losses arising from the sale or delivery of your experiences.
          </p>

          <h2>10. Changes and contact</h2>
          <p>
            We may update these Supplier Terms from time to time. The latest version will always
            be available on this page. Questions about these terms can be sent to{' '}
            <a href="mailto:support@expedition-go.com">support@expedition-go.com</a>.
          </p>

          <p className="support-meta">{t('support.updatedDate')}: August 2026</p>
        </div>

        <h2 className="support-section-title">Ready to start selling?</h2>
        <div className="support-actions">
          <Link to="/supplier/list-experience" className="support-btn support-btn-primary">
            <Rocket size={16} />
            List your tours
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
