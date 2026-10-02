/**
 * Public supplier marketing page — "List on TravioGhana" (/supplier/list-experience).
 *
 * A faithful port of the reviewed prototype (Travio_Ghana_Initiative_and_
 * Supplier_Partnership.html): hero, proof bar, in-page jump nav, origin strip,
 * story, mission/vision, goals, supplier benefits, commercial terms with a
 * live commission calculator, onboarding steps, the platform-category tabs,
 * the experience marquee, trust & verification with independent profile
 * proof, the Foundation impact band, the supplier FAQ and the closing CTA.
 *
 * Three things are deliberately NOT ported from the prototype:
 *   1. its <header>/<nav> and <footer> — this route keeps the app's own
 *      Navbar and Footer (see `body:has(.le-page)` in Navbar.css/Footer.css);
 *   2. its 9 base64 @font-face blocks — DM Sans and Manrope are already
 *      self-hosted in public/fonts;
 *   3. absolute `<html>` state — `.js-motion` rides on `.le-page` so the
 *      reveal animation cannot leak onto other routes.
 *
 * The application form lives on /supplier/register; every "Become a supplier"
 * CTA routes there. Approved suppliers landing here are redirected to their
 * portal, exactly as before.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import Footer from '@/components/Footer'
import SEO, { SITE_URL, buildBreadcrumbSchema, buildFAQSchema } from '@/components/SEO'
import BundledImage from '@/components/shared/BundledImage'
import { useSupplierStatus } from '@/hooks/useSupplierStatus'
import { getSupplierPortalUrl, isApprovedSupplier } from '@/lib/supplier'

import phoneLogin from '@/assets/phone-screens/login.png'
import phoneDashboard from '@/assets/phone-screens/dashboard.png'
import phoneProducts from '@/assets/phone-screens/products.png'
import travioLogo from '@/assets/travioghana-logo.svg'
import tripadvisorOwl from '@/assets/tripadvisor-owl.png'
import getYourGuideLogo from '@/assets/icons/getyourguide.png'
import imgCapeCoast from '@/assets/supplier/cape-coast-heritage.avif'
import imgCoastal from '@/assets/supplier/historic-coastal-tours.avif'
import imgElmina from '@/assets/supplier/elmina-experiences.avif'
import imgAccra from '@/assets/supplier/accra-city.avif'
import imgWaterfalls from '@/assets/supplier/waterfalls-nature.avif'
import imgWaterBoat from '@/assets/supplier/water-boat.avif'

import '@/styles/partner-pages.css'
import '@/styles/ListExperience.css'

const REGISTER_PATH = '/supplier/register'
const SUPPLIER_PORTAL = 'https://supplier.travioghana.com/'
const SUPPLIER_TERMS = 'https://www.travioghana.com/supplier-terms'
const COMPANY_SITE = 'https://www.expeditiongotours.com/'
const TRIPADVISOR_PROFILE =
  'https://www.tripadvisor.com/Attraction_Review-g293797-d24155300-Reviews-Expedition_Go_Tours_Ltd-Accra_Greater_Accra.html'
const GETYOURGUIDE_PROFILE = 'https://www.getyourguide.com/expedition-go-tours-s484318/'

/** The prototype's external-link glyph, used by every outbound link. */
function ExternalIcon() {
  return (
    <svg className="external-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5M10 14 19 5M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

const PROOF = [
  { strong: '0', span: 'upfront listing fees' },
  { strong: '85%', span: 'of each successful booking retained' },
  { strong: '15%', span: 'flat platform commission' },
  { strong: 'Local', span: 'supplier support in Ghana' },
]

const JUMP_LINKS = [
  { href: '#story', label: 'Our story' },
  { href: '#purpose', label: 'Mission & vision' },
  { href: '#goals', label: 'Our goals' },
  { href: '#suppliers', label: 'Supplier benefits' },
  { href: '#commercial-terms', label: 'Fees & payouts' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#partnership', label: 'Trust & verification' },
  { href: '#impact', label: 'Our impact' },
  { href: '#questions', label: 'Questions' },
]

const PURPOSE_CARDS = [
  {
    number: '01 / OUR MISSION',
    title: (
      <>
        Connect people.
        <br />
        Create opportunity.
      </>
    ),
    body: 'To make Ghana’s tours and activities easier to discover and book, while giving local suppliers the digital tools, visibility and support to reach more travellers.',
  },
  {
    number: '02 / OUR VISION',
    title: (
      <>
        A world of travellers.
        <br />A Ghana of possibilities.
      </>
    ),
    body: 'To become a trusted gateway to travelling in Ghana — bringing experiences, stays, transport and dining into a connected ecosystem that benefits travellers, businesses and communities.',
  },
]

const GOALS = [
  {
    num: '01',
    title: 'Bring local businesses into view',
    body: 'Help guides, hosts and operators build a digital presence that travellers can discover beyond their existing networks.',
  },
  {
    num: '02',
    title: 'Make travel easier to plan',
    body: 'Bring clear descriptions, prices, availability and booking information together so travellers can make informed choices.',
  },
  {
    num: '03',
    title: 'Help suppliers manage and grow',
    body: 'Reduce the friction of managing listings and bookings, giving suppliers more time to deliver memorable experiences.',
  },
  {
    num: '04',
    title: 'Spread opportunity across Ghana',
    body: 'Encourage discovery beyond familiar destinations and create more space for regional experiences and local enterprise.',
  },
  {
    num: '05',
    title: 'Make tourism contribute to communities',
    body: 'Connect our commercial growth with our commitment to the Expedition-Go Foundation.',
  },
]

const BENEFITS = [
  {
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </>
    ),
    title: 'Greater visibility',
    body: 'Showcase your services to travellers looking for experiences in Ghana, with a dedicated listing that tells your story.',
  },
  {
    icon: <path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5" />,
    title: 'A place to sell',
    body: 'Present your itinerary, photographs, inclusions, pricing and booking conditions in a clear, structured format.',
  },
  {
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M7 3v4M17 3v4m-10 8 3 3 6-5" />
      </>
    ),
    title: 'Booking management',
    body: 'View reservations and manage your product information and availability through your supplier dashboard.',
  },
  {
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
    title: 'Payment visibility',
    body: 'Track booking earnings and payout information. A flat 15% commission applies to successful bookings, with payout arrangements set out in your supplier agreement.',
  },
  {
    icon: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />,
    title: 'A reputation that grows',
    body: 'Build confidence through accurate listings, reliable service and traveller feedback.',
  },
  {
    icon: (
      <path d="M4 13a8 8 0 0 1 16 0M4 13v5h4v-6H6a2 2 0 0 0-2 1ZM20 13v5h-4v-6h2a2 2 0 0 1 2 1ZM16 18c0 2-1 3-4 3" />
    ),
    title: 'Marketing & local support',
    body: 'Eligible experiences can be promoted through the platform, social media, email and partner channels. Get help with onboarding and improving your listings.',
  },
]

const COMMERCIAL_POINTS = [
  { label: 'CONTROL', strong: 'Set prices & availability' },
  { label: 'PAYOUTS', strong: 'Monthly or bi-weekly options' },
  { label: 'FLEXIBILITY', strong: 'Deactivate when you choose' },
  { label: 'SUPPORT', strong: 'Help with your first listing' },
]

const STEPS = [
  {
    num: 'STEP 01',
    title: 'Create your profile',
    body: 'Choose your supplier type, create your own login and provide the details and documents required for your category.',
  },
  {
    num: 'STEP 02',
    title: 'Add your experience',
    body: 'Build a clear listing with photographs, itinerary, inclusions, pickup details, prices and availability.',
  },
  {
    num: 'STEP 03',
    title: 'Get reviewed & go live',
    body: 'Our team reviews your listing before publication. Once approved, travellers can discover and book your experience.',
  },
  {
    num: 'STEP 04',
    title: 'Deliver & get paid',
    body: 'Manage bookings in your dashboard, welcome your guests and receive consolidated payouts for eligible completed bookings.',
  },
]

type CategoryKey = 'tours' | 'stays' | 'transport' | 'dining'

const CATEGORIES: Record<
  CategoryKey,
  { tab: string; tag: string; title: string; copy: string; list: string[] }
> = {
  tours: {
    tab: 'Tours & activities',
    tag: 'Our core focus',
    title: 'Experiences worth travelling for.',
    copy: 'Connect with local guides, hosts and operators for cultural encounters, city discoveries, heritage tours and outdoor adventures.',
    list: [
      'Guided tours and local activities',
      'Culture, heritage and nature experiences',
      'Independent hosts and registered operators',
    ],
  },
  stays: {
    tab: 'Hotels & stays',
    tag: 'Our wider vision',
    title: 'A place to stay. A reason to explore.',
    copy: 'Our accommodation vision connects Ghanaian hotels, apartments and stays providers with travellers, bringing the places people sleep closer to the experiences they discover.',
    list: ['Hotels, apartments and local stays', 'Property information and booking management', 'A connected accommodation partner ecosystem'],
  },
  transport: {
    tab: 'Transport',
    tag: 'Core services & wider vision',
    title: 'Make the journey part of the experience.',
    copy: 'Airport transfers and private transport help travellers connect with the places they want to visit. Our wider vision gives transport providers a place within the same partner ecosystem.',
    list: ['Airport transfers', 'Private transport services', 'Independent drivers and transport companies'],
  },
  dining: {
    tab: 'Restaurants',
    tag: 'Our wider vision',
    title: 'Discover Ghana, one table at a time.',
    copy: 'We want travellers to discover local restaurants and food experiences alongside their wider travel plans, giving dining businesses more ways to be seen.',
    list: ['Restaurant discovery', 'Local food and dining experiences', 'A place for restaurant partners in our ecosystem'],
  },
}

const TAB_ORDER: CategoryKey[] = ['tours', 'stays', 'transport', 'dining']

const EXPERIENCES = [
  {
    src: imgCapeCoast,
    width: 700,
    height: 394,
    title: 'Cape Coast Heritage',
    desc: 'Castles, history and the Atlantic coast',
    alt: 'Cape Coast Castle and Ghana’s coastal town',
  },
  {
    src: imgCoastal,
    width: 700,
    height: 907,
    title: 'Historic Coastal Tours',
    desc: 'Ghana’s heritage sites and coastal stories',
    alt: 'Cape Coast Castle cannons overlooking the coastline',
  },
  {
    src: imgElmina,
    width: 650,
    height: 980,
    title: 'Elmina Experiences',
    desc: 'Architecture, culture and local history',
    alt: 'Elmina Castle archway overlooking the sea',
  },
  {
    src: imgAccra,
    width: 700,
    height: 933,
    title: 'Accra City Experiences',
    desc: 'Landmarks, culture and city discovery',
    alt: 'Independence Arch in Accra',
  },
  {
    src: imgWaterfalls,
    width: 653,
    height: 980,
    title: 'Waterfalls & Nature',
    desc: 'Outdoor adventures through lush Ghana',
    alt: 'A visitor enjoying Kintampo Waterfalls in Ghana',
  },
  {
    src: imgWaterBoat,
    width: 700,
    height: 484,
    title: 'Water & Boat Experiences',
    desc: 'Coastal life, lakes and local waterways',
    alt: 'Fishing boats on the water in Ghana',
  },
]

const TRUST_POINTS = [
  {
    num: '01',
    strong: 'A local team that knows Ghana',
    body: 'Built by people who understand Ghanaian destinations, local experiences and the suppliers behind them.',
  },
  {
    num: '02',
    strong: 'Clear ownership and contact details',
    body: 'Know which company operates the platform and reach our team through the official contact page.',
  },
  {
    num: '03',
    strong: 'Visible terms before you commit',
    body: 'Review booking conditions, cancellation policies and supplier terms before you book or register.',
  },
]

const REVIEW_CARDS = [
  {
    key: 'tripadvisor',
    ariaLabel: 'Expedition-Go Tours on Tripadvisor',
    brand: (
      <div className="ta-brand">
        <img src={tripadvisorOwl} alt="" width={512} height={512} />
        <strong>Tripadvisor</strong>
      </div>
    ),
    href: TRIPADVISOR_PROFILE,
    rating: '4.9',
    ratingNote: 'out of 5',
    pills: ['931+ reviews', 'Accra, Ghana', 'Joined July 2022'],
    body: 'Expedition-Go Tours Ltd has an established public Tripadvisor operator profile where suppliers can independently review our traveller feedback and operating history.',
  },
  {
    key: 'getyourguide',
    ariaLabel: 'Expedition-Go Tours on GetYourGuide',
    brand: <img className="review-gyg-logo" src={getYourGuideLogo} alt="GetYourGuide" width={578} height={478} />,
    href: GETYOURGUIDE_PROFILE,
    rating: '4.6',
    ratingNote: 'across reviewed activities',
    pills: ['424+ reviews', '4 reviewed activities', 'Public supplier profile'],
    body: 'Our GetYourGuide supplier profile publicly shows Expedition-Go Tours activities and traveller reviews across Cape Coast, Accra, Boti and Shai Hills/Akosombo experiences.',
  },
]

/** The 12 supplier questions — rendered as <details> and as FAQ JSON-LD. */
const FAQ_ITEMS = [
  {
    question: 'How are Travio Ghana and Expedition-Go Tours connected?',
    answer:
      'Travio Ghana is a trading name of Expedition-Go Tours Ltd. Expedition-Go Tours operates tours, while Travio Ghana gives other local suppliers a platform to showcase and sell their services to travellers.',
  },
  {
    question: 'Who can register as a supplier?',
    answer:
      'Independent experience hosts, individual tour guides, independent drivers, registered tour businesses and transport companies can apply in the relevant category. Suppliers must meet applicable legal and documentation requirements; listings are reviewed before publication.',
  },
  {
    question: 'How much does it cost to list?',
    answer:
      'There is no upfront setup, listing or maintenance fee for activities. A flat 15% platform commission applies to successful bookings, leaving the supplier with 85% before any other applicable adjustments under the supplier agreement.',
  },
  {
    question: 'How and when will I receive payouts?',
    answer:
      'Eligible completed bookings are consolidated for payout. Monthly or bi-weekly options are subject to the current payment terms and required supplier documentation. Refunds, disputes and other adjustments are handled under the supplier agreement.',
  },
  {
    question: 'Do I control my prices and availability?',
    answer:
      'Yes. You manage your prices, product details and availability through your supplier workspace. You may deactivate an activity when you choose, subject to fulfilling existing bookings and your agreement.',
  },
  {
    question: 'How does the platform help market my experiences?',
    answer:
      'Eligible listings can be promoted through Travio Ghana, social media, email, content and relevant partner channels. Exposure and bookings depend on demand, listing quality and service delivery.',
  },
  {
    question: 'Do I need technical skills or have to list alone?',
    answer:
      'The guided supplier workspace helps you create and manage listings. Assisted onboarding is available if you want the supplier team to help with your first experience.',
  },
  {
    question: 'What happens after I register?',
    answer:
      'Confirm your email, complete your profile and required documentation, then add your experience. Our team reviews your listing before it goes live. Once approved and published, you can receive and manage bookings.',
  },
  {
    question: 'Are hotels, restaurants and transport part of Travio Ghana?',
    answer:
      'Tours and activities are the foundation. Airport transfers and private transport connect travellers with local providers. Hotels, stays and restaurants form part of our wider ecosystem vision; check the platform for current categories and onboarding options.',
  },
  {
    question: 'How does the Foundation commitment work?',
    answer:
      'Our commitment is to direct 5% of every booking to the Expedition-Go Foundation. It links platform growth to our community purpose. The supplier commission illustration above shows the 85% / 15% commercial split and does not apply an additional Foundation deduction.',
  },
  {
    question: 'How can I check the platform or speak with someone before joining?',
    answer:
      'Use the official Travio Ghana and Expedition-Go Tours websites and contact the supplier team through the official contact page. You can ask questions about the platform, supplier requirements and the listing process before registering.',
  },
  {
    question: 'Is Travio Ghana a Ghanaian platform?',
    answer:
      'Yes. Travio Ghana was built in Ghana by a small Ghanaian team and is operated by Expedition-Go Tours Ltd, a Ghanaian company based in Accra. You can review our company information, check Expedition-Go Tours’ public Tripadvisor and GetYourGuide profiles, and speak with our team before booking or joining.',
  },
]

const ghs = (value: number) =>
  `GHS ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * The prototype's reveal script: `.reveal` elements fade/slide in once, but
 * only when motion is allowed — otherwise they must simply be visible.
 */
function useRevealOnScroll(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('.reveal'))
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add('seen'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('seen')
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.05 },
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [rootRef])
}

/** Highlights the jump-nav entry for the section currently in view. */
function useSectionSpy(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.jump a'))
    const sections = Array.from(root.querySelectorAll<HTMLElement>('section[id]'))
    if (!links.length || !sections.length) return
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = `#${entry.target.id}`
          links.forEach((a) => a.classList.toggle('active', a.hash === id))
        }
      },
      { rootMargin: '-20% 0px -60% 0px' },
    )
    sections.forEach((s) => spy.observe(s))
    return () => spy.disconnect()
  }, [rootRef])
}

export default function ListExperiencePage() {
  const navigate = useNavigate()
  const pageRef = useRef<HTMLElement>(null)

  // Resolved during the first render (before paint) so content is never
  // hidden and then revealed — the prototype did the same thing synchronously.
  const [motionAllowed] = useState(
    () =>
      typeof IntersectionObserver !== 'undefined' &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useRevealOnScroll(pageRef)
  useSectionSpy(pageRef)

  const [activeCategory, setActiveCategory] = useState<CategoryKey>('tours')
  const [bookingValue, setBookingValue] = useState('1000')
  const [galleryPaused, setGalleryPaused] = useState(false)

  // Approved suppliers who land on the marketing URL go straight to their
  // portal (same guard the page carried before the split from /supplier/register).
  const { profile } = useSupplierStatus({ forceEnabled: true })
  useEffect(() => {
    if (!profile || !isApprovedSupplier(profile.status)) return
    let cancelled = false
    ;(async () => {
      const portalUrl = await getSupplierPortalUrl(profile)
      if (!cancelled && portalUrl) window.location.replace(portalUrl)
    })()
    return () => {
      cancelled = true
    }
  }, [profile])

  const handleApplyCta = useCallback(() => {
    navigate(REGISTER_PATH)
  }, [navigate])

  const booking = useMemo(() => {
    const raw = bookingValue.trim()
    const n = Number(raw)
    const valid = raw !== '' && Number.isFinite(n) && n >= 0 && n <= 10000000
    return {
      valid,
      supplierShare: valid ? ghs(n * 0.85) : 'Enter a valid amount',
      platformShare: valid ? ghs(n * 0.15) : '—',
    }
  }, [bookingValue])

  const category = CATEGORIES[activeCategory]

  const selectCategory = useCallback(
    (next: CategoryKey, focus = false) => {
      setActiveCategory(next)
      if (focus) document.getElementById(`tab-${next}`)?.focus()
    },
    [],
  )

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | undefined
    if (event.key === 'ArrowRight') next = (index + 1) % TAB_ORDER.length
    if (event.key === 'ArrowLeft') next = (index + TAB_ORDER.length - 1) % TAB_ORDER.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = TAB_ORDER.length - 1
    if (next === undefined) return
    event.preventDefault()
    selectCategory(TAB_ORDER[next], true)
  }

  return (
    <motion.main
      ref={pageRef}
      className={`le-page${motionAllowed ? ' js-motion' : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <SEO
        title="List on TravioGhana"
        description="List your tours and experiences on Travio Ghana, an Expedition-Go Tours initiative. Reach more travellers, manage availability and keep 85% of every successful booking."
        keywords="list on TravioGhana, list your experience Ghana, become a supplier Ghana, Travio Ghana supplier, Ghana tour operator, list tours Ghana"
        jsonLd={[
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'List on TravioGhana', url: `${SITE_URL}/supplier/list-experience` },
          ]),
          buildFAQSchema(FAQ_ITEMS),
        ]}
      />

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grid">
          <div>
            <div className="hero-origin" aria-label="Built in Ghana by a Ghanaian team">
              <span className="origin-flag" aria-hidden="true">
                🇬🇭
              </span>
              <div>
                <strong>Built in Ghana by a Ghanaian team</strong>
                <span>Local people. Local knowledge. A shared vision for Ghana.</span>
              </div>
            </div>
            <h1 id="hero-title">
              Built for Ghana.
              <br />
              <em>
                Ready for
                <br />
                the world.
              </em>
            </h1>
            <p className="intro">
              An Expedition-Go Tours initiative connecting travellers with Ghana&rsquo;s local experts. Discover our purpose, list your experiences,
              and grow through one connected supplier platform.
            </p>
            <div className="actions">
              <button type="button" className="btn light" onClick={handleApplyCta}>
                Become a supplier{' '}
                <span>
                  <ExternalIcon />
                </span>
              </button>
              <a className="textlink" href="#story">
                Why we created it ↓
              </a>
            </div>
            <div className="micro-benefits">
              <span>
                <i aria-hidden="true" />Free to join &amp; list
              </span>
              <span>
                <i aria-hidden="true" />Keep 85% of each booking
              </span>
              <span>
                <i aria-hidden="true" />Local supplier support
              </span>
            </div>
          </div>

          <div className="visual workspace" aria-label="Travio Ghana supplier workspace previews">
            <div className="workspace-top">
              <img className="travio-logo" src={travioLogo} alt="Travio Ghana" width={2076} height={450} />
              <span>
                LOCAL EXPERTISE.
                <br />
                GLOBAL POSSIBILITIES.
              </span>
            </div>
            <div className="screens">
              <img className="screen login-screen" src={phoneLogin} alt="Travio Ghana supplier login screen" width={304} height={558} />
              <img
                className="screen product-screen"
                src={phoneProducts}
                alt="Travio Ghana product management screen"
                width={309}
                height={672}
              />
              <img
                className="screen dashboard-screen"
                src={phoneDashboard}
                alt="Travio Ghana supplier dashboard preview"
                width={307}
                height={667}
              />
            </div>
            <div className="workspace-note">
              <span className="checkmark" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>Local suppliers. One connected platform.</strong>
                <span>List your experience · Manage bookings · Grow</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-foot">
          <span>
            A trading name of <strong>Expedition-Go Tours Ltd</strong>
          </span>
          <span>Connecting travellers · Supporting suppliers · Growing local opportunity</span>
        </div>
      </section>

      {/* ── Proof bar ──────────────────────────────────────────────── */}
      <div className="combined-proof wrap" aria-label="Supplier partnership at a glance">
        {PROOF.map((item) => (
          <div key={item.span}>
            <strong>{item.strong}</strong>
            <span>{item.span}</span>
          </div>
        ))}
      </div>

      {/* ── On-this-page jump nav ──────────────────────────────────── */}
      <nav className="jump" aria-label="On this page">
        <div className="wrap">
          {JUMP_LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </div>
      </nav>

      {/* ── Local origin strip ─────────────────────────────────────── */}
      <div className="wrap local-origin">
        <span className="ghana-flag" aria-hidden="true">
          🇬🇭
        </span>
        <div>
          <strong>Travio Ghana. Built here. Understood here.</strong>
          <p>Created in Ghana by a small Ghanaian team that understands our people, our places and the way we travel.</p>
        </div>
        <a href="#partnership">
          Meet the company behind it <ExternalIcon />
        </a>
      </div>

      {/* ── Our story ──────────────────────────────────────────────── */}
      <section id="story" className="content">
        <div className="wrap split reveal">
          <div>
            <img className="story-logo" src={travioLogo} alt="Travio Ghana" width={2076} height={450} />
            <p className="eyebrow">Why we created Travio Ghana</p>
            <h2>
              Great experiences
              <br />
              deserve to be found.
            </h2>
            <div className="callout">The next chapter of our journey is helping more people share theirs.</div>
          </div>
          <div className="body-copy">
            <p>
              At Expedition-Go Tours, our work brings us close to the people, places and stories that make Ghana special. It also gives us a clear
              view of the opportunity: talented guides, independent hosts and tourism businesses need better ways to connect with travellers.
            </p>
            <p>
              Travellers need a simpler way to discover local experiences, understand what they are booking and plan with confidence. Suppliers need
              visibility, practical booking tools and access to a wider audience.
            </p>
            <p>
              <strong>Travio Ghana brings these needs together.</strong> We created it as a Ghana-focused online travel platform where local
              providers can present their services and travellers can discover and book experiences in one place.
            </p>
            <p>
              Travio Ghana is a trading name of Expedition-Go Tours Ltd. It extends our commitment to Ghanaian tourism into a platform that creates
              space for other local businesses to participate and grow.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mission &amp; vision ───────────────────────────────────── */}
      <section id="purpose" className="content tint">
        <div className="wrap reveal">
          <p className="eyebrow">Our purpose</p>
          <div className="section-head">
            <h2>
              Rooted in Ghana.
              <br />
              Looking further.
            </h2>
            <p>Local expertise is our starting point. A stronger, more connected tourism community is our ambition.</p>
          </div>
          <div className="purpose">
            {PURPOSE_CARDS.map((card) => (
              <article className="card" key={card.number}>
                <span className="number">{card.number}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our goals ──────────────────────────────────────────────── */}
      <section id="goals" className="content">
        <div className="wrap split reveal">
          <div>
            <p className="eyebrow">What we aim to achieve</p>
            <h2>
              More access.
              <br />
              More confidence.
              <br />
              More local value.
            </h2>
            <p className="body-copy" style={{ marginTop: 25 }}>
              Our goal is to make participation in tourism easier — whether you are planning a trip or building a business around the places you
              know best.
            </p>
          </div>
          <div>
            {GOALS.map((goal) => (
              <div className="goal" key={goal.num}>
                <span>{goal.num}</span>
                <div>
                  <h3>{goal.title}</h3>
                  <p>{goal.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Supplier benefits ──────────────────────────────────────── */}
      <section id="suppliers" className="content supplier-dark">
        <div className="wrap reveal">
          <div className="section-head">
            <div>
              <p className="eyebrow">For the people behind the experience</p>
              <h2>
                Your local expertise.
                <br />A wider audience.
              </h2>
            </div>
            <p>
              For independent experience hosts, tour guides, drivers, tour operators and tourism businesses ready to bring their services online.
            </p>
          </div>
          <div className="benefits">
            {BENEFITS.map((benefit) => (
              <article className="benefit" key={benefit.title}>
                <span className="icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="line-icon">
                    {benefit.icon}
                  </svg>
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
              </article>
            ))}
          </div>
          <p className="smallnote">
            Supplier participation is subject to registration, applicable documentation, listing review and supplier terms. Visibility and bookings
            depend on demand, listing quality and service delivery.
          </p>
          <div className="actions" style={{ marginTop: 28 }}>
            <button type="button" className="btn" onClick={handleApplyCta}>
              Become a supplier{' '}
              <span>
                <ExternalIcon />
              </span>
            </button>
            <a className="textlink" href={SUPPLIER_TERMS} target="_blank" rel="noopener noreferrer">
              Read supplier terms
            </a>
          </div>
        </div>
      </section>

      {/* ── Commercial terms + live commission example ─────────────── */}
      <section id="commercial-terms" className="content">
        <div className="wrap commercial-shell reveal">
          <div className="commission-visual">
            <div className="commission-ring" aria-label="Suppliers keep 85 percent; platform commission is 15 percent">
              <div>
                <strong>85%</strong>
                <span>YOU KEEP</span>
              </div>
            </div>
            <div className="commission-pill">
              <b>15%</b> platform commission
            </div>
            <p>No setup fee. No maintenance fee.</p>
          </div>
          <div>
            <p className="eyebrow">Simple commercial terms</p>
            <h2>
              Free to list.
              <br />
              Pay when you earn.
            </h2>
            <p className="body-copy" style={{ marginTop: 23 }}>
              Adding and maintaining an activity is free. A flat 15% commission applies to each successful booking and supports platform tools,
              management, insights and promotion.
            </p>
            <div className="commercial-points">
              {COMMERCIAL_POINTS.map((point) => (
                <div key={point.label}>
                  <span>{point.label}</span>
                  <strong>{point.strong}</strong>
                </div>
              ))}
            </div>
            <div className="earnings-example">
              <div className="example-head">
                <label htmlFor="booking-value">Explore a booking example</label>
                <span>GHS</span>
              </div>
              <div className="input-row">
                <input
                  id="booking-value"
                  type="number"
                  min={0}
                  max={10000000}
                  step={1}
                  value={bookingValue}
                  inputMode="decimal"
                  aria-invalid={!booking.valid}
                  aria-describedby="example-note"
                  onChange={(event) => setBookingValue(event.target.value)}
                />
                <span>successful booking value</span>
              </div>
              <div className="example-results" aria-live="polite" aria-atomic="true">
                <div>
                  <span>Your share · 85%</span>
                  <strong id="supplier-share">{booking.supplierShare}</strong>
                </div>
                <div>
                  <span>Platform fee · 15%</span>
                  <strong id="platform-share">{booking.platformShare}</strong>
                </div>
              </div>
              <p id="example-note">
                Illustrative commission split only. Final payouts depend on applicable refunds, taxes, deductions and the supplier agreement. The 5%
                Foundation commitment is separate from this illustration.
              </p>
            </div>
            <a className="textlink" href={SUPPLIER_TERMS} target="_blank" rel="noopener noreferrer">
              Review the supplier terms <ExternalIcon />
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="content onboarding-section">
        <div className="wrap reveal">
          <div className="process-heading">
            <p className="eyebrow">How the platform works</p>
            <h2>
              From local expertise
              <br />
              to a live listing.
            </h2>
            <p className="body-copy">A guided journey, with a real team to help you along the way.</p>
          </div>
          <div className="onboarding-grid">
            {STEPS.map((step) => (
              <article key={step.num}>
                <span className="step-circle">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
          <div className="traveller-flow">
            <strong>For travellers</strong>
            <span>Discover → Review the details → Book → Meet your local provider → Share feedback</span>
            <a href="https://www.travioghana.com/tours" target="_blank" rel="noopener noreferrer">
              Explore experiences <ExternalIcon />
            </a>
          </div>
        </div>
      </section>

      {/* ── Platform categories ────────────────────────────────────── */}
      <section className="content" style={{ paddingTop: 0 }}>
        <div className="wrap reveal">
          <div className="section-head">
            <div>
              <p className="eyebrow">One connected vision</p>
              <h2>
                More of Ghana.
                <br />
                In one ecosystem.
              </h2>
            </div>
            <p>Tours and activities are our foundation. Our wider ambition brings more parts of the travel journey together.</p>
          </div>
          <div className="tabs" role="tablist" aria-label="Platform categories">
            {TAB_ORDER.map((key, index) => (
              <button
                key={key}
                id={`tab-${key}`}
                type="button"
                role="tab"
                aria-selected={activeCategory === key}
                aria-controls="category-panel"
                tabIndex={activeCategory === key ? 0 : -1}
                data-category={key}
                onClick={() => selectCategory(key)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
              >
                {CATEGORIES[key].tab}
              </button>
            ))}
          </div>
          <div className="ecosystem" id="category-panel" role="tabpanel" aria-labelledby={`tab-${activeCategory}`} tabIndex={0}>
            <div>
              <span className="tag" id="category-tag">
                {category.tag}
              </span>
              <h3 id="category-title">{category.title}</h3>
              <p id="category-copy">{category.copy}</p>
            </div>
            <ul id="category-list">
              {category.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Experience marquee ─────────────────────────────────────── */}
      <section className="content flowing-discovery" aria-labelledby="discovery-title">
        <div className="wrap reveal">
          <div className="section-head">
            <div>
              <p className="eyebrow">The Ghana we want to share</p>
              <h2 id="discovery-title">
                Unforgettable experiences.
                <br />
                More local possibilities.
              </h2>
            </div>
            <p>
              From heritage and city tours to waterfalls, coastal escapes and local experiences — the places and people that inspired Travio Ghana.
            </p>
          </div>
        </div>
        <div className="gallery-window">
          <div className={`gallery-track${galleryPaused ? ' paused' : ''}`}>
            {[0, 1].map((setIndex) => (
              <div className="gallery-set" key={setIndex} aria-hidden={setIndex === 1 ? 'true' : undefined}>
                {EXPERIENCES.map((exp) => (
                  <figure className="flow-card" key={`${setIndex}-${exp.title}`}>
                    <BundledImage
                      src={exp.src}
                      alt={setIndex === 0 ? exp.alt : ''}
                      width={exp.width}
                      height={exp.height}
                      sizes="300px"
                      loading="lazy"
                    />
                    <figcaption>
                      <strong>{exp.title}</strong>
                      <span>{exp.desc}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="wrap gallery-bottom">
          <a className="textlink" href="https://www.travioghana.com/tours" target="_blank" rel="noopener noreferrer">
            Explore experiences on Travio Ghana <ExternalIcon />
          </a>
          <button
            className="gallery-control"
            type="button"
            aria-pressed={galleryPaused}
            onClick={() => setGalleryPaused((paused) => !paused)}
          >
            {galleryPaused ? 'Play gallery' : 'Pause gallery'}
          </button>
        </div>
      </section>

      {/* ── Trust &amp; verification ───────────────────────────────── */}
      <section id="partnership" className="content verification-section">
        <div className="wrap">
          <div className="verification-intro reveal">
            <p className="eyebrow">Trust &amp; verification</p>
            <img className="verification-tg-logo" src={travioLogo} alt="Travio Ghana" width={2076} height={450} />
            <h2>
              Built in Ghana.
              <br />
              By a small Ghanaian team
              <br />
              that understands Ghana.
            </h2>
            <p>
              <strong>
                Travio Ghana is an initiative of Expedition-Go Tours Ltd, a Ghanaian company based in Accra.
              </strong>{' '}
              We built it around the places we know, the people we work with and the needs of Ghana&rsquo;s tourism community.
            </p>
            <p>
              When you use Travio Ghana, you are using a platform operated by a local company with a team you can speak to. Our company identity,
              supplier terms and contact details are available for you to review before you book or join.
            </p>
          </div>

          <div className="ownership-panel reveal">
            <div>
              <span className="trust-index">THE COMPANY BEHIND THE PLATFORM</span>
              <h3>
                Travio Ghana
                <br />
                <span>by Expedition-Go Tours Ltd</span>
              </h3>
              <p>
                Travio Ghana is a trading name of Expedition-Go Tours Ltd. Our roots and operating team are in Ghana, and our goal is to create more
                opportunity for local tourism businesses.
              </p>
              <a className="textlink" href={COMPANY_SITE} target="_blank" rel="noopener noreferrer">
                Visit our company website <ExternalIcon />
              </a>
            </div>
            <div className="local-trust-points">
              {TRUST_POINTS.map((point) => (
                <div key={point.num}>
                  <span>{point.num}</span>
                  <div>
                    <strong>{point.strong}</strong>
                    <p>{point.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="review-proof-heading">
            <h3>Independent travel-platform proof</h3>
            <span>Check our public profiles before you join</span>
          </div>
          <div className="review-template-grid reveal">
            {REVIEW_CARDS.map((card) => (
              <article className="review-template-card" aria-label={card.ariaLabel} key={card.key}>
                <div className="review-template-top">
                  <div className="review-platform-brand">{card.brand}</div>
                  <a className="review-profile-link" href={card.href} target="_blank" rel="noopener noreferrer">
                    View profile <ExternalIcon />
                  </a>
                </div>
                <div className="review-template-rating">
                  <strong>{card.rating}</strong>
                  <span>{card.ratingNote}</span>
                </div>
                <div className="review-template-stars" aria-hidden="true">
                  ★★★★★
                </div>
                <div className="review-template-pills">
                  {card.pills.map((pill) => (
                    <span key={pill}>{pill}</span>
                  ))}
                </div>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
          <p className="review-snapshot-note">
            Expedition-Go Tours profile figures shown from the supplied reference. Visit each profile for current ratings and reviews.
          </p>

          <div className="team-intro">
            <div>
              <p className="eyebrow">Prefer to speak with someone?</p>
              <h3>
                Meet the supplier team
                <br />
                before you join.
              </h3>
              <p>Ask questions, request a listing walkthrough or get help taking your first step on Travio Ghana.</p>
            </div>
            <div className="team-actions">
              <a className="btn white" href="https://www.travioghana.com/contact-us">
                Talk to the supplier team
              </a>
              <a className="team-secondary" href={SUPPLIER_PORTAL}>
                Open supplier portal
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Foundation impact ──────────────────────────────────────── */}
      <section id="impact" className="content tint">
        <div className="wrap impact reveal">
          <div className="percent">
            5%<small>
              Of every booking
              <br />
              for a bigger purpose
            </small>
          </div>
          <div>
            <p className="eyebrow">Tourism with purpose</p>
            <h2>
              A journey that reaches
              <br />
              beyond the traveller.
            </h2>
            <p className="body-copy" style={{ marginTop: 25 }}>
              Our commitment is to direct 5% of every booking to the Expedition-Go Foundation. It connects the platform&rsquo;s growth with our
              ambition to create a positive contribution to communities.
            </p>
            <p className="body-copy">
              We want tourism to open doors for local people — through business opportunity, meaningful connections and a shared commitment to
              Ghana&rsquo;s future.
            </p>
            <a className="textlink" href="https://www.travioghana.com/foundation" target="_blank" rel="noopener noreferrer">
              Discover our Foundation <ExternalIcon />
            </a>
          </div>
        </div>
      </section>

      {/* ── Supplier FAQ ───────────────────────────────────────────── */}
      <section id="questions" className="content">
        <div className="wrap faq-layout">
          <div className="faq-intro">
            <p className="eyebrow">Supplier FAQ</p>
            <h2>
              Know before
              <br />
              you join.
            </h2>
            <p>Clear answers about our purpose, eligibility, fees, payouts and the supplier journey.</p>
            <a className="btn" href="https://www.travioghana.com/help-centre">
              Visit Help Centre
            </a>
          </div>
          <div className="faq reveal">
            {FAQ_ITEMS.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>
                  <span className="faq-num">{String(index + 1).padStart(2, '0')}</span>
                  {item.question}
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────────── */}
      <div className="wrap">
        <section className="cta reveal">
          <div>
            <p className="eyebrow">Be part of what comes next</p>
            <h2>
              Bring your experience.
              <br />
              Be part of the bigger picture.
            </h2>
            <p>Free to list. Local support. More ways to connect with travellers.</p>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={handleApplyCta}>
              Become a supplier <ExternalIcon />
            </button>
            <a className="textlink" href="https://www.travioghana.com/">
              Explore Travio Ghana <ExternalIcon />
            </a>
          </div>
        </section>
      </div>

      <Footer />
    </motion.main>
  )
}
