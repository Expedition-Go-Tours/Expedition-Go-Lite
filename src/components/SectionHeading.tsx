import './SectionHeading.css'

interface SectionHeadingProps {
  title: string
  subtitle?: string
  viewAllLink?: string
  onScrollLeft?: () => void
  onScrollRight?: () => void
}

export default function SectionHeading({
  title,
  subtitle,
  viewAllLink,
  onScrollLeft,
  onScrollRight,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div className="section-heading-text">
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      <div className="section-heading-actions">
        {viewAllLink && (
          <a href={viewAllLink} className="section-view-all">View all</a>
        )}
        {(onScrollLeft || onScrollRight) && (
          <div className="section-arrows">
            <button className="section-arrow" onClick={onScrollLeft} aria-label="Scroll left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button className="section-arrow" onClick={onScrollRight} aria-label="Scroll right">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
