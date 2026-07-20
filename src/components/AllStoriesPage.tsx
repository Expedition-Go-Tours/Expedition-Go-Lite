import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { travelStories, storySlug } from './data'
import type { TravelStory } from './data'
import Navbar from './Navbar'
import Footer from './Footer'
import './AllStoriesPage.css'

function StoryCard({ story }: { story: TravelStory }) {
  return (
    <div className="story-card-wrap">
      <Link to={`/stories/${storySlug(story.title)}`} className="story-card">
        <div className="story-card-image">
          <img src={story.image} alt={story.title} loading="lazy" />
        </div>
        <div className="story-card-body">
          <div className="story-card-meta">
            <span className="story-card-date">{story.date}</span>
            <span className="story-card-author">{story.author}</span>
          </div>
          <h3 className="story-card-title">{story.title}</h3>
          <p className="story-card-excerpt">{story.excerpt}</p>
          <span className="story-card-link">Read more</span>
        </div>
      </Link>
    </div>
  )
}

export default function AllStoriesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredStories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return travelStories
    return travelStories.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.excerpt.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q)
    )
  }, [searchQuery])

  return (
    <div className="all-stories-page">
      <Navbar />
      <div className="all-stories-hero">
        <button onClick={() => navigate('/')} className="all-stories-back-btn" aria-label="Back to homepage">
          <ArrowLeft size={20} />
        </button>
        <div className="all-stories-hero-content">
          <h1 className="all-stories-title">Travel Stories & News</h1>
          <p className="all-stories-subtitle">
            Discover inspiring stories, travel tips, and updates from Expedition-Go
          </p>
          <div className="all-stories-search">
            <Search size={18} className="all-stories-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories..."
              className="all-stories-search-input"
            />
          </div>
        </div>
      </div>
      <div className="all-stories-container">
        <div className="all-stories-grid">
          {filteredStories.map((story, i) => (
            <StoryCard key={`${story.title}-${i}`} story={story} />
          ))}
        </div>
        {filteredStories.length === 0 && (
          <div className="all-stories-empty">
            <p>No stories match your search. Try a different keyword.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
