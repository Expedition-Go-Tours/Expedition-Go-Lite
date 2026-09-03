import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Footer from '../components/Footer'
import './SupportPages.css'

export default function RefundPolicyPage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('footer.refundPolicy')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <div className="support-hero">
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.refundPolicy')}</h1>
          <p className="support-subtitle">{t('support.refundPolicySubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>Summary</h2>
          <p>
            Every tour on Expedition-Go Tours has its own cancellation policy, which is shown on the
            tour page before you book. Most tours are free to cancel up to 24 hours before the
            start time for a full refund. Some experiences are non-refundable and will clearly
            state "Non-refundable" on the card and booking page.
          </p>

          <h2>Free cancellation (standard policy)</h2>
          <p>
            Tours under the standard policy can be cancelled free of charge up to 24 hours before
            the tour's start time. You will receive a full refund of the amount you paid. Cancellations
            made within 24 hours of the start time, or no-shows, are not eligible for a refund.
          </p>

          <h2>Non-refundable tours</h2>
          <p>
            Some experiences, typically those with limited capacity or fixed costs, are sold as
            "all sales final". These tours are non-refundable, and no refund is available once the
            booking is confirmed, regardless of when you cancel.
          </p>

          <h2>Cancellation by the operator</h2>
          <p>
            If a tour is cancelled by the operator or by Expedition-Go Tours (for example due to weather,
            safety, or operational reasons), you are always entitled to:
          </p>
          <ul>
            <li>a full refund of the amount you paid, or</li>
            <li>a free rebooking to another available date or a similar tour, whichever you prefer.</li>
          </ul>

          <h2>How refunds are paid</h2>
          <p>
            Approved refunds are returned to the original payment method you used at checkout.
            Depending on your bank or card provider, refunds typically appear within 3–10 business
            days after we process them.
          </p>

          <h2>Refunds on discounted bookings</h2>
          <p>
            When you book with a special offer or promo code, any refund is based on the discounted
            amount you actually paid, not the tour's full price.
          </p>

          <h2>How to request a refund</h2>
          <p>
            Contact our support team with your booking reference. If your booking is eligible for a
            refund, we'll process it as quickly as possible. Reach us by email at{' '}
            <a href="mailto:support@expedition-go.com">support@expedition-go.com</a> or through the
            live chat on this site.
          </p>

          <p className="support-meta">
            {t('support.updatedDate')}: August 2026 ·{' '}
            <Link to="/help-centre" style={{ color: '#179237', fontWeight: 600 }}>
              <ArrowLeft size={12} style={{ display: 'inline', verticalAlign: -1 }} />{' '}
              {t('support.backToHelp')}
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
