import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { travelStories } from './data'
import type { TravelStory } from './data'
import Navbar from './Navbar'
import Footer from './Footer'
import './AllStoriesPage.css'

function StoryCard({ story }: { story: TravelStory }) {
  return (
    <div className="story-card-wrap">
      <a href={story.link} className="story-card" target="_blank" rel="noopener noreferrer">
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
      </a>
    </div>
  )
}

export default function AllStoriesPage() {
  const navigate = useNavigate()

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
        </div>
      </div>
      <div className="all-stories-container">
        <div className="all-stories-grid">
          {travelStories.map((story, i) => (
            <StoryCard key={`${story.title}-${i}`} story={story} />
          ))}
        </div>
        {travelStories.length === 0 && (
          <div className="all-stories-empty">
            <p>No stories yet. Check back soon!</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
