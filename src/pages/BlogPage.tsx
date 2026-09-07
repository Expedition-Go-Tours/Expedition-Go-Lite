import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Search, Clock, User, ArrowRight, TrendingUp, BookOpen } from 'lucide-react'
import { travelStories, storySlug } from '../components/data'
import type { TravelStory } from '../components/data'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import OptimizedImage from '@/components/shared/OptimizedImage'
import './BlogPage.css'

interface BlogPageProps {
  onOpenAuth?: (mode: 'signin' | 'signup') => void
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
}

function FeaturedCard({ story }: { story: TravelStory }) {
  const { t } = useTranslation()
  return (
    <motion.div variants={fadeUp}>
      <Link to={`/stories/${storySlug(story.title)}`} className="blog-featured-card">
        <div className="blog-featured-image">
          <OptimizedImage src={story.image} alt={story.title} width={800} />
          <div className="blog-featured-overlay" />
        </div>
        <div className="blog-featured-body">
          <span className="blog-featured-badge">
            <TrendingUp size={14} />
            {t('blog.featured')}
          </span>
          <h2 className="blog-featured-title">{story.title}</h2>
          <p className="blog-featured-excerpt">{story.excerpt}</p>
          <div className="blog-featured-meta">
            <span><User size={14} /> {story.author}</span>
            <span><Clock size={14} /> {story.date}</span>
          </div>
          <span className="blog-featured-read">
            {t('blog.readStory')} <ArrowRight size={16} />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

function StoryCardSmall({ story }: { story: TravelStory }) {
  const { t } = useTranslation()
  return (
    <motion.div variants={fadeUp} className="blog-card">
      <Link to={`/stories/${storySlug(story.title)}`} className="blog-card-link">
        <div className="blog-card-image">
          <OptimizedImage src={story.image} alt={story.title} width={400} />
          <div className="blog-card-image-overlay" />
        </div>
        <div className="blog-card-body">
          <div className="blog-card-meta">
            <span className="blog-card-author"><User size={12} /> {story.author}</span>
            <span className="blog-card-date"><Clock size={12} /> {story.date}</span>
          </div>
          <h3 className="blog-card-title">{story.title}</h3>
          <p className="blog-card-excerpt">{story.excerpt}</p>
          <span className="blog-card-read">
            {t('blog.readMore')} <ArrowRight size={14} />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

export default function BlogPage({ onOpenAuth }: BlogPageProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const CATEGORIES = [
    { key: 'All', label: t('blog.categoryAll') },
    { key: 'Nature', label: t('blog.categoryNature') },
    { key: 'Culture', label: t('blog.categoryCulture') },
    { key: 'Food', label: t('blog.categoryFood') },
    { key: 'Adventure', label: t('blog.categoryAdventure') },
    { key: 'Heritage', label: t('blog.categoryHeritage') },
  ]

  useEffect(() => {
    document.title = t('blog.pageTitle')
  }, [t])

  const filteredStories = travelStories.filter((story) => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const featured = filteredStories[0]
  const remaining = filteredStories.slice(1)

  return (
    <div className="blog-page">
      <Navbar onOpenAuth={onOpenAuth} />

      <section className="blog-hero">
        <div className="blog-hero-bg">
          <img src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80" alt="" aria-hidden="true" className="blog-hero-img" />
          <div className="blog-hero-overlay" />
        </div>
        <motion.div className="blog-hero-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}>
          <div className="blog-hero-icon"><BookOpen size={32} /></div>
          <h1 className="blog-hero-title">{t('blog.heroTitle')}</h1>
          <p className="blog-hero-subtitle">{t('blog.heroSubtitle')}</p>
          <div className="blog-search">
            <Search size={18} className="blog-search-icon" />
            <input type="text" placeholder={t('blog.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="blog-search-input" />
          </div>
        </motion.div>
      </section>

      <section className="blog-categories">
        <div className="blog-container">
          <div className="blog-category-list">
            {CATEGORIES.map((cat) => (
              <button key={cat.key} type="button" className={`blog-category-btn${activeCategory === cat.key ? ' active' : ''}`} onClick={() => setActiveCategory(cat.key)}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {featured && (
        <section className="blog-featured-section">
          <div className="blog-container">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={stagger}>
              <FeaturedCard story={featured} />
            </motion.div>
          </div>
        </section>
      )}

      <section className="blog-grid-section">
        <div className="blog-container">
          <motion.div className="blog-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={stagger}>
            {remaining.map((story) => (
              <StoryCardSmall key={story.title} story={story} />
            ))}
          </motion.div>
        </div>
      </section>

      <section className="blog-newsletter">
        <div className="blog-container">
          <motion.div className="blog-newsletter-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="blog-newsletter-content">
              <h2 className="blog-newsletter-title">{t('blog.stayInLoop')}</h2>
              <p className="blog-newsletter-desc">{t('blog.newsletterDesc')}</p>
              <form className="blog-newsletter-form" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder={t('blog.emailPlaceholder')} className="blog-newsletter-input" />
                <button type="submit" className="blog-newsletter-btn">{t('blog.subscribe')} <ArrowRight size={16} /></button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
