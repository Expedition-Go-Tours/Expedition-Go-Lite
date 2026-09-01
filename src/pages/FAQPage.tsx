import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LiquidSurface from '@/components/lightswind/liquid-surface'
import './SupportPages.css'

interface FaqEntry {
  q: string
  a: string
}

const FAQ_CATEGORIES: { heading: string; items: FaqEntry[] }[] = [
  {
    heading: 'Booking & Payment',
    items: [
      {
        q: 'How do I book a tour?',
        a: 'Browse our tours, open the one you like, pick your date and number of travelers, then follow the checkout steps. You\'ll get instant confirmation once your payment is successful.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept Visa, Mastercard, American Express, Google Pay, Apple Pay and PayPal. All payments are processed securely online.',
      },
      {
        q: 'Are prices per person or per group?',
        a: 'Prices are per person unless the tour page states otherwise. Children and infants often pay a reduced rate, and the exact total is always shown before you confirm your booking.',
      },
      {
        q: 'Is my booking confirmed immediately?',
        a: 'Yes. As soon as your payment is successful you receive an on-screen confirmation and a confirmation email with your booking details.',
      },
    ],
  },
  {
    heading: 'Cancellation & Refunds',
    items: [
      {
        q: 'Can I cancel my booking?',
        a: 'It depends on the tour\'s policy. Most tours offer free cancellation up to 24 hours before the start time for a full refund. Non-refundable tours are marked clearly and cannot be cancelled for a refund.',
      },
      {
        q: 'What happens if the operator cancels my tour?',
        a: 'If a tour is cancelled by the operator or by us, you can choose a full refund or a free rebooking to another date or similar tour.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds are returned to your original payment method and usually appear within 3–10 business days, depending on your bank or card provider.',
      },
      {
        q: 'Are discounts refunded too?',
        a: 'Yes, refunds are based on the discounted amount you actually paid, never the tour\'s full price.',
      },
    ],
  },
  {
    heading: 'Pickup & Meeting Points',
    items: [
      {
        q: 'Does my tour include pickup?',
        a: 'Many tours include hotel or area pickup, and those cards show a "Pickup included" badge. Other tours start at a fixed meeting point, which is shown on the tour page.',
      },
      {
        q: 'When will I receive my pickup details?',
        a: 'Pickup times and locations are shared with your booking confirmation, and final pickup details are usually communicated the day before your tour.',
      },
      {
        q: 'What if I miss my pickup?',
        a: 'Please contact our support team as soon as possible. Missing your pickup may be treated as a no-show, which is not eligible for a refund under most policies.',
      },
    ],
  },
  {
    heading: 'Offers & Special Deals',
    items: [
      {
        q: 'How do promo codes work?',
        a: 'Enter your promo code at checkout to apply the discount. Some offers auto-apply without a code, and when several offers apply, the best one is chosen for you automatically.',
      },
      {
        q: 'Why did the price change after I viewed a tour?',
        a: 'Prices are set by suppliers and can change with availability, group size, or season. The price shown at checkout is always the final price you pay.',
      },
    ],
  },
  {
    heading: 'Getting Help',
    items: [
      {
        q: 'How do I contact support?',
        a: 'Email us at support@expedition-go.com or open the live chat from the "Chat with us" button on the Help Centre or Contact Us pages.',
      },
      {
        q: 'What are your support hours?',
        a: 'Our support team is available Monday to Friday 8:00 AM – 6:00 PM and Saturday 9:00 AM – 2:00 PM. We\'re closed on Sundays and public holidays.',
      },
    ],
  },
]

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

  useEffect(() => {
    document.title = `${t('footer.faq')} | Expedition-Go Tours`
  }, [t])

  return (
    <div className="support-page faq-page">
      <Navbar />
      <div className="support-hero faq-hero">
        <LiquidSurface
          scheme={1}
          speed={1.2}
          theme="light"
        />
        <div className="support-hero-content">
          <h1 className="support-title">{t('footer.faq')}</h1>
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
