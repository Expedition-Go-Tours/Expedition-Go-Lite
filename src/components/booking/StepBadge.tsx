import { Check } from 'lucide-react'

interface StepBadgeProps {
  number: number
  active: boolean
  completed: boolean
}

export default function StepBadge({ number, active, completed }: StepBadgeProps) {
  return (
    <div
      className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${
        completed || active
          ? 'bg-[#179237] text-white'
          : 'border-2 border-slate-300 text-slate-400'
      }`}
    >
      {completed ? <Check className="size-4" /> : number}
    </div>
  )
}
