import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, ChevronRight, Clock, Share2, Sparkles, Star } from 'lucide-react'
import { travelStories, storySlug } from '../components/data'
import type { TravelStory } from '../components/data'
import {
  BLOG_PLACEHOLDER_IMAGE,
  fetchArticleBySlug,
  fetchRelatedArticles,
  type BlogArticleDetail,
} from '../lib/blogApi'
import { articleToCard, type BlogCard } from '../lib/blogArticles'
import { extractArticleHeadings, headingId } from '../lib/articleHeadings'
import { tourHref } from '../lib/tourPath'
import ArticleBody from '../components/blog/ArticleBody'
import Footer from '../components/Footer'
import SEO, { buildArticleSchema, buildBreadcrumbSchema, SITE_URL } from '../components/SEO'
import OptimizedImage from '@/components/shared/OptimizedImage'
import './StoryDetailPage.css'

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
  const proseRef = useRef<HTMLDivElement>(null)

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

  const relatedTours = useMemo(() => (liveArticle?.relatedTours ?? []).slice(0, 3), [liveArticle])

  // Admin bodies and the generated static-story sections both expose their H2s
  // in this order, so the TOC and the DOM ids stay in step without extra state.
  const headings = useMemo(() => {
    if (liveArticle) return extractArticleHeadings(liveArticle.body)
    if (content) {
      return content.sections.map((section, index) => ({
        id: headingId(section.heading, index),
        text: section.heading,
      }))
    }
    return []
  }, [liveArticle, content])

  useEffect(() => {
    const root = proseRef.current
    if (!root) return
    root.querySelectorAll('h2').forEach((heading, index) => {
      heading.id = headings[index]?.id || headingId(heading.textContent || '', index)
    })
  }, [headings])

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

  const jumpToHeading = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const heading = document.getElementById(id)
    if (!heading) return
    event.preventDefault()
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  // Only the live article that failed AND no matching legacy story is a 404.
  const storyLoading = !liveArticle && !staticStory && missingSlug !== slug

  if (storyLoading) {
    return (
      <div className="story-detail explorer-article">
        <div className="story-notfound" role="status">
          <div className="article-loading" aria-hidden="true" />
          <p>Loading story&hellip;</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (!title || (!liveArticle && !content)) {
    return (
      <div className="story-detail explorer-article">
        <SEO
          title="Story not found"
          description="Travel stories and guides from Expedition-Go Tours."
          robots="noindex, follow"
        />
        <div className="story-notfound">
          <Sparkles size={40} />
          <h1>Story not found</h1>
          <p>The story you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <div className="story-notfound-actions">
            <button className="story-notfound-btn" onClick={() => navigate('/stories')}>
              Browse all stories
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const canonical = liveArticle ? `${SITE_URL}/stories/${liveArticle.slug}` : undefined

  return (
    <div className="story-detail explorer-article">
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
        author={author}
        canonical={canonical}
        jsonLd={[
          buildArticleSchema({
            title,
            description: excerpt || `${title} - ${categoryLabel} travel story from Ghana.`,
            image: heroImage,
            url: `${SITE_URL}/stories/${slug}`,
            publishedTime: publishedISO || new Date().toISOString(),
            author,
          }),
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Stories', url: `${SITE_URL}/stories` },
            { name: title, url: `${SITE_URL}/stories/${slug}` },
          ]),
        ]}
      />

      <nav className="explorer-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link to="/stories">Stories</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{categoryLabel}</span>
      </nav>

      <header className="explorer-header">
        <span className="explorer-kicker">{categoryLabel}</span>
        <h1 className="explorer-title">{title}</h1>
        <p className="explorer-subtitle">{excerpt}</p>
        <div className="explorer-byline">
          <span>By {author}</span>
          <span className="explorer-byline-dot" aria-hidden="true" />
          {displayDate && (
            <>
              <span className="explorer-byline-date">
                <Calendar size={14} aria-hidden="true" />
                {displayDate}
              </span>
              <span className="explorer-byline-dot" aria-hidden="true" />
            </>
          )}
          <span>
            <Clock size={14} aria-hidden="true" />
            {readTime} min read
          </span>
        </div>
      </header>

      <div className="explorer-hero">
        <OptimizedImage
          src={heroImage}
          alt={title}
          width={1256}
          height={707}
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1400px) calc(100vw - 72px), 1256px"
        />
      </div>

      <main className="explorer-layout">
        <article className="explorer-article">
          <div className="article-body explorer-prose" ref={proseRef}>
            {liveArticle ? (
              <ArticleBody value={liveArticle.body} />
            ) : (
              content?.sections.map((section, i) => (
                <section key={section.heading} className="story-section">
                  <h2 className="story-section-heading">{section.heading}</h2>
                  <p className="story-section-body">{section.body}</p>
                  {i === 0 && (
                    <div className="story-highlights">
                      <h3>Highlights</h3>
                      <ul>
                        {content.highlights.map((h) => (
                          <li key={h}>
                            <ChevronRight size={15} aria-hidden="true" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {i === 1 && (
                    <blockquote className="story-quote">
                      <p>{content.quote}</p>
                    </blockquote>
                  )}
                </section>
              ))
            )}
          </div>

          {liveArticle && liveArticle.tags.length > 0 && (
            <div className="explorer-tags" aria-label="Topics">
              {liveArticle.tags.map((tag) => (
                <span key={tag.id} className="explorer-tag">
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          {relatedTours.length > 0 && (
            <section className="explorer-tours" aria-label="Related experiences">
              <h2>Related experiences</h2>
              <div className="explorer-tours-grid">
                {relatedTours.map((tour) => (
                  <a key={tour.id} href={tourHref(tour.id, tour.slug)} className="explorer-tour">
                    <div className="explorer-tour-media">
                      <OptimizedImage
                        src={tour.coverPhoto || BLOG_PLACEHOLDER_IMAGE}
                        alt={tour.title}
                        width={400}
                        sizes="(max-width: 768px) 50vw, 254px"
                      />
                    </div>
                    <span className="explorer-tour-title">{tour.title}</span>
                    <span className="explorer-tour-meta">
                      {[tour.city, tour.country].filter(Boolean).join(', ') || 'Ghana'}
                    </span>
                    {typeof tour.averageRating === 'number' && (
                      <span className="explorer-tour-rating">
                        <Star size={13} fill="currentColor" aria-hidden="true" />
                        {tour.averageRating.toFixed(1)}
                        {tour.reviewCount > 0 && ` (${tour.reviewCount})`}
                      </span>
                    )}
                    {tour.startingPrice != null && (
                      <span className="explorer-tour-price">
                        From {tour.currency || 'GHS'} {tour.startingPrice.toLocaleString()}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}

          <div className="explorer-author">
            <div className="explorer-author-avatar" aria-hidden="true">{initials(author)}</div>
            <div className="explorer-author-info">
              <span className="explorer-author-label">Written by</span>
              <span className="explorer-author-name">{author}</span>
              <p className="explorer-author-bio">
                Sharing the places, people and flavors that make every journey with
                Expedition-Go unforgettable.
              </p>
            </div>
            <button className="explorer-share" onClick={handleShare}>
              <Share2 size={16} aria-hidden="true" />
              {copied ? 'Link copied' : 'Share this story'}
            </button>
          </div>
        </article>

        <aside className="explorer-rail" aria-label="On this page">
          {headings.length > 0 && (
            <nav className="explorer-toc" aria-label="In this article">
              <h2 className="explorer-toc-title">In this article:</h2>
              <ol>
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`} onClick={(event) => jumpToHeading(event, heading.id)}>
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {relatedCards.length > 0 && (
            <div className="explorer-more">
              <h2>More travel stories</h2>
              {relatedCards.map((card) => (
                <Link key={card.id} to={card.href} className="explorer-more-card">
                  <div className="explorer-more-media">
                    <OptimizedImage src={card.image} alt="" width={100} sizes="100px" />
                  </div>
                  <div className="explorer-more-copy">
                    {card.date && <span className="explorer-more-date">{card.date}</span>}
                    <span className="explorer-more-title">{card.title}</span>
                    <span className="explorer-more-author">by {card.author}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </main>

      {relatedCards.length > 0 && (
        <section className="explorer-related">
          <div className="explorer-related-inner">
            <h2>More travel stories</h2>
            <div className="explorer-related-grid">
              {relatedCards.map((card) => (
                <Link key={card.id} to={card.href} className="explorer-related-card">
                  <div className="explorer-related-media">
                    <OptimizedImage
                      src={card.image}
                      alt={card.title}
                      width={400}
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                  <div className="explorer-related-copy">
                    {card.date && <span className="explorer-related-date">{card.date}</span>}
                    <h3>{card.title}</h3>
                    <span className="explorer-related-link">
                      Read story <ChevronRight size={14} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}

export default StoryDetailPage
