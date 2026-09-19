import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MotionConfig, motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  CalendarX2,
  Clock,
  Compass,
  Handshake,
  Headset,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Tag,
} from 'lucide-react'
import Footer from '../components/Footer'
import SEO, { buildBreadcrumbSchema } from '../components/SEO'
import { HELP_CENTRE_STATE } from '../components/support/BackToHelpCentre'
import SupportSearch from '../components/support/SupportSearch'
import FaqAccordion from '../components/support/FaqAccordion'
import DeferredMap from '../components/support/DeferredMap'
import { fadeUp, revealViewport, stagger, staggerItem } from '../components/support/motion'
import { getFaqCategories, getPopularFaqs } from '../lib/faq'
import {
  OFFICE_DIRECTIONS_URL,
  OFFICE_MAP_EMBED,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DIGITS,
  WHATSAPP_URL,
} from '../lib/support'
import { scheduleSupportPrefetch } from '../lib/prefetchSupport'
import { useAuthUser } from '../hooks/useAuthUser'
import { setAuthReturnTo } from '../lib/auth'
import './SupportPages.css'
import './SupportHub.css'

const MotionLink = motion.create(Link)

export default function HelpCentrePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthUser()
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)

  const categories = getFaqCategories(t)
  const popularFaqs = useMemo(() => getPopularFaqs(t), [t])
  const quickChips = categories.slice(0, 3)

  // Warm the Contact + FAQ chunks so the cross-links open without a fallback.
  useEffect(() => {
    scheduleSupportPrefetch()
  }, [])

  const TOPICS = [
    { id: 'booking', Icon: BookOpen, title: t('faq.catBooking'), desc: t('supportHub.topicBookingDesc'), to: '/faq#cat-booking' },
    { id: 'cancellation', Icon: CalendarX2, title: t('faq.catCancellation'), desc: t('supportHub.topicCancellationDesc'), to: '/faq#cat-cancellation' },
    { id: 'pickup', Icon: MapPin, title: t('faq.catPickup'), desc: t('supportHub.topicPickupDesc'), to: '/faq#cat-pickup' },
    { id: 'offers', Icon: Tag, title: t('faq.catOffers'), desc: t('supportHub.topicOffersDesc'), to: '/faq#cat-offers' },
    { id: 'partner', Icon: Handshake, title: t('supportHub.partnerTitle'), desc: t('supportHub.topicPartnerDesc'), to: '/partnerships' },
    { id: 'about', Icon: Info, title: t('supportHub.topicAboutTitle'), desc: t('supportHub.topicAboutDesc'), to: '/about-us' },
  ]

  const TRUST_ITEMS = [
    { key: 'supportHub.trust1', Icon: Compass },
    { key: 'supportHub.trust2', Icon: ShieldCheck },
    { key: 'supportHub.trust3', Icon: MapPin },
    { key: 'supportHub.trust4', Icon: Headset },
  ]

  const openChat = () => {
    if (user) {
      navigate('/dashboard/chat')
      return
    }
    setAuthReturnTo('/dashboard/chat')
    navigate('/login')
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="support-page sh-hub">
        <SEO
          title="Ghana Tours Help Centre - Booking Support & FAQs"
          description="Get help with your Ghana tour booking. Find answers about payments, cancellations, pickup, refunds, and more. Contact our support team for assistance."
          keywords="Ghana tours help, booking support, customer service, tour booking help, cancellation help, payment help"
          jsonLd={buildBreadcrumbSchema([
            { name: 'Home', url: 'https://www.expeditiongotours.com/' },
            { name: 'Help Centre', url: 'https://www.expeditiongotours.com/help-centre' },
          ])}
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
            <motion.h1 className="sh-title" id="help-hero-title" variants={staggerItem}>
              {t('supportHub.helpTitle')}
            </motion.h1>
            <motion.p className="sh-sub" variants={staggerItem}>
              {t('support.helpCentreSubtitle')}
            </motion.p>
            <motion.div variants={staggerItem}>
              <SupportSearch linkState={HELP_CENTRE_STATE} />
            </motion.div>
            <motion.div className="sh-quick" variants={staggerItem}>
              {quickChips.map((category) => (
                <Link
                  key={category.id}
                  to={`/faq#cat-${category.id}`}
                  state={HELP_CENTRE_STATE}
                  className="sh-quick-chip"
                >
                  {category.heading}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </header>

        <div className="support-container sh-main">
          <motion.section
            className="sh-about"
            aria-labelledby="sh-about-title"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
          >
            <div>
              <h2 className="sh-about-title" id="sh-about-title">{t('supportHub.whatWeDoTitle')}</h2>
              <p className="sh-about-text">{t('supportHub.whatWeDoText')}</p>
            </div>
            <motion.ul
              className="sh-trust"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              {TRUST_ITEMS.map(({ key, Icon }) => (
                <motion.li key={key} className="sh-trust-item" variants={staggerItem}>
                  <span className="sh-trust-item-icon">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span>{t(key)}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.section>

          <motion.section
            className="sh-block"
            aria-labelledby="sh-topics-title"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
          >
            <div className="sh-block-head">
              <h2 className="sh-block-title" id="sh-topics-title">{t('supportHub.topicsTitle')}</h2>
            </div>
            <motion.div
              className="sh-topics"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
            >
              {TOPICS.map(({ id, Icon, title, desc, to }) => (
                <MotionLink
                  key={id}
                  to={to}
                  state={HELP_CENTRE_STATE}
                  className="sh-topic"
                  variants={staggerItem}
                >
                  <span className="sh-topic-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="sh-topic-title">{title}</h3>
                  <p className="sh-topic-desc">{desc}</p>
                  <span className="sh-topic-cta">
                    {t('supportHub.viewAnswers')}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </MotionLink>
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            className="sh-block"
            aria-labelledby="sh-popular-title"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
          >
            <div className="sh-block-head">
              <h2 className="sh-block-title" id="sh-popular-title">{t('supportHub.popularTitle')}</h2>
              <Link to="/faq" state={HELP_CENTRE_STATE} className="sh-block-link">
                {t('supportHub.seeAllFaqs')}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <FaqAccordion items={popularFaqs} openId={openFaqId} onToggle={setOpenFaqId} />
          </motion.section>

          <motion.section
            className="sh-block"
            aria-labelledby="sh-support-title"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
          >
            <div className="sh-block-head">
              <h2 className="sh-block-title" id="sh-support-title">{t('support.stillNeedHelp')}</h2>
            </div>
            <div className="sh-support-grid">
              <motion.div
                className="sh-hours-card"
                initial="hidden"
                whileInView="visible"
                viewport={revealViewport}
                variants={staggerItem}
              >
                <h3 className="sh-hours-heading">
                  <Clock size={17} aria-hidden="true" />
                  {t('support.supportHours')}
                </h3>
                <ul className="sh-hours">
                  {SUPPORT_HOURS.map((entry) => (
                    <li key={entry.labelKey}>
                      <span>{t(entry.labelKey)}</span>
                      <span className={entry.closed ? 'sh-hours-closed' : ''}>{t(entry.valueKey)}</span>
                    </li>
                  ))}
                </ul>
                <p className="sh-hours-note">{t('supportHub.hoursNote')}</p>
              </motion.div>

              <motion.div
                className="sh-channels"
                initial="hidden"
                whileInView="visible"
                viewport={revealViewport}
                variants={stagger}
              >
                <motion.a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="sh-channel sh-channel--email"
                  variants={staggerItem}
                >
                  <span className="sh-channel-head">
                    <span className="sh-channel-label">
                      <Mail size={14} aria-hidden="true" />
                      {t('contact.emailLabel')}
                    </span>
                  </span>
                  <span className="sh-channel-value">{SUPPORT_EMAIL}</span>
                  <span className="sh-channel-note">{t('contact.emailNote')}</span>
                </motion.a>

                <motion.a
                  href={`tel:${SUPPORT_PHONE_DIGITS}`}
                  className="sh-channel sh-channel--phone"
                  variants={staggerItem}
                >
                  <span className="sh-channel-head">
                    <span className="sh-channel-label">
                      <Phone size={14} aria-hidden="true" />
                      {t('contact.phoneLabel')}
                    </span>
                  </span>
                  <span className="sh-channel-value">{SUPPORT_PHONE}</span>
                  <span className="sh-channel-note">{t('contact.phoneNote')}</span>
                </motion.a>

                <motion.a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sh-channel sh-channel--whatsapp"
                  variants={staggerItem}
                >
                  <span className="sh-channel-head">
                    <span className="sh-channel-label">
                      <MessageCircle size={14} aria-hidden="true" />
                      {t('contact.whatsappLabel')}
                    </span>
                  </span>
                  <span className="sh-channel-value">{SUPPORT_PHONE}</span>
                  <span className="sh-channel-note">{t('contact.whatsappNote')}</span>
                </motion.a>

                <motion.button
                  type="button"
                  className="sh-channel sh-channel--chat"
                  onClick={openChat}
                  variants={staggerItem}
                >
                  <span className="sh-channel-head">
                    <span className="sh-channel-label">
                      <Headset size={14} aria-hidden="true" />
                      {t('support.chatWithUs')}
                    </span>
                    <span className="sh-channel-badge">{t('contact.fastest')}</span>
                  </span>
                  <span className="sh-channel-value">{t('contact.chatValue')}</span>
                  <span className="sh-channel-note">{t('contact.chatNote')}</span>
                </motion.button>
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            className="sh-block"
            aria-labelledby="sh-visit-title"
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
          >
            <h2 className="sh-block-title" id="sh-visit-title">{t('help.visitUs')}</h2>
            <div className="sh-map-card">
              <DeferredMap title={t('help.officeIframeTitle')} src={OFFICE_MAP_EMBED} />
              <div className="sh-map-info">
                <img src="/logo.png" alt="Expedition-Go Tours" className="sh-map-logo" />
                <span className="sh-map-label">
                  <MapPin size={14} aria-hidden="true" />
                  {t('help.officeLabel')}
                </span>
                <h3 className="sh-map-name">{t('help.companyName')}</h3>
                <p className="sh-map-address">
                  {t('help.addressLine1')}<br />
                  {t('help.addressLine2')}
                </p>
                <a
                  href={OFFICE_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sh-btn sh-btn--primary"
                >
                  <MapPin size={15} aria-hidden="true" />
                  {t('help.getDirections')}
                </a>
              </div>
            </div>
          </motion.section>
        </div>

        <Footer />
      </div>
    </MotionConfig>
  )
}
