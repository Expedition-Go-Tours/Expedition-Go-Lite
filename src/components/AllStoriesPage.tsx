import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { travelStories, storySlug } from './data'
import type { TravelStory } from './data'
import { useStorySearchAutocomplete } from '../hooks/useStorySearchAutocomplete'
import type { StorySuggestion } from '../hooks/useStorySearchAutocomplete'
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
  const [isFocused, setIsFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)

  const suggestions = useStorySearchAutocomplete(searchQuery)
  const showDropdown = isFocused && suggestions.length > 0 && searchQuery.trim().length >= 2

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

  const navigateToSuggestion = useCallback(
    (suggestion: StorySuggestion) => {
      navigate(`/stories/${suggestion.slug}`)
    },
    [navigate]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
      } else if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault()
          navigateToSuggestion(suggestions[highlightedIndex])
        }
      } else if (e.key === 'Escape') {
        setIsFocused(false)
        setHighlightedIndex(-1)
      }
    },
    [showDropdown, suggestions, highlightedIndex, navigateToSuggestion]
  )

  useEffect(() => {
    if (!showDropdown) setHighlightedIndex(-1)
  }, [showDropdown])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="all-stories-page">
      <Navbar />
      <div className="all-stories-hero">
        <div className="all-stories-hero-content">
          <h1 className="all-stories-title">Travel Stories & News</h1>
          <p className="all-stories-subtitle">
            Discover inspiring stories, travel tips, and updates from Expedition-Go
          </p>
          <div className="all-stories-search" ref={searchRef}>
            <Search size={18} className="all-stories-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setHighlightedIndex(-1)
              }}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search stories..."
              className="all-stories-search-input"
              autoComplete="off"
            />
            {showDropdown && (
              <div className="all-stories-autocomplete">
                {suggestions.map((suggestion, idx) => {
                  const isHighlighted = idx === highlightedIndex
                  return (
                    <div
                      key={suggestion.id}
                      className={`all-stories-autocomplete-item${isHighlighted ? ' highlighted' : ''}`}
                      onMouseDown={() => navigateToSuggestion(suggestion)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <img
                        className="all-stories-autocomplete-img"
                        src={suggestion.image}
                        alt=""
                        loading="lazy"
                      />
                      <div className="all-stories-autocomplete-text">
                        <span className="all-stories-autocomplete-title">{suggestion.title}</span>
                        <span className="all-stories-autocomplete-sub">{suggestion.subtitle}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
