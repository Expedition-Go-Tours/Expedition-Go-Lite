import './TourOverview.css'

interface TourOverviewProps {
  description: string
}

export default function TourOverview({ description }: TourOverviewProps) {
  const paragraphs = description.split('\n\n')

  return (
    <section className="tour-overview">
      <h2 className="tour-section-title">About this tour</h2>
      <div className="tour-overview-content">
        {paragraphs.map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
      </div>
    </section>
  )
}
