import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.25, 0.46, 0.45, 0.94] as const

export default function TravelEmptyAnimation() {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <svg viewBox="0 0 520 240" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
        <rect width="520" height="240" rx="16" fill="#f0fdf4" />
        <circle cx="440" cy="50" r="18" fill="#fef9c3" />
        <ellipse cx="100" cy="55" rx="35" ry="12" fill="white" opacity="0.4" />
        <ellipse cx="380" cy="45" rx="28" ry="10" fill="white" opacity="0.3" />
        <path d="M0 190 Q130 170 260 185 Q390 200 520 180 L520 240 L0 240Z" fill="#dcfce7" />
        <path d="M0 210 Q130 200 260 210 Q390 220 520 208 L520 240 L0 240Z" fill="#bbf7d0" />
        <circle cx="80" cy="195" r="12" fill="#86efac" />
        <circle cx="85" cy="190" r="8" fill="#4ade80" />
        <rect x="78" y="195" width="4" height="12" rx="1" fill="#92400e" opacity="0.5" />
        <circle cx="420" cy="198" r="8" fill="#86efac" />
        <circle cx="422" cy="194" r="6" fill="#4ade80" />
        <rect x="419" y="198" width="3" height="8" rx="1" fill="#92400e" opacity="0.5" />
        <path d="M240 120 L280 100 L255 120 L280 140Z" fill="#179237" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 520 240" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id="bkSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ecfdf3" />
          <stop offset="50%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>
        <linearGradient id="bkPlaneBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#179237" />
        </linearGradient>
        <linearGradient id="bkPlaneWing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <radialGradient id="bkSun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="60%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </radialGradient>
        <filter id="bkGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect width="520" height="240" rx="16" fill="url(#bkSky)" />

      {/* ── Sun with rays ── */}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 100 }}
      >
        <motion.g
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: EASE }}
        >
          <circle cx="440" cy="48" r="28" fill="url(#bkSun)" />
          <circle cx="440" cy="48" r="16" fill="#fef08a" />
          {/* Rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <motion.line
              key={i}
              x1={440 + Math.cos((angle * Math.PI) / 180) * 22}
              y1={48 + Math.sin((angle * Math.PI) / 180) * 22}
              x2={440 + Math.cos((angle * Math.PI) / 180) * 30}
              y2={48 + Math.sin((angle * Math.PI) / 180) * 30}
              stroke="#fef08a"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: EASE, delay: i * 0.15 }}
            />
          ))}
        </motion.g>
        {/* Outer glow ring */}
        <motion.circle
          cx="440" cy="48" r="36"
          fill="none"
          stroke="#fef9c3"
          strokeWidth="1"
          opacity="0.3"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: EASE }}
        />
      </motion.g>

      {/* ── Clouds (5 layers) ── */}
      {/* Far background clouds — very slow */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ duration: 2, delay: 0.3 }}>
        <motion.g animate={{ x: [0, 8, 0] }} transition={{ duration: 16, repeat: Infinity, ease: EASE }}>
          <ellipse cx="70" cy="38" rx="42" ry="14" fill="white" />
          <ellipse cx="48" cy="42" rx="26" ry="10" fill="white" />
          <ellipse cx="98" cy="44" rx="24" ry="9" fill="white" />
        </motion.g>
      </motion.g>

      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 2, delay: 0.5 }}>
        <motion.g animate={{ x: [0, -6, 0] }} transition={{ duration: 18, repeat: Infinity, ease: EASE, delay: 5 }}>
          <ellipse cx="320" cy="32" rx="36" ry="12" fill="white" />
          <ellipse cx="305" cy="35" rx="22" ry="8" fill="white" />
          <ellipse cx="342" cy="36" rx="18" ry="7" fill="white" />
        </motion.g>
      </motion.g>

      {/* Mid clouds */}
      <motion.g initial={{ opacity: 0, x: -10 }} animate={{ opacity: 0.4, x: 0 }} transition={{ duration: 1.2, delay: 0.5 }}>
        <motion.g animate={{ x: [0, 5, 0] }} transition={{ duration: 8, repeat: Infinity, ease: EASE }}>
          <ellipse cx="150" cy="65" rx="30" ry="11" fill="white" />
          <ellipse cx="133" cy="69" rx="20" ry="8" fill="white" />
          <ellipse cx="172" cy="70" rx="16" ry="7" fill="white" />
        </motion.g>
      </motion.g>

      <motion.g initial={{ opacity: 0, x: 10 }} animate={{ opacity: 0.3, x: 0 }} transition={{ duration: 1.2, delay: 0.8 }}>
        <motion.g animate={{ x: [0, -4, 0] }} transition={{ duration: 10, repeat: Infinity, ease: EASE, delay: 3 }}>
          <ellipse cx="370" cy="52" rx="24" ry="9" fill="white" />
          <ellipse cx="356" cy="55" rx="16" ry="7" fill="white" />
        </motion.g>
      </motion.g>

      {/* Foreground cloud — faster drift */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} transition={{ duration: 1, delay: 1 }}>
        <motion.g animate={{ x: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: EASE, delay: 1 }}>
          <ellipse cx="240" cy="135" rx="20" ry="7" fill="white" />
          <ellipse cx="228" cy="138" rx="14" ry="5" fill="white" />
        </motion.g>
      </motion.g>

      {/* ── Birds in the distance ── */}
      {[
        { x: 120, y: 50, d: 1.2, speed: 6 },
        { x: 130, y: 55, d: 1.3, speed: 6 },
        { x: 140, y: 48, d: 1.25, speed: 6 },
      ].map((bird, i) => (
        <motion.g
          key={`bird-${i}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3, x: [0, 15, 0] }}
          transition={{ opacity: { duration: 1, delay: bird.d }, x: { duration: bird.speed, repeat: Infinity, ease: EASE } }}
        >
          <motion.path
            d={`M${bird.x} ${bird.y} Q${bird.x + 3} ${bird.y - 3} ${bird.x + 6} ${bird.y} M${bird.x} ${bird.y} Q${bird.x - 3} ${bird.y - 3} ${bird.x - 6} ${bird.y}`}
            stroke="#065f46"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            animate={{ d: [
              `M${bird.x} ${bird.y} Q${bird.x + 3} ${bird.y - 3} ${bird.x + 6} ${bird.y} M${bird.x} ${bird.y} Q${bird.x - 3} ${bird.y - 3} ${bird.x - 6} ${bird.y}`,
              `M${bird.x} ${bird.y} Q${bird.x + 3} ${bird.y + 1} ${bird.x + 6} ${bird.y} M${bird.x} ${bird.y} Q${bird.x - 3} ${bird.y + 1} ${bird.x - 6} ${bird.y}`,
              `M${bird.x} ${bird.y} Q${bird.x + 3} ${bird.y - 3} ${bird.x + 6} ${bird.y} M${bird.x} ${bird.y} Q${bird.x - 3} ${bird.y - 3} ${bird.x - 6} ${bird.y}`,
            ] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: EASE, delay: i * 0.1 }}
          />
        </motion.g>
      ))}

      {/* Second bird group */}
      {[
        { x: 380, y: 40, d: 1.8, speed: 7 },
        { x: 388, y: 44, d: 1.85, speed: 7 },
      ].map((bird, i) => (
        <motion.g
          key={`bird2-${i}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2, x: [0, 12, 0] }}
          transition={{ opacity: { duration: 1, delay: bird.d }, x: { duration: bird.speed, repeat: Infinity, ease: EASE, delay: 2 } }}
        >
          <motion.path
            d={`M${bird.x} ${bird.y} Q${bird.x + 2.5} ${bird.y - 2.5} ${bird.x + 5} ${bird.y} M${bird.x} ${bird.y} Q${bird.x - 2.5} ${bird.y - 2.5} ${bird.x - 5} ${bird.y}`}
            stroke="#065f46"
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
            animate={{ d: [
              `M${bird.x} ${bird.y} Q${bird.x + 2.5} ${bird.y - 2.5} ${bird.x + 5} ${bird.y} M${bird.x} ${bird.y} Q${bird.x - 2.5} ${bird.y - 2.5} ${bird.x - 5} ${bird.y}`,
              `M${bird.x} ${bird.y} Q${bird.x + 2.5} ${bird.y + 1} ${bird.x + 5} ${bird.y} M${bird.x} ${bird.y} Q${bird.x - 2.5} ${bird.y + 1} ${bird.x - 5} ${bird.y}`,
              `M${bird.x} ${bird.y} Q${bird.x + 2.5} ${bird.y - 2.5} ${bird.x + 5} ${bird.y} M${bird.x} ${bird.y} Q${bird.x - 2.5} ${bird.y - 2.5} ${bird.x - 5} ${bird.y}`,
            ] }}
            transition={{ duration: 0.7, repeat: Infinity, ease: EASE, delay: i * 0.12 }}
          />
        </motion.g>
      ))}

      {/* ── Floating seeds / particles ── */}
      {[
        { x: 50, y: 100, d: 0.5, dx: 40, dy: -20, dur: 6 },
        { x: 180, y: 120, d: 1.0, dx: 30, dy: -25, dur: 7 },
        { x: 300, y: 90, d: 1.5, dx: 35, dy: -15, dur: 5.5 },
        { x: 450, y: 110, d: 2.0, dx: 25, dy: -30, dur: 8 },
        { x: 100, y: 150, d: 2.5, dx: 20, dy: -18, dur: 6.5 },
      ].map((p, i) => (
        <motion.g
          key={`seed-${i}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ duration: 3, delay: p.d, repeat: Infinity, repeatDelay: 2 }}
        >
          <motion.g
            animate={{ x: [0, p.dx, 0], y: [0, p.dy, 0] }}
            transition={{ duration: p.dur, repeat: Infinity, ease: EASE, delay: p.d }}
          >
            <circle cx={p.x} cy={p.y} r="1.5" fill="#86efac" />
            <line x1={p.x} y1={p.y} x2={p.x + 4} y2={p.y - 3} stroke="#86efac" strokeWidth="0.5" />
          </motion.g>
        </motion.g>
      ))}

      {/* ── Ground / hills ── */}
      <motion.path
        d="M0 200 Q60 182 130 195 Q200 208 280 188 Q370 170 440 192 Q490 205 520 192 L520 240 L0 240Z"
        fill="#dcfce7"
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      />
      <motion.path
        d="M0 212 Q80 202 160 210 Q250 218 340 206 Q420 196 520 208 L520 240 L0 240Z"
        fill="#bbf7d0"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />

      {/* ── Trees on the ground ── */}
      {/* Tree 1 - left */}
      <motion.g
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <rect x="78" y="195" width="4" height="14" rx="1.5" fill="#92400e" opacity="0.5" />
        <motion.g animate={{ scaleY: [1, 1.02, 1] }} transition={{ duration: 3, repeat: Infinity, ease: EASE }}>
          <circle cx="80" cy="190" r="12" fill="#86efac" />
          <circle cx="74" cy="194" r="8" fill="#4ade80" />
          <circle cx="88" cy="193" r="9" fill="#22c55e" opacity="0.6" />
        </motion.g>
      </motion.g>

      {/* Tree 2 - right */}
      <motion.g
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <rect x="420" y="198" width="3" height="10" rx="1" fill="#92400e" opacity="0.5" />
        <motion.g animate={{ scaleY: [1, 1.03, 1] }} transition={{ duration: 3.5, repeat: Infinity, ease: EASE, delay: 1 }}>
          <circle cx="422" cy="194" r="9" fill="#86efac" />
          <circle cx="417" cy="197" r="6" fill="#4ade80" />
          <circle cx="427" cy="196" r="7" fill="#22c55e" opacity="0.6" />
        </motion.g>
      </motion.g>

      {/* Tree 3 - small, center */}
      <motion.g
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
      >
        <rect x="270" y="192" width="2.5" height="8" rx="1" fill="#92400e" opacity="0.4" />
        <motion.g animate={{ scaleY: [1, 1.02, 1] }} transition={{ duration: 4, repeat: Infinity, ease: EASE, delay: 0.5 }}>
          <circle cx="271" cy="189" r="6" fill="#86efac" opacity="0.8" />
          <circle cx="268" cy="191" r="4" fill="#4ade80" opacity="0.7" />
        </motion.g>
      </motion.g>

      {/* Bushes */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1 }}>
        <ellipse cx="160" cy="210" rx="14" ry="6" fill="#86efac" opacity="0.5" />
        <ellipse cx="155" cy="212" rx="10" ry="4" fill="#4ade80" opacity="0.4" />
      </motion.g>
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.1 }}>
        <ellipse cx="350" cy="205" rx="12" ry="5" fill="#86efac" opacity="0.4" />
        <ellipse cx="346" cy="207" rx="8" ry="3.5" fill="#4ade80" opacity="0.35" />
      </motion.g>

      {/* ── Dotted path on the ground ── */}
      <motion.path
        d="M20 215 Q80 208 160 214 Q240 220 320 210 Q400 200 480 210 Q510 214 520 212"
        stroke="#86efac"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        fill="none"
        opacity="0.35"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, delay: 1.5 }}
      />

      {/* ── Paper plane flying across ── */}
      <motion.g
        animate={{
          x: [-80, 150, 350, 560],
          y: [130, 95, 75, 105],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
      >
        <motion.g
          animate={{ rotate: [0, -4, -7, -2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
        >
          <motion.circle
            cx="0" cy="0" r="18"
            fill="#86efac" opacity="0.12"
            filter="url(#bkGlow)"
            animate={{ scale: [1, 1.4, 1], opacity: [0.12, 0.2, 0.12] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: EASE }}
          />
          <path d="M35 0 L-20 -23 L5 0 L-20 23Z" fill="url(#bkPlaneBody)" />
          <path d="M5 0 L-15 -33 L-20 -7Z" fill="url(#bkPlaneWing)" />
          <path d="M5 0 L-15 33 L-20 7Z" fill="#16a34a" opacity="0.6" />
          <line x1="35" y1="0" x2="-20" y2="-23" stroke="#065f46" strokeWidth="0.8" opacity="0.25" />
          <line x1="2" y1="-5" x2="-12" y2="-25" stroke="#065f46" strokeWidth="0.5" opacity="0.15" />
          <path d="M2 -5 L-10 -27 L-13 -10Z" fill="white" opacity="0.15" />
          <path d="M35 0 L5 0 L-20 23Z" fill="#065f46" opacity="0.1" />
        </motion.g>
        {/* Trailing dashes */}
        {[-40, -60, -85, -115].map((offset, i) => (
          <motion.line
            key={i}
            x1={offset} y1={i * 1.5}
            x2={offset - 12} y2={i * 1.5 + 0.5}
            stroke="#86efac"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={0.35 - i * 0.07}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
          />
        ))}
      </motion.g>

      {/* ── Sparkles ── */}
      {[
        { x: 180, y: 80, d: 2.0, s: 2.5 },
        { x: 300, y: 60, d: 2.5, s: 3 },
        { x: 400, y: 95, d: 3.0, s: 2 },
        { x: 140, y: 140, d: 3.5, s: 2.5 },
        { x: 460, y: 75, d: 4.0, s: 2 },
      ].map((s, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.7, 0], scale: [0, 1, 0] }}
          transition={{ duration: 1.8, delay: s.d, repeat: Infinity, repeatDelay: 3.5 }}
        >
          <path
            d={`M${s.x} ${s.y - s.s} L${s.x + s.s * 0.3} ${s.y - s.s * 0.3} L${s.x + s.s} ${s.y} L${s.x + s.s * 0.3} ${s.y + s.s * 0.3} L${s.x} ${s.y + s.s} L${s.x - s.s * 0.3} ${s.y + s.s * 0.3} L${s.x - s.s} ${s.y} L${s.x - s.s * 0.3} ${s.y - s.s * 0.3}Z`}
            fill="#fbbf24"
          />
        </motion.g>
      ))}
    </svg>
  )
}
