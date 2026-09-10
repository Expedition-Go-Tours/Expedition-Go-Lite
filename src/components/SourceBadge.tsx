interface SourceBadgeProps {
  source: string
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  if (source === 'TRIPADVISOR') {
    return (
      <span className="ext-source-badge ext-source-badge--tripadvisor">
        <svg className="ext-source-badge__icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="32" fill="#34E0A1" />
          <g transform="translate(10, 14)">
            {/* Left eye */}
            <circle cx="10" cy="14" r="8" fill="#000" />
            <circle cx="10" cy="14" r="5" fill="#34E0A1" />
            <circle cx="10" cy="14" r="2.5" fill="#000" />
            {/* Right eye */}
            <circle cx="34" cy="14" r="8" fill="#000" />
            <circle cx="34" cy="14" r="5" fill="#34E0A1" />
            <circle cx="34" cy="14" r="2.5" fill="#000" />
            {/* Beak */}
            <path d="M22 18 L20 24 L24 24 Z" fill="#000" />
            {/* Ears/tufts */}
            <path d="M4 8 L8 2 L12 8" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M32 8 L36 2 L40 8" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
            {/* Head outline */}
            <path d="M4 8 Q4 28 22 28 Q40 28 40 8" fill="none" stroke="#000" strokeWidth="2" />
          </g>
        </svg>
        <span className="ext-source-badge__text">TripAdvisor</span>
      </span>
    )
  }

  if (source === 'GETYOURGUIDE') {
    return (
      <span className="ext-source-badge ext-source-badge--gyg">
        <svg className="ext-source-badge__icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="8" fill="#E63C2F" />
          <text x="32" y="28" textAnchor="middle" fill="#fff" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="16" letterSpacing="-0.5">GET</text>
          <text x="32" y="44" textAnchor="middle" fill="#fff" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="16" letterSpacing="-0.5">YOUR</text>
          <text x="32" y="58" textAnchor="middle" fill="#fff" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="13" letterSpacing="-0.5">GUIDE</text>
        </svg>
        <span className="ext-source-badge__text">GetYourGuide</span>
      </span>
    )
  }

  return null
}
