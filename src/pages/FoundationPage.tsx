import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { Users, Heart, Folder, Handshake, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import foundation1 from '../assets/images/foundation1.jpg'
import foundation2 from '../assets/images/foundation2.jpg'
import foundation3 from '../assets/images/foundation3.jpg'
import foundation4 from '../assets/images/foundation4.jpg'
import heroImg1 from '../assets/Image01.webp'
import heroImg2 from '../assets/Image02.webp'
import heroImg3 from '../assets/Image03.webp'
import heroImg4 from '../assets/Image04.webp'
import heroImg5 from '../assets/IMG_3538.webp'
import './FoundationPage.css'

const CORE_AREAS = [
  {
    Icon: Users,
    title: 'Individual Support',
    subtitle: 'Helping people when they need it most.',
    description: "A space for individuals who may need support or assistance. People can share their situation with us and tell us how Expedition-Go may be able to help.",
  },
  {
    Icon: Heart,
    title: 'Community Support',
    subtitle: 'Supporting communities and local initiatives.',
    description: "We work with communities, local leaders, schools, organisations, and groups to identify needs and support initiatives that improve people's lives and create opportunities.",
  },
  {
    Icon: Folder,
    title: 'Community Projects',
    subtitle: 'Turning ideas into meaningful action.',
    description: "Explore the projects and initiatives supported by Expedition-Go, including education, environmental conservation, local development, and other community-focused programmes.",
  },
  {
    Icon: Handshake,
    title: 'Partner With Us',
    subtitle: 'Together, we can make a greater impact.',
    description: "We welcome partnerships with charities, NGOs, businesses, community organisations, and individuals who share our vision of using tourism as a force for good.",
  },
]

const HERO_IMAGES = [heroImg1, heroImg2, heroImg3, heroImg4, heroImg5]

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.12 } },
}

export default function FoundationPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    document.title = 'Expedition-Go Foundation | Making a Difference Through Travel'
  }, [])

  // Auto-advance carousel
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length)
    }, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const goToSlide = (index: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCurrentSlide(index)
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length)
    }, 5000)
  }

  const prevSlide = () => {
    goToSlide((currentSlide - 1 + HERO_IMAGES.length) % HERO_IMAGES.length)
  }

  const nextSlide = () => {
    goToSlide((currentSlide + 1) % HERO_IMAGES.length)
  }

  return (
    <div className="foundation-page">
      <Navbar />

      {/* Hero Section with Image Carousel */}
      <section className="foundation-hero">
        <div className="foundation-hero-carousel">
          {HERO_IMAGES.map((img, index) => (
            <div
              key={index}
              className={`foundation-hero-slide ${index === currentSlide ? 'active' : ''}`}
            >
              <img src={img} alt="" aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="foundation-hero-overlay" />
        <button
          className="foundation-hero-nav foundation-hero-nav--prev"
          onClick={prevSlide}
          aria-label="Previous image"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          className="foundation-hero-nav foundation-hero-nav--next"
          onClick={nextSlide}
          aria-label="Next image"
        >
          <ChevronRight size={28} />
        </button>
        <div className="foundation-hero-dots">
          {HERO_IMAGES.map((_, index) => (
            <button
              key={index}
              className={`foundation-hero-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        <motion.div
          className="foundation-hero-content"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <p className="foundation-hero-label">Expedition-Go Foundation</p>
          <h1 className="foundation-hero-title">Every journey can make a difference.</h1>
        </motion.div>
      </section>

      {/* Mission Section */}
      <section className="foundation-mission">
        <motion.div
          className="foundation-mission-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <div className="foundation-mission-icon">
            <Heart size={32} />
          </div>
          <h2 className="foundation-mission-title">Making a difference through travel</h2>
          <p className="foundation-mission-text">
            At Expedition-Go, we believe tourism should not only create memorable experiences—it should
            also create a positive impact in the communities and destinations we serve.
          </p>
          <p className="foundation-mission-text">
            That's why we commit <strong>2% of every booking revenue</strong> generated through the
            Expedition-Go platform to the Expedition-Go Foundation. Through this contribution, we support
            individuals, local communities, and community-led projects that need a helping hand.
          </p>
          <p className="foundation-mission-text foundation-mission-highlight">
            Whether it's supporting a family in need, contributing to a local community initiative,
            helping fund an important project, or supporting sustainable development, every booking
            with Expedition-Go helps us give back.
          </p>
          <p className="foundation-mission-text foundation-mission-cta-text">
            When you travel with Expedition-Go, you're not just booking a journey. You're helping
            create a better one for someone else.
          </p>
        </motion.div>
      </section>

      {/* Core Areas Section */}
      <section className="foundation-areas">
        <motion.div
          className="foundation-areas-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <p className="foundation-section-label">How we help</p>
          <h2 className="foundation-section-title">Our focus areas</h2>
        </motion.div>

        <motion.div
          className="foundation-areas-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {CORE_AREAS.map((area) => (
            <motion.div key={area.title} className="foundation-area-card" variants={fadeUp}>
              <div className="foundation-area-icon">
                <area.Icon size={24} />
              </div>
              <h3 className="foundation-area-title">{area.title}</h3>
              <p className="foundation-area-subtitle">{area.subtitle}</p>
              <p className="foundation-area-description">{area.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Image Gallery Section */}
      <section className="foundation-gallery">
        <motion.div
          className="foundation-gallery-header"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <p className="foundation-section-label">Our impact</p>
          <h2 className="foundation-section-title">Together, we make a difference</h2>
        </motion.div>

        <motion.div
          className="foundation-gallery-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.div className="foundation-gallery-item" variants={fadeUp}>
            <img src={foundation1} alt="Supporting those in need" />
            <div className="foundation-gallery-caption">Individual Support</div>
          </motion.div>
          <motion.div className="foundation-gallery-item" variants={fadeUp}>
            <img src={foundation2} alt="Giving back to communities" />
            <div className="foundation-gallery-caption">Community Support</div>
          </motion.div>
          <motion.div className="foundation-gallery-item" variants={fadeUp}>
            <img src={foundation3} alt="Community projects in action" />
            <div className="foundation-gallery-caption">Community Projects</div>
          </motion.div>
          <motion.div className="foundation-gallery-item" variants={fadeUp}>
            <img src={foundation4} alt="Volunteers making a difference" />
            <div className="foundation-gallery-caption">Volunteer With Us</div>
          </motion.div>
        </motion.div>
      </section>

      {/* Volunteer Section */}
      <section className="foundation-volunteer">
        <motion.div
          className="foundation-volunteer-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <p className="foundation-section-label">Get involved</p>
          <h2 className="foundation-volunteer-title">Volunteer With Us</h2>
          <p className="foundation-volunteer-subtitle">Give your time. Make a difference.</p>
          <p className="foundation-volunteer-text">
            Discover opportunities to volunteer your time, skills, and experience through
            Expedition-Go's community initiatives and projects. Your contribution, no matter
            how small, can create lasting change in someone's life.
          </p>
          <Link to="/contact-us" className="foundation-btn foundation-btn--primary">
            Get Involved
            <ArrowRight size={18} />
          </Link>
        </motion.div>
        <motion.div
          className="foundation-volunteer-image"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <img src={foundation4} alt="Volunteers working together" />
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="foundation-cta">
        <div className="foundation-cta-bg" />
        <motion.div
          className="foundation-cta-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="foundation-cta-title">Ready to make a difference?</h2>
          <p className="foundation-cta-text">
            Every booking with Expedition-Go helps support communities and create positive change.
          </p>
          <div className="foundation-cta-buttons">
            <Link to="/contact-us" className="foundation-btn foundation-btn--white">
              Get Involved
              <ArrowRight size={18} />
            </Link>
            <Link to="/about-us" className="foundation-btn foundation-btn--outline">
              Learn More
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
