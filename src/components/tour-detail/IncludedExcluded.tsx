import './IncludedExcluded.css'

interface IncludedExcludedProps {
  included: string[]
  excluded: string[]
}

export default function IncludedExcluded({ included, excluded }: IncludedExcludedProps) {
  return (
    <section className="included-excluded">
      <h2 className="tour-section-title">What's Included</h2>
      
      <div className="included-excluded-grid">
        <div className="included-section">
          <h3 className="included-excluded-subtitle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Included
          </h3>
          <ul className="included-excluded-list">
            {included.map((item, index) => (
              <li key={index} className="included-excluded-item included">
                <svg className="item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="excluded-section">
          <h3 className="included-excluded-subtitle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Excluded
          </h3>
          <ul className="included-excluded-list">
            {excluded.map((item, index) => (
              <li key={index} className="included-excluded-item excluded">
                <svg className="item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
