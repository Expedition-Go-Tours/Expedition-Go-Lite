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
