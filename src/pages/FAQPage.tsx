import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Footer from '../components/Footer'
import LiquidSurface from '@/components/lightswind/liquid-surface'
import './SupportPages.css'

interface FaqEntry {
  q: string
  a: string
}

function FaqItem({ item, isOpen, onToggle }: { item: FaqEntry; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`faq-item${isOpen ? ' open' : ''}`}>
      <button type="button" className="faq-question" onClick={onToggle} aria-expanded={isOpen}>
        <span>{item.q}</span>
        <ChevronDown size={18} className="faq-chevron" />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="faq-answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p>{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  const { t } = useTranslation()
  const [openKey, setOpenKey] = useState<string | null>(null)

  const FAQ_CATEGORIES: { heading: string; items: FaqEntry[] }[] = [
    {
      heading: t('faq:catBooking'),
      items: [
        { q: t('faq:q1'), a: t('faq:a1') },
        { q: t('faq:q2'), a: t('faq:a2') },
        { q: t('faq:q3'), a: t('faq:a3') },
        { q: t('faq:q4'), a: t('faq:a4') },
      ],
    },
    {
      heading: t('faq:catCancellation'),
      items: [
        { q: t('faq:q5'), a: t('faq:a5') },
        { q: t('faq:q6'), a: t('faq:a6') },
        { q: t('faq:q7'), a: t('faq:a7') },
        { q: t('faq:q8'), a: t('faq:a8') },
      ],
    },
    {
      heading: t('faq:catPickup'),
      items: [
        { q: t('faq:q9'), a: t('faq:a9') },
        { q: t('faq:q10'), a: t('faq:a10') },
        { q: t('faq:q11'), a: t('faq:a11') },
      ],
    },
    {
      heading: t('faq:catOffers'),
      items: [
        { q: t('faq:q12'), a: t('faq:a12') },
        { q: t('faq:q13'), a: t('faq:a13') },
      ],
    },
    {
      heading: t('faq:catHelp'),
      items: [
        { q: t('faq:q14'), a: t('faq:a14') },
        { q: t('faq:q15'), a: t('faq:a15') },
      ],
    },
  ]

  useEffect(() => {
    document.title = `${t('faq:pageTitle')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page faq-page">
      <div className="support-hero faq-hero">
        <LiquidSurface
          scheme={1}
          speed={1.2}
          theme="light"
        />
        <div className="support-hero-content">
          <h1 className="support-title">{t('faq:pageTitle')}</h1>
          <p className="support-subtitle">{t('support.faqSubtitle')}</p>
        </div>
      </div>

      <div className="support-container faq-container">
        <div className="faq-sections">
          {FAQ_CATEGORIES.map((category, catIdx) => (
            <section key={category.heading}>
              <h2 className="faq-category-title">{category.heading}</h2>
              <div className="faq-list">
                {category.items.map((item, itemIdx) => {
                  const key = `${catIdx}-${itemIdx}`
                  const isOpen = openKey === key
                  return (
                    <FaqItem
                      key={key}
                      item={item}
                      isOpen={isOpen}
                      onToggle={() => setOpenKey(isOpen ? null : key)}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
