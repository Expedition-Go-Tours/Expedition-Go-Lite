import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, X } from 'lucide-react'
import { useSearchAutocomplete, type SearchSuggestion } from '../hooks/useSearchAutocomplete'
import { useRecentSearches } from '../hooks/useRecentSearches'
import './SearchBar.css'

export default function SearchBar() {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isFocused, setIsFocused] = useState(false)
  const suggestions = useSearchAutocomplete(inputValue)
  const { recentSearches, addSearch, removeSearch, clearAll } = useRecentSearches()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const navigateToSuggestion = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'tour' && suggestion.slug) {
      addSearch({ slug: suggestion.slug, title: suggestion.title, type: 'tour' })
    }
    setShowDropdown(false)
    setInputValue('')
    setHighlightedIndex(-1)
    if (suggestion.type === 'tour' && suggestion.slug) {
      navigate(`/tour/${suggestion.slug}`)
    }
  }, [navigate, addSearch])

  const navigateToRecent = useCallback((item: { slug: string; title: string; type: 'destination' | 'tour' }) => {
    setShowDropdown(false)
    setInputValue('')
    setHighlightedIndex(-1)
    setIsFocused(false)
    inputRef.current?.blur()
    if (item.type === 'tour' && item.slug) {
      navigate(`/tour/${item.slug}`)
    }
  }, [navigate])

  const navigateToBestMatch = useCallback(() => {
    setShowDropdown(false)
    setInputValue('')
    setHighlightedIndex(-1)

    const q = inputValue.trim().toLowerCase()
    if (!q) return

    for (const s of suggestions) {
      if (s.type === 'tour' && s.slug) {
        addSearch({ slug: s.slug, title: s.title, type: 'tour' })
        navigate(`/tour/${s.slug}`)
        return
      }
    }
  }, [inputValue, suggestions, navigate, addSearch])

  useEffect(() => {
    if (suggestions.length > 0 && inputValue.trim().length >= 2) {
      setShowDropdown(true)
      setHighlightedIndex(-1)
    } else {
      setShowDropdown(false)
      setHighlightedIndex(-1)
    }
  }, [suggestions, inputValue])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault()
        setShowDropdown(true)
        setHighlightedIndex(0)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          navigateToSuggestion(suggestions[highlightedIndex])
        } else {
          navigateToBestMatch()
        }
        break
      case 'Tab':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault()
          navigateToSuggestion(suggestions[highlightedIndex])
        } else {
          setShowDropdown(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      navigateToSuggestion(suggestions[highlightedIndex])
    } else {
      navigateToBestMatch()
    }
  }

  return (
    <div className="hero-search-wrap" ref={containerRef}>
      <form className="hero-search-form" onSubmit={handleSubmit}>
        <div id="hero-search-bar" className="hero-search-bar">
          <div className="hero-search-input-wrap">
            <svg className="hero-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div className="hero-search-input-inner">
              <input
                ref={inputRef}
                type="text"
                className="hero-search-input"
                placeholder="Search destinations..."
                autoComplete="off"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setIsFocused(true)
                  if (suggestions.length > 0 && inputValue.trim().length >= 2) {
                    setShowDropdown(true)
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setIsFocused(false), 200)
                }}
              />
            </div>
          </div>
          <div className="hero-search-btn-wrap">
            <button type="submit" className="hero-search-submit">Search</button>
          </div>
        </div>

        {(isFocused && recentSearches.length > 0) || (showDropdown && suggestions.length > 0) ? (
          <div className="search-dropdown">
            {isFocused && recentSearches.length > 0 && (
              <>
                <div className="search-dropdown-section">Recent Searches</div>
                {recentSearches.map((item) => (
                  <div
                    key={item.slug}
                    className="search-recent-item"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      navigateToRecent(item)
                    }}
                  >
                    <div className="search-suggestion-icon">
                      <Clock size={16} />
                    </div>
                    <div className="search-suggestion-text">
                      <span className="search-suggestion-title">{item.title}</span>
                      <span className="search-suggestion-sub">{item.type === 'destination' ? 'Destination' : 'Tour'}</span>
                    </div>
                    <button
                      type="button"
                      className="search-recent-remove"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeSearch(item.slug)
                      }}
                      aria-label="Remove from recent searches"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="search-recent-clear" onMouseDown={(e) => { e.preventDefault(); clearAll() }}>
                  Clear recent searches
                </div>
                {showDropdown && suggestions.length > 0 && <div className="search-recent-divider" />}
              </>
            )}
            {showDropdown && suggestions.length > 0 && (
              <>
                {suggestions.map((suggestion, idx) => {
                  const isHighlighted = idx === highlightedIndex
                  const showDestHeader = suggestion.type === 'destination' && (idx === 0 || suggestions[idx - 1]?.type !== 'destination')
                  const showTourHeader = suggestion.type === 'tour' && (idx === 0 || suggestions[idx - 1]?.type !== 'tour')

                  return (
                    <div key={suggestion.id}>
                      {showDestHeader && (
                        <div className="search-dropdown-section">Destinations</div>
                      )}
                      {showTourHeader && (
                        <div className="search-dropdown-section">Tours &amp; Experiences</div>
                      )}
                      <div
                        className={`search-suggestion${isHighlighted ? ' highlighted' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          navigateToSuggestion(suggestion)
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                      >
                        {suggestion.type === 'destination' ? (
                          <>
                            <div className="search-suggestion-icon">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                            </div>
                            <div className="search-suggestion-text">
                              <span className="search-suggestion-title">{suggestion.title}</span>
                              <span className="search-suggestion-sub">{suggestion.subtitle}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="search-suggestion-img">
                              <img src={suggestion.image} alt="" loading="lazy" />
                            </div>
                            <div className="search-suggestion-text">
                              <span className="search-suggestion-title">{suggestion.title}</span>
                              <span className="search-suggestion-sub">{suggestion.subtitle}</span>
                            </div>
                            <span className="search-suggestion-price">{suggestion.price}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        ) : null}
      </form>
    </div>
  )
}
