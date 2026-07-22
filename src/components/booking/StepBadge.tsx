import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface StepBadgeProps {
  number: number
  active: boolean
  completed: boolean
}

export default function StepBadge({ number, active, completed }: StepBadgeProps) {
  return (
    <motion.div
      layout
      className="relative shrink-0"
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
    >
      <motion.div
        layout
        animate={{
          scale: active ? 1 : 0.96,
          backgroundColor: completed || active ? '#179237' : 'transparent',
          borderColor: completed || active ? '#179237' : '#cbd5e1',
          color: completed || active ? '#fff' : '#94a3b8',
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 18 }}
        className={`grid size-9 place-items-center rounded-full text-sm font-bold border-2 ${
          completed || active ? 'border-[#179237]' : 'border-slate-300'
        }`}
      >
        {completed ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          >
            <Check className="size-4" />
          </motion.span>
        ) : (
          number
        )}
      </motion.div>
      {active && (
        <motion.span
          layoutId="active-ring"
          className="absolute inset-0 rounded-full border-2 border-[#179237]/30"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </motion.div>
  )
}
