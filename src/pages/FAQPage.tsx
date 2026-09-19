import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MotionConfig, motion } from 'framer-motion'
import { LifeBuoy, Mail, MessageCircle } from 'lucide-react'
import Footer from '../components/Footer'
import SEO, { buildFAQSchema, buildBreadcrumbSchema } from '../components/SEO'
import BackToHelpCentre from '../components/support/BackToHelpCentre'
import SupportSearch from '../components/support/SupportSearch'
import FaqAccordion from '../components/support/FaqAccordion'
import { fadeIn, fadeUp, revealViewport, stagger, staggerItem } from '../components/support/motion'
import { getAllFaqs, getFaqCategories } from '../lib/faq'
import { SUPPORT_EMAIL, WHATSAPP_URL } from '../lib/support'
import { scheduleSupportPrefetch } from '../lib/prefetchSupport'
import './SupportPages.css'
import './SupportHub.css'

/** "#faq-booking-1" → "booking-1" (only for FAQ item anchors). */
function hashToFaqId(hash: string): string | null {
  const id = hash.replace(/^#/, '')
  return id.startsWith('faq-') ? id.slice(4) : null
}

export default function FAQPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const categories = useMemo(() => getFaqCategories(t), [t])
  const allFaqs = useMemo(() => getAllFaqs(t), [t])

  const [openId, setOpenId] = useState<string | null>(() => hashToFaqId(window.location.hash))
  const [lastHash, setLastHash] = useState(location.hash)
  if (location.hash !== lastHash) {
    setLastHash(location.hash)
    const target = hashToFaqId(location.hash)
    if (target) setOpenId(target)
  }

  // Warm the Help Centre + Contact chunks so the cross-links open instantly.
  useEffect(() => {
    scheduleSupportPrefetch()
  }, [])

  // Scroll to the linked item/category once the accordion has expanded.
  useEffect(() => {
    const rawId = location.hash.replace(/^#/, '')
    if (!rawId) return
    const timer = window.setTimeout(() => {
      document.getElementById(rawId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 90)
    return () => window.clearTimeout(timer)
  }, [location.hash, openId])

  return (
    <MotionConfig reducedMotion="user">
      <div className="support-page sh-hub">
        <SEO
          title="Ghana Tours FAQ - Booking, Cancellation & Travel Questions"
          description="Find answers to common questions about booking Ghana tours, cancellation policies, pickup details, payment methods, and more. Get help with your Ghana travel experience."
          keywords="Ghana tours FAQ, booking questions, cancellation policy, Ghana travel help, tour booking FAQ, Ghana experiences questions, Expedition-Go Tours FAQ"
          jsonLd={[
            buildFAQSchema(allFaqs.map((faq) => ({ question: faq.q, answer: faq.a }))),
            buildBreadcrumbSchema([
              { name: 'Home', url: 'https://www.expeditiongotours.com/' },
              { name: 'FAQ', url: 'https://www.expeditiongotours.com/faq' },
            ]),
          ]}
        />

        <header className="sh-hero">
          <motion.div
            className="sh-hero-inner"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.p className="sh-eyebrow" variants={staggerItem}>
              {t('supportHub.eyebrow')}
            </motion.p>
            <motion.h1 className="sh-title" id="faq-hero-title" variants={staggerItem}>
              {t('supportHub.faqTitle')}
            </motion.h1>
            <motion.p className="sh-sub" variants={staggerItem}>
              {t('support.faqSubtitle')}
            </motion.p>
            <motion.div variants={staggerItem}>
              <SupportSearch />
            </motion.div>
          </motion.div>
        </header>

        <motion.nav
          className="sh-faq-nav"
          aria-label={t('faq.categoriesAria')}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <div className="sh-faq-nav-inner">
            <BackToHelpCentre className="sh-faq-back" iconOnly />
            <div className="sh-faq-nav-rail">
              <div className="sh-faq-nav-pills">
                {categories.map((category) => (
                  <a key={category.id} href={`#cat-${category.id}`} className="sh-faq-pill">
                    {category.heading}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </motion.nav>

        <div className="support-container sh-main sh-main--faq">
          {categories.map((category) => (
            <motion.section
              key={category.id}
              id={`cat-${category.id}`}
              className="sh-block"
              style={{ scrollMarginTop: 184 }}
              aria-labelledby={`cat-${category.id}-title`}
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={fadeUp}
            >
              <h2 className="sh-block-title" id={`cat-${category.id}-title`}>{category.heading}</h2>
              <FaqAccordion items={category.items} openId={openId} onToggle={setOpenId} />
            </motion.section>
          ))}

          <motion.section
            className="sh-cta"
            aria-labelledby="sh-faq-cta-title"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
          >
            <div>
              <h2 className="sh-cta-title" id="sh-faq-cta-title">{t('support.stillNeedHelp')}</h2>
              <p className="sh-cta-text">{t('faq.needHelpText')}</p>
            </div>
            <div className="sh-cta-actions">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="sh-btn sh-btn--ghost">
                <Mail size={16} aria-hidden="true" />
                {t('support.emailUs')}
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="sh-btn sh-btn--ghost">
                <MessageCircle size={16} aria-hidden="true" />
                {t('contact.whatsappLabel')}
              </a>
              <a href="/contact-us" className="sh-btn sh-btn--primary">
                <LifeBuoy size={16} aria-hidden="true" />
                {t('footer.contactUs')}
              </a>
            </div>
          </motion.section>
        </div>

        <Footer />
      </div>
    </MotionConfig>
  )
}
