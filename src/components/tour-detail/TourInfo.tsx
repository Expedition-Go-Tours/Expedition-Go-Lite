import './TourInfo.css'

interface TourInfoProps {
  duration: string
  languages: string[]
  difficulty?: 'Easy' | 'Moderate' | 'Challenging' | 'Strenuous'
  groupSize: number
}

export default function TourInfo({ duration, languages, difficulty, groupSize }: TourInfoProps) {
  const difficultyColor = {
    'Easy': '#22c55e',
    'Moderate': '#f59e0b',
    'Challenging': '#ef4444',
    'Strenuous': '#dc2626'
  }

  return (
    <section className="tour-info">
      <h2 className="tour-section-title">Tour Information</h2>
      
      <div className="tour-info-grid">
        <div className="tour-info-card">
          <div className="tour-info-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="tour-info-content">
            <span className="tour-info-label">Duration</span>
            <span className="tour-info-value">{duration}</span>
          </div>
        </div>

        <div className="tour-info-card">
          <div className="tour-info-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="tour-info-content">
            <span className="tour-info-label">Group Size</span>
            <span className="tour-info-value">Up to {groupSize} people</span>
          </div>
        </div>

        <div className="tour-info-card">
          <div className="tour-info-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div className="tour-info-content">
            <span className="tour-info-label">Languages</span>
            <div className="tour-info-languages">
              {languages.map((lang, idx) => (
                <span key={idx} className="language-badge">{lang}</span>
              ))}
            </div>
          </div>
        </div>

        {difficulty && (
          <div className="tour-info-card">
            <div className="tour-info-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="tour-info-content">
              <span className="tour-info-label">Difficulty</span>
              <span 
                className="difficulty-badge" 
                style={{ backgroundColor: `${difficultyColor[difficulty]}15`, color: difficultyColor[difficulty] }}
              >
                {difficulty}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
