import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { useAuthUser } from '../hooks/useAuthUser'
import { setAuthReturnTo } from '../lib/auth'
import './SupportPages.css'
import './SupportHub.css'

export default function HelpCentrePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthUser()
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)

  const categories = getFaqCategories(t)
  const popularFaqs = useMemo(() => getPopularFaqs(t), [t])
  const quickChips = categories.slice(0, 3)

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
        <div className="sh-hero-inner">
          <p className="sh-eyebrow">{t('supportHub.eyebrow')}</p>
          <h1 className="sh-title" id="help-hero-title">{t('supportHub.helpTitle')}</h1>
          <p className="sh-sub">{t('support.helpCentreSubtitle')}</p>
          <SupportSearch linkState={HELP_CENTRE_STATE} />
          <div className="sh-quick">
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
          </div>
        </div>
      </header>

      <div className="support-container sh-main">
        <section className="sh-about" aria-labelledby="sh-about-title">
          <div>
            <h2 className="sh-about-title" id="sh-about-title">{t('supportHub.whatWeDoTitle')}</h2>
            <p className="sh-about-text">{t('supportHub.whatWeDoText')}</p>
          </div>
          <ul className="sh-trust">
            {TRUST_ITEMS.map(({ key, Icon }) => (
              <li key={key} className="sh-trust-item">
                <span className="sh-trust-item-icon">
                  <Icon size={15} aria-hidden="true" />
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sh-block" aria-labelledby="sh-topics-title">
          <div className="sh-block-head">
            <h2 className="sh-block-title" id="sh-topics-title">{t('supportHub.topicsTitle')}</h2>
          </div>
          <div className="sh-topics">
            {TOPICS.map(({ id, Icon, title, desc, to }) => (
              <Link key={id} to={to} state={HELP_CENTRE_STATE} className="sh-topic">
                <span className="sh-topic-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="sh-topic-title">{title}</h3>
                <p className="sh-topic-desc">{desc}</p>
                <span className="sh-topic-cta">
                  {t('supportHub.viewAnswers')}
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="sh-block" aria-labelledby="sh-popular-title">
          <div className="sh-block-head">
            <h2 className="sh-block-title" id="sh-popular-title">{t('supportHub.popularTitle')}</h2>
            <Link to="/faq" state={HELP_CENTRE_STATE} className="sh-block-link">
              {t('supportHub.seeAllFaqs')}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <FaqAccordion items={popularFaqs} openId={openFaqId} onToggle={setOpenFaqId} />
        </section>

        <section className="sh-block" aria-labelledby="sh-support-title">
          <div className="sh-block-head">
            <h2 className="sh-block-title" id="sh-support-title">{t('support.stillNeedHelp')}</h2>
          </div>
          <div className="sh-support-grid">
            <div className="sh-hours-card">
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
            </div>

            <div className="sh-channels">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="sh-channel sh-channel--email">
                <span className="sh-channel-head">
                  <span className="sh-channel-label">
                    <Mail size={14} aria-hidden="true" />
                    {t('contact.emailLabel')}
                  </span>
                </span>
                <span className="sh-channel-value">{SUPPORT_EMAIL}</span>
                <span className="sh-channel-note">{t('contact.emailNote')}</span>
              </a>

              <a href={`tel:${SUPPORT_PHONE_DIGITS}`} className="sh-channel sh-channel--phone">
                <span className="sh-channel-head">
                  <span className="sh-channel-label">
                    <Phone size={14} aria-hidden="true" />
                    {t('contact.phoneLabel')}
                  </span>
                </span>
                <span className="sh-channel-value">{SUPPORT_PHONE}</span>
                <span className="sh-channel-note">{t('contact.phoneNote')}</span>
              </a>

              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="sh-channel sh-channel--whatsapp">
                <span className="sh-channel-head">
                  <span className="sh-channel-label">
                    <MessageCircle size={14} aria-hidden="true" />
                    {t('contact.whatsappLabel')}
                  </span>
                </span>
                <span className="sh-channel-value">{SUPPORT_PHONE}</span>
                <span className="sh-channel-note">{t('contact.whatsappNote')}</span>
              </a>

              <button type="button" className="sh-channel sh-channel--chat" onClick={openChat}>
                <span className="sh-channel-head">
                  <span className="sh-channel-label">
                    <Headset size={14} aria-hidden="true" />
                    {t('support.chatWithUs')}
                  </span>
                  <span className="sh-channel-badge">{t('contact.fastest')}</span>
                </span>
                <span className="sh-channel-value">{t('contact.chatValue')}</span>
                <span className="sh-channel-note">{t('contact.chatNote')}</span>
              </button>
            </div>
          </div>
        </section>

        <section className="sh-block" aria-labelledby="sh-visit-title">
          <h2 className="sh-block-title" id="sh-visit-title">{t('help.visitUs')}</h2>
          <div className="sh-map-card">
            <div className="sh-map">
              <iframe
                title={t('help.officeIframeTitle')}
                src={OFFICE_MAP_EMBED}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
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
        </section>
      </div>

      <Footer />
    </div>
  )
}
