import { useCurrency } from '../contexts/CurrencyContext'

interface FormattedPriceProps {
  usdPrice: number
  className?: string
}

export default function FormattedPrice({ usdPrice, className }: FormattedPriceProps) {
  const { formatPrice, loading } = useCurrency()

  if (loading) {
    return <span className={className}>${usdPrice.toLocaleString()}</span>
  }

  return <span className={className}>{formatPrice(usdPrice)}</span>
}
