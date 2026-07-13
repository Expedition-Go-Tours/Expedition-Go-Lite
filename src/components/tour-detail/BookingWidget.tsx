export default function BookingWidget({ tour }: { tour: any }) {
  return <div className="booking-widget-mobile">Book Now - ${tour.price}</div>
}
