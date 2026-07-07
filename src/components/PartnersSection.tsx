import { useEffect, useRef } from 'react'
import SectionHeading from './SectionHeading'
import './PartnersSection.css'

export default function PartnersSection() {
  const addedRef = useRef(false)

  useEffect(() => {
    if (addedRef.current) return
    addedRef.current = true
    const script = document.createElement('script')
    script.src = 'https://elfsightcdn.com/platform.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  return (
    <section className="partners-section">
      <div className="partners-container">
        <div className="partners-viewport">
          <SectionHeading title="Our Partners" />
          <div className="partners-widget">
            <div
              className="elfsight-app-db42c33f-bfa2-4b7d-ba19-9ca523fabbcc"
              data-elfsight-app-lazy
            />
          </div>
        </div>
      </div>
    </section>
  )
}
