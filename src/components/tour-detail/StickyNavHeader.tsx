import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './StickyNavHeader.css'

interface StickyNavHeaderProps {
  show: boolean
  title: string
}

export default function StickyNavHeader({ show, title }: StickyNavHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className={`sticky-nav-header ${show ? 'visible' : ''}`}>
      <div className="sticky-nav-header-inner">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="sticky-nav-back"
          aria-label="Go back"
        >
          <ArrowLeft className="sticky-nav-back-icon" />
        </button>
        <h2 className="sticky-nav-title">{title}</h2>
      </div>
    </div>
  )
}
