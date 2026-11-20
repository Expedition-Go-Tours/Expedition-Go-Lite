import { useMemo, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, Share2, ChevronRight, Sparkles } from 'lucide-react'
import { travelStories, storySlug } from '../components/data'
import type { TravelStory } from '../components/data'
import {
  BLOG_PLACEHOLDER_IMAGE,
  fetchArticleBySlug,
  fetchRelatedArticles,
  type BlogArticleDetail,
} from '../lib/blogApi'
import { articleToCard, type BlogCard } from '../lib/blogArticles'
import ArticleBody from '../components/blog/ArticleBody'
import Footer from '../components/Footer'
import SEO, { buildArticleSchema, buildBreadcrumbSchema } from '../components/SEO'
import './StoryDetailPage.css'
import OptimizedImage from '@/components/shared/OptimizedImage'

interface Section {
  heading: string
  body: string
}

interface StoryContent {
  category: string
  sections: Section[]
  highlights: string[]
  quote: string
}

/**
 * Builds a rich, topic-aware article body for a story. Keeps the data model
 * lean while giving each story a full, readable detail page.
 */
function buildContent(story: TravelStory): StoryContent {
  const topic = story.title.replace(/^(The|A|An)\s+/i, '')
  const category = /food|guide to accra/i.test(story.title)
    ? 'Food & Culture'
    : /history|heritage|castle|culture/i.test(story.title)
      ? 'History & Heritage'
      : /wildlife|safari|park|canopy/i.test(story.title)
        ? 'Nature & Wildlife'
        : /beach/i.test(story.title)
          ? 'Coast & Escapes'
          : 'Travel Guide'

  return {
    category,
    sections: [
      {
        heading: 'Why this belongs on your list',
        body: `${topic} is one of those experiences that stays with you long after you leave. Beyond the postcard views, it offers a genuine window into the rhythm of local life — the people, the flavors, and the stories that shape the place. Whether you are a first-time visitor or returning traveler, there is always a new detail to discover.`,
      },
      {
        heading: 'What to expect',
        body: `Plan for a full, immersive day. Expect knowledgeable local guides, unhurried moments to take it all in, and plenty of opportunities for photos. Come with comfortable footwear, a light layer for changing conditions, and an appetite for the unexpected. The best moments are rarely the ones on the itinerary.`,
      },
      {
        heading: 'Make the most of your visit',
        body: `Arrive early to beat the crowds and catch the softer light. Keep some cash for small vendors, stay hydrated, and lean on your guide for the hidden spots that never make the brochures. Slow down — the point is not to check a box, but to feel the place.`,
      },
    ],
    highlights: [
      'Expert local guides who bring every story to life',
      'Small-group experience for a personal, unhurried pace',
      'Unforgettable photo moments at every turn',
      'Authentic tastes and encounters you will not find elsewhere',
    ],
    quote:
      'The best journeys answer questions that in the beginning you did not even think to ask.',
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function StoryDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  // Live article first: the admin's published content is the source of truth.
  // The static stories remain as a fallback for their own legacy URLs.
  const [article, setArticle] = useState<BlogArticleDetail | null>(null)
  const [missingSlug, setMissingSlug] = useState<string | null>(null)
  const [liveRelated, setLiveRelated] = useState<BlogCard[]>([])

  useEffect(() => {
    let cancelled = false

    fetchArticleBySlug(slug ?? '')
      .then((next) => {
        if (cancelled) return
        setArticle(next)
        setMissingSlug(null)
        setLiveRelated([])
        fetchRelatedArticles(next.id)
          .then((rows) => {
            if (!cancelled) setLiveRelated(rows.map(articleToCard))
          })
          .catch(() => {
            /* related stories are optional */
          })
      })
      .catch(() => {
        if (!cancelled) setMissingSlug(slug ?? null)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  // A response for a previous slug must not be rendered as this one.
  const liveArticle = article && article.slug === slug ? article : null

  const staticStory = useMemo(
    () => travelStories.find((s) => s.slug === slug || storySlug(s.title) === slug),
    [slug]
  )

  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  const liveCard = useMemo(() => (liveArticle ? articleToCard(liveArticle) : null), [liveArticle])
  const content = useMemo(
    () => (liveArticle ? null : staticStory ? buildContent(staticStory) : null),
    [liveArticle, staticStory]
  )

  const title = liveCard?.title ?? staticStory?.title ?? ''
  const excerpt = liveCard?.excerpt ?? staticStory?.excerpt ?? ''
  const heroImage = liveCard?.image ?? staticStory?.image ?? BLOG_PLACEHOLDER_IMAGE
  const author = liveCard?.author ?? staticStory?.author ?? 'Expedition-Go Tours'
  const displayDate = liveCard?.date ?? staticStory?.date ?? ''
  const publishedISO = liveCard?.dateISO ?? staticStory?.dateISO ?? ''
  const categoryLabel = liveArticle?.category?.name ?? content?.category ?? 'Travel Guide'

  const readTime = useMemo(() => {
    if (liveArticle) return liveArticle.readTime ?? 4
    if (!content || !staticStory) return 3
    const words =
      staticStory.excerpt.split(/\s+/).length +
      content.sections.reduce((n, s) => n + s.body.split(/\s+/).length, 0)
    return Math.max(2, Math.round(words / 200))
  }, [liveArticle, content, staticStory])

  const relatedCards = useMemo<BlogCard[]>(() => {
    if (liveRelated.length > 0) return liveRelated.slice(0, 3)
    if (liveArticle) return []
    return travelStories
      .filter((s) => storySlug(s.title) !== slug && s.slug !== slug)
      .slice(0, 3)
      .map((s) => ({
        id: s.slug,
        slug: s.slug,
        title: s.title,
        excerpt: s.excerpt,
        image: s.image,
        author: s.author,
        date: s.date,
        dateISO: s.dateISO ?? '',
        categories: [],
        readTime: s.readTime ?? 4,
        href: `/stories/${s.slug}`,
      }))
  }, [liveArticle, liveRelated, slug])

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href })
      } else {
        await navigator.clipboard?.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* user dismissed share sheet */
    }
  }

  // Only the live article that failed AND no matching legacy story is a 404.
  const storyLoading = !liveArticle && !staticStory && missingSlug !== slug

  if (storyLoading) {
    return (
      <div className="story-detail">
        <div className="story-notfound" role="status">
          <Sparkles size={40} />
          <h1>Loading story…</h1>
        </div>
        <Footer />
      </div>
    )
  }

  if (!title || (!liveArticle && !content)) {
    return (
      <div className="story-detail">
        <div className="story-notfound">
          <Sparkles size={40} />
          <h1>Story not found</h1>
          <p>The story you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <button className="story-notfound-btn" onClick={() => navigate('/stories')}>
            Browse all stories
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="story-detail">
      <SEO
        title={liveArticle?.metaTitle || title}
        description={
          liveArticle?.metaDescription
          || `${title} - ${categoryLabel} travel story from Ghana. Discover authentic experiences, local insights, and travel tips for your Ghana adventure.`
        }
        keywords={`${title}, Ghana travel story, ${categoryLabel.toLowerCase()} Ghana, Ghana travel guide, things to do in Ghana, Ghana experiences`}
        image={heroImage}
        type="article"
        publishedTime={publishedISO}
        jsonLd={[
          buildArticleSchema({
            title,
            description: excerpt || `${title} - ${categoryLabel} travel story from Ghana.`,
            image: heroImage,
            url: `https://www.expeditiongotours.com/stories/${slug}`,
            publishedTime: publishedISO || new Date().toISOString(),
            author,
          }),
          buildBreadcrumbSchema([
            { name: 'Home', url: 'https://www.expeditiongotours.com/' },
            { name: 'Stories', url: 'https://www.expeditiongotours.com/stories' },
            { name: title, url: `https://www.expeditiongotours.com/stories/${slug}` },
          ]),
        ]}
      />
      {/* Reading progress bar */}
      <motion.div className="story-progress" style={{ scaleX: progress }} />


      <AnimatePresence mode="wait">
        <motion.div
          key={slug}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
      {/* Hero */}
      <header className="story-hero">
        <div className="story-hero-bg">
          <OptimizedImage src={heroImage} alt={title} width={1200} />
          <div className="story-hero-scrim" />
          <div className="story-hero-glow story-hero-glow-1" />
          <div className="story-hero-glow story-hero-glow-2" />
          <div className="story-hero-grid" />
        </div>

        <div className="story-hero-inner">
          <motion.button
            className="story-back"
            onClick={() => navigate(-1)}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </motion.button>

          <motion.div
            className="story-hero-content"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
            }}
          >
            <motion.span
              className="story-chip"
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            >
              {categoryLabel}
            </motion.span>

            <motion.h1
              className="story-hero-title"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              {title}
            </motion.h1>

            <motion.div
              className="story-hero-meta"
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            >
              <span className="story-author">
                <span className="story-author-avatar">{initials(author)}</span>
                {author}
              </span>
              <span className="story-meta-dot" />
              <span className="story-meta-item">
                <Calendar size={14} />
                {displayDate}
              </span>
              <span className="story-meta-dot" />
              <span className="story-meta-item">
                <Clock size={14} />
                {readTime} min read
              </span>
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* Article */}
      <main className="story-body">
        <article className="story-article">
          <motion.p
            className="story-lead"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            {excerpt}
          </motion.p>

          {liveArticle ? (
            // The admin's TipTap/Portable Text body, rendered as published.
            <motion.div
              className="story-live-body article-body"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
            >
              <ArticleBody value={liveArticle.body} />
            </motion.div>
          ) : (
            content?.sections.map((section, i) => (
              <motion.section
                key={section.heading}
                className="story-section"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="story-section-heading">{section.heading}</h2>
                <p className="story-section-body">{section.body}</p>

                {/* Insert highlights card after the first section */}
                {i === 0 && (
                  <div className="story-highlights">
                    <div className="story-highlights-glow" />
                    <h3 className="story-highlights-title">
                      Highlights
                    </h3>
                    <ul>
                      {content.highlights.map((h) => (
                        <li key={h}>
                          <ChevronRight size={15} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Insert pull quote after the second section */}
                {i === 1 && (
                  <blockquote className="story-quote">
                    <span className="story-quote-mark">&ldquo;</span>
                    <p>{content.quote}</p>
                  </blockquote>
                )}
              </motion.section>
            ))
          )}

          {/* Author card */}
          <motion.div
            className="story-authorcard"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="story-authorcard-avatar">{initials(author)}</div>
            <div className="story-authorcard-info">
              <span className="story-authorcard-label">Written by</span>
              <span className="story-authorcard-name">{author}</span>
              <p className="story-authorcard-bio">
                Sharing the places, people and flavors that make every journey with
                Expedition-Go unforgettable.
              </p>
            </div>
            <button className="story-share" onClick={handleShare}>
              <Share2 size={16} />
              {copied ? 'Link copied' : 'Share'}
            </button>
          </motion.div>
        </article>
      </main>

      {/* Related stories */}
      {relatedCards.length > 0 && (
        <section className="story-related">
          <div className="story-related-inner">
            <h2 className="story-related-title">More travel stories</h2>
            <div className="story-related-grid">
              {relatedCards.map((card) => (
                <Link
                  key={card.slug}
                  to={card.href}
                  className="story-related-card"
                >
                  <div className="story-related-image">
                    <OptimizedImage src={card.image} alt={card.title} width={400} />
                    <div className="story-related-scrim" />
                  </div>
                  <div className="story-related-body">
                    <span className="story-related-date">{card.date}</span>
                    <h3 className="story-related-heading">{card.title}</h3>
                    <span className="story-related-link">
                      Read story <ChevronRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
        </motion.div>
      </AnimatePresence>

      <Footer />
    </div>
  )
}

export default StoryDetailPage
