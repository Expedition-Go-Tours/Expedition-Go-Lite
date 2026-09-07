import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Map, Headset, Megaphone, Mail, ArrowRight } from 'lucide-react'
import Footer from '../components/Footer'
import './SupportPages.css'

const CAREERS_EMAIL = 'careers@expedition-go.com'

export default function CareersPage() {
  const { t } = useTranslation()

  const DEPARTMENTS = [
    {
      Icon: Route,
      title: t('careers.dept1Title'),
      text: t('careers.dept1Text'),
    },
    {
      Icon: Map,
      title: t('careers.dept2Title'),
      text: t('careers.dept2Text'),
    },
    {
      Icon: Headset,
      title: t('careers.dept3Title'),
      text: t('careers.dept3Text'),
    },
    {
      Icon: Megaphone,
      title: t('careers.dept4Title'),
      text: t('careers.dept4Text'),
    },
  ]

  useEffect(() => {
    document.title = `${t('footer.careers')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page">
      <div className="support-hero">
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.careers')}</h1>
          <p className="support-subtitle">{t('company.careersSubtitle')}</p>
        </div>
      </div>

      <div className="support-container">
        <div className="support-article">
          <h2>{t('careers.whyTitle')}</h2>
          <p>{t('careers.whyText1')}</p>
          <p>{t('careers.whyText2')}</p>
        </div>

        <h2 className="support-section-title">{t('careers.departmentsTitle')}</h2>
        <div className="support-card-grid">
          {DEPARTMENTS.map((dept) => (
            <div key={dept.title} className="support-card">
              <div className="support-card-icon">
                <dept.Icon size={22} />
              </div>
              <h3 className="support-card-title">{dept.title}</h3>
              <p className="support-card-text">{dept.text}</p>
            </div>
          ))}
        </div>

        <h2 className="support-section-title">{t('careers.applyTitle')}</h2>
        <div className="support-actions">
          <a href={`mailto:${CAREERS_EMAIL}`} className="support-btn support-btn-primary">
            <Mail size={16} />
            {t('careers.applyBtn')}
          </a>
          <a href="/about-us" className="support-btn support-btn-secondary">
            {t('careers.learnBtn')}
            <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <Footer />
    </div>
  )
}
