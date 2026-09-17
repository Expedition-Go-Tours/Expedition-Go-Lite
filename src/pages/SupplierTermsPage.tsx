import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Rocket, ArrowRight } from 'lucide-react'
import Footer from '../components/Footer'
import SEO, { buildBreadcrumbSchema } from '../components/SEO'
import './SupportPages.css'

export default function SupplierTermsPage() {
  const { t } = useTranslation()

  return (
    <div className="support-page">
      <SEO
        title="Supplier Terms & Conditions - Expedition-Go Tours Ghana"
        description="Read the terms and conditions for suppliers and tour operators partnering with Expedition-Go Tours. Understand payment terms, cancellation policies, and partnership requirements."
        keywords="Expedition-Go Tours supplier terms, tour operator terms Ghana, supplier agreement, partnership terms"
        jsonLd={buildBreadcrumbSchema([
          { name: 'Home', url: 'https://expeditiongotours.com/' },
          { name: 'Supplier Terms', url: 'https://expeditiongotours.com/supplier-terms' },
        ])}
      />
      <div className="support-hero">
        <div className="support-hero-content">
          <h1 className="support-title">{t('supplierTerms.pageTitle')}</h1>
          <p className="support-subtitle">{t('supplier.termsSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>{t('supplierTerms.s1Title')}</h2>
          <p>
            {t('supplierTerms.s1Text')}
          </p>

          <h2>{t('supplierTerms.s2Title')}</h2>
          <p>
            {t('supplierTerms.s2Text1')}
          </p>
          <p>
            {t('supplierTerms.s2Text2')}
          </p>

          <h2>{t('supplierTerms.s3Title')}</h2>
          <p>
            {t('supplierTerms.s3Text')}
          </p>

          <h2>{t('supplierTerms.s4Title')}</h2>
          <p>
            {t('supplierTerms.s4Text')}
          </p>

          <h2>{t('supplierTerms.s5Title')}</h2>
          <p>
            {t('supplierTerms.s5Text1')}
          </p>
          <p>
            {t('supplierTerms.s5Text2')}
          </p>

          <h2>{t('supplierTerms.s6Title')}</h2>
          <p>
            {t('supplierTerms.s6Text')}
          </p>

          <h2>{t('supplierTerms.s7Title')}</h2>
          <p>
            {t('supplierTerms.s7Text')}
          </p>

          <h2>{t('supplierTerms.s8Title')}</h2>
          <p>
            {t('supplierTerms.s8Text')}
          </p>

          <h2>{t('supplierTerms.s9Title')}</h2>
          <p>
            {t('supplierTerms.s9Text')}
          </p>

          <h2>{t('supplierTerms.s10Title')}</h2>
          <p>
            {t('supplierTerms.s10Text')}
          </p>

          <p className="support-meta">{t('support.updatedDate')}: August 2026</p>
        </div>

        <h2 className="support-section-title">{t('supplierTerms.readyTitle')}</h2>
        <div className="support-actions">
          <Link to="/supplier/list-experience" className="support-btn support-btn-primary">
            <Rocket size={16} />
            {t('supplierTerms.listBtn')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
