import './SearchBar.css'

export default function SearchBar() {
  return (
    <div className="hero-search-wrap">
      <form className="hero-search-form" onSubmit={(e) => e.preventDefault()}>
        <div id="hero-search-bar" className="hero-search-bar">
          <div className="hero-search-input-wrap">
            <svg className="hero-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div className="hero-search-input-inner">
              <input
                type="text"
                className="hero-search-input"
                placeholder="Search destinations..."
                autoComplete="off"
              />
            </div>
          </div>
          <div className="hero-search-btn-wrap">
            <button type="submit" className="hero-search-submit">Search</button>
          </div>
        </div>
      </form>
    </div>
  )
}
