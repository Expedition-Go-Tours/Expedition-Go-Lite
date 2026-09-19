import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MotionConfig, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Clock, ClipboardCopy, Headset, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import Footer from '../components/Footer'
import SEO, { buildBreadcrumbSchema } from '../components/SEO'
import DeferredMap from '../components/support/DeferredMap'
import { fadeUp, revealViewport, stagger, staggerItem } from '../components/support/motion'
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

interface ContactFormState {
  name: string
  email: string
  topic: string
  bookingRef: string
  message: string
}

const EMPTY_FORM: ContactFormState = {
  name: '',
  email: '',
  topic: 'booking',
  bookingRef: '',
  message: '',
}

export default function ContactUsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthUser()
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({})

  // Warm the Help Centre + FAQ chunks so the cross-links open without a fallback.
  useEffect(() => {
    scheduleSupportPrefetch()
  }, [])

  const TOPIC_OPTIONS = [
    { value: 'booking', label: t('contact.form.topicBooking') },
    { value: 'cancellation', label: t('contact.form.topicCancellation') },
    { value: 'pickup', label: t('contact.form.topicPickup') },
    { value: 'partner', label: t('contact.form.topicPartner') },
    { value: 'other', label: t('contact.form.topicOther') },
  ]

  const update = (field: keyof ContactFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  const openChat = () => {
    if (user) {
      navigate('/dashboard/chat')
      return
    }
    setAuthReturnTo('/dashboard/chat')
    navigate('/login')
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL)
      toast.success(t('contact.form.copied'))
    } catch {
      window.location.href = `mailto:${SUPPORT_EMAIL}`
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Partial<Record<keyof ContactFormState, string>> = {}
    if (!form.name.trim()) nextErrors.name = t('contact.form.errName')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = t('contact.form.errEmail')
    if (!form.message.trim()) nextErrors.message = t('contact.form.errMessage')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const topicLabel = TOPIC_OPTIONS.find((option) => option.value === form.topic)?.label ?? form.topic
    const bookingRef = form.bookingRef.trim()
    const subject = `[${topicLabel}]${bookingRef ? ` ${bookingRef}` : ''} — Expedition-Go Tours support`
    const body = [
      `${t('contact.form.name')}: ${form.name.trim()}`,
      `${t('contact.form.email')}: ${form.email.trim()}`,
      `${t('contact.form.topic')}: ${topicLabel}`,
      bookingRef ? `${t('contact.form.bookingRef')}: ${bookingRef}` : '',
      '',
      form.message.trim(),
    ]
      .filter((line) => line !== '')
      .join('\n')

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    toast.success(t('contact.form.mailtoOpened'))
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="support-page sh-hub">
        <SEO
          title="Contact Expedition-Go Tours - Ghana Tours Support"
          description="Get in touch with Expedition-Go Tours. Contact us for booking inquiries, partnerships, supplier registration, and customer support. We're here to help with your Ghana travel experience."
          keywords="contact Expedition-Go Tours, Ghana tours support, booking help, customer service, partnership inquiries"
          jsonLd={buildBreadcrumbSchema([
            { name: 'Home', url: 'https://www.expeditiongotours.com/' },
            { name: 'Contact Us', url: 'https://www.expeditiongotours.com/contact-us' },
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
            <motion.h1 className="sh-title" id="contact-hero-title" variants={staggerItem}>
              {t('supportHub.contactTitle')}
            </motion.h1>
            <motion.p className="sh-sub" variants={staggerItem}>
              {t('support.contactUsSubtitle')}
            </motion.p>
            <motion.div className="sh-quick" variants={staggerItem}>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="sh-quick-chip">
                <Mail size={14} aria-hidden="true" />
                {t('support.emailUs')}
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="sh-quick-chip">
                <MessageCircle size={14} aria-hidden="true" />
                {t('contact.whatsappLabel')}
              </a>
              <Link to="/faq" className="sh-quick-chip">
                {t('footer.faq')}
              </Link>
            </motion.div>
          </motion.div>
        </header>

      <div className="support-container sh-main">
        <motion.section
          className="sh-block"
          aria-label={t('supportHub.channelsTitle')}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={fadeUp}
        >
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
        </motion.section>

        <motion.section
          className="sh-block"
          aria-labelledby="sh-form-title"
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={fadeUp}
        >
          <div className="sh-form-card">
            <div className="sh-form-intro">
              <h2 className="sh-form-title" id="sh-form-title">{t('contact.form.title')}</h2>
              <p className="sh-form-sub">{t('contact.form.subtitle')}</p>
              <div className="sh-form-aside">
                <button type="button" className="sh-copy-btn" onClick={copyEmail}>
                  <ClipboardCopy size={15} aria-hidden="true" />
                  {t('contact.form.copyEmail')}
                </button>
                <p className="sh-form-note">
                  {t('contact.form.preferEmail', { email: SUPPORT_EMAIL })} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                </p>
              </div>
            </div>

            <form className="sh-form" onSubmit={handleSubmit} noValidate>
              <div className="sh-field">
                <label className="sh-label" htmlFor="contact-name">{t('contact.form.name')}</label>
                <input
                  id="contact-name"
                  className="sh-input"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  onChange={(event) => update('name', event.target.value)}
                />
                {errors.name && <span className="sh-error" id="contact-name-error">{errors.name}</span>}
              </div>

              <div className="sh-field">
                <label className="sh-label" htmlFor="contact-email">{t('contact.form.email')}</label>
                <input
                  id="contact-email"
                  className="sh-input"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  onChange={(event) => update('email', event.target.value)}
                />
                {errors.email && <span className="sh-error" id="contact-email-error">{errors.email}</span>}
              </div>

              <div className="sh-field">
                <label className="sh-label" htmlFor="contact-topic">{t('contact.form.topic')}</label>
                <select
                  id="contact-topic"
                  className="sh-select"
                  value={form.topic}
                  onChange={(event) => update('topic', event.target.value)}
                >
                  {TOPIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="sh-field">
                <label className="sh-label" htmlFor="contact-booking-ref">{t('contact.form.bookingRef')}</label>
                <input
                  id="contact-booking-ref"
                  className="sh-input"
                  type="text"
                  placeholder={t('contact.form.bookingRefPlaceholder')}
                  value={form.bookingRef}
                  onChange={(event) => update('bookingRef', event.target.value)}
                />
              </div>

              <div className="sh-field sh-field--full">
                <label className="sh-label" htmlFor="contact-message">{t('contact.form.message')}</label>
                <textarea
                  id="contact-message"
                  className="sh-textarea"
                  placeholder={t('contact.form.messagePlaceholder')}
                  value={form.message}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  onChange={(event) => update('message', event.target.value)}
                />
                {errors.message && <span className="sh-error" id="contact-message-error">{errors.message}</span>}
              </div>

              <div className="sh-form-foot">
                <button type="submit" className="sh-btn sh-btn--primary">{t('contact.form.submit')}</button>
                <p className="sh-form-note">{t('contact.form.note')}</p>
              </div>
            </form>
          </div>
        </motion.section>

        <motion.section
          className="sh-block"
          aria-labelledby="sh-contact-details-title"
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={fadeUp}
        >
          <h2 className="sh-block-title" id="sh-contact-details-title">{t('support.supportHours')}</h2>
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
              className="sh-map-card"
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={staggerItem}
            >
              <DeferredMap title={t('contact.officeIframeTitle')} src={OFFICE_MAP_EMBED} />
              <div className="sh-map-info">
                <img src="/logo.png" alt="Expedition-Go Tours" className="sh-map-logo" />
                <span className="sh-map-label">
                  <MapPin size={14} aria-hidden="true" />
                  {t('contact.officeLabel')}
                </span>
                <h3 className="sh-map-name">{t('contact.companyName')}</h3>
                <p className="sh-map-address">
                  {t('contact.addressLine1')}<br />
                  {t('contact.addressLine2')}
                </p>
                <a
                  href={OFFICE_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sh-btn sh-btn--ghost"
                >
                  <MapPin size={15} aria-hidden="true" />
                  {t('contact.getDirections')}
                </a>
              </div>
            </motion.div>
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
    </MotionConfig>
  )
}
