import './TourGuideCard.css'

interface TourGuideCardProps {
  name: string
  memberSince: string
  avatar: string
}

export default function TourGuideCard({ name, memberSince, avatar }: TourGuideCardProps) {
  return (
    <div className="tour-guide-card">
      <div className="tour-guide-avatar-wrapper">
        <img 
          src={avatar} 
          alt={name}
          className="tour-guide-avatar"
        />
      </div>
      
      <h3 className="tour-guide-name">{name}</h3>
      
      <p className="tour-guide-since">Member Since {memberSince}</p>
      
      <button className="tour-guide-question-btn">
        Ask a Question
      </button>
    </div>
  )
}
