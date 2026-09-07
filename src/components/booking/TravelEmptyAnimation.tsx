import { motion, useReducedMotion } from 'framer-motion'

/* ── Palette ── */
const P = {
  bg: '#ecfdf3',
  skin: '#d4a574',
  hair: '#3b2314',
  hat: '#179237',
  hatDark: '#065f46',
  shirt: '#f0fdf4',
  shirtStroke: '#86efac',
  pants: '#1e293b',
  shoes: '#334155',
  suitcase: '#fb923c',
  suitcaseDark: '#ea5e2e',
  handle: '#92400e',
  wheel: '#475569',
  scarf: '#7dd3fc',
  ground: '#86efac',
  groundDark: '#4ade80',
  cloud: '#ffffff',
  cloudStroke: '#e2e8f0',
  pin: '#ef4444',
  trail: '#bbf7d0',
  path: '#86efac',
  accent: '#179237',
  sparkle: '#fbbf24',
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const

/* ── Static fallback for prefers-reduced-motion ── */
function StaticScene() {
  return (
    <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <rect width="500" height="280" rx="16" fill={P.bg} />
      <path d="M0 230 Q125 210 250 225 Q375 240 500 218 L500 280 L0 280Z" fill={P.ground} />
      <g transform="translate(200 100)">
        <circle cx="24" cy="0" r="14" fill={P.skin} />
        <ellipse cx="24" cy="-8" rx="18" ry="6" fill={P.hat} />
        <rect x="10" y="14" width="28" height="36" rx="6" fill={P.shirt} stroke={P.shirtStroke} strokeWidth="1" />
        <rect x="14" y="50" width="10" height="24" rx="4" fill={P.pants} />
        <rect x="28" y="50" width="10" height="24" rx="4" fill={P.pants} />
      </g>
      <rect x="250" y="185" width="32" height="40" rx="5" fill={P.suitcase} />
    </svg>
  )
}

/* ── Main animated scene ── */
export default function TravelEmptyAnimation() {
  const reduce = useReducedMotion()
  if (reduce) return <StaticScene />

  return (
    <svg viewBox="0 0 500 280" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation" aria-hidden="true">
      {/* Sky */}
      <rect width="500" height="280" rx="16" fill={P.bg} />

      {/* Sun */}
      <motion.g
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2, type: 'spring' }}
      >
        <motion.g animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity, ease: EASE }}>
          <circle cx="430" cy="50" r="22" fill="#fef9c3" />
          <circle cx="430" cy="50" r="15" fill="#fef08a" />
        </motion.g>
      </motion.g>

      {/* Clouds */}
      <motion.g initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}>
        <motion.g animate={{ x: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: EASE }}>
          <ellipse cx="80" cy="48" rx="28" ry="14" fill={P.cloud} opacity="0.8" />
          <ellipse cx="62" cy="52" rx="18" ry="10" fill={P.cloud} opacity="0.8" />
          <ellipse cx="100" cy="53" rx="16" ry="9" fill={P.cloud} opacity="0.8" />
        </motion.g>
      </motion.g>

      <motion.g initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 0.6 }} transition={{ duration: 1, delay: 0.5 }}>
        <motion.g animate={{ x: [0, -6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: EASE, delay: 2 }}>
          <ellipse cx="340" cy="38" rx="22" ry="11" fill={P.cloud} opacity="0.7" />
          <ellipse cx="325" cy="42" rx="14" ry="8" fill={P.cloud} opacity="0.7" />
        </motion.g>
      </motion.g>

      {/* Hills */}
      <motion.path
        d="M0 235 Q80 215 160 230 Q260 248 360 225 Q430 210 500 225 L500 280 L0 280Z"
        fill={P.ground}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      {/* Ground path */}
      <motion.path
        d="M40 245 Q140 228 250 238 Q360 248 460 232"
        stroke={P.path}
        strokeWidth="2"
        strokeDasharray="6 4"
        fill="none"
        opacity="0.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, delay: 1.5 }}
      />

      {/* Location pins */}
      {[
        { x: 100, y: 225, d: 2.2 },
        { x: 300, y: 232, d: 2.6 },
        { x: 420, y: 222, d: 3.0 },
      ].map((p, i) => (
        <motion.g
          key={i}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: p.d, type: 'spring', stiffness: 200, damping: 12 }}
        >
          <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: EASE, delay: i * 0.4 }}>
            <path
              d={`M${p.x} ${p.y} C${p.x - 6} ${p.y - 10} ${p.x - 6} ${p.y - 20} ${p.x} ${p.y - 20} C${p.x + 6} ${p.y - 20} ${p.x + 6} ${p.y - 10} ${p.x} ${p.y}Z`}
              fill={P.pin}
            />
            <circle cx={p.x} cy={p.y - 20} r="2.5" fill="white" />
          </motion.g>
        </motion.g>
      ))}

      {/* Small airplane flyover */}
      <motion.g
        initial={{ x: -40 }}
        animate={{ x: 560 }}
        transition={{ duration: 3.5, delay: 2, ease: 'linear' }}
      >
        <g transform="translate(0 30)">
          <path d="M0 3 L10 0 L10 6Z" fill={P.accent} />
          <path d="M3 3 L7 -3 L8 2Z" fill={P.trail} opacity="0.7" />
        </g>
      </motion.g>

      {/* ═══ CHARACTER ═══ */}
      <motion.g
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.4, type: 'spring', stiffness: 80, damping: 14 }}
      >
        {/* Walking bob — entire character group */}
        <motion.g
          animate={{ y: [0, -3, 0, -3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: EASE }}
        >
          <g transform="translate(170 105)">
            {/* ── Scarf (behind body) ── */}
            <motion.path
              stroke={P.scarf}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              animate={{
                d: [
                  'M22 28 C16 34 8 32 0 38 C-6 42 -10 38 -16 42',
                  'M22 28 C18 36 10 34 4 40 C-2 44 -8 40 -12 46',
                  'M22 28 C14 36 6 30 -2 36 C-8 40 -12 36 -18 38',
                  'M22 28 C16 34 8 32 0 38 C-6 42 -10 38 -16 42',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: EASE }}
            />

            {/* ── Back leg ── */}
            <motion.g
              animate={{ rotate: [12, -8, 12] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: EASE }}
              style={{ originX: '18px', originY: '56px' }}
            >
              <path d="M18 56 L15 80 L14 86" stroke={P.pants} strokeWidth="9" strokeLinecap="round" fill="none" />
              <path d="M14 86 L8 89 L4 88" stroke={P.shoes} strokeWidth="6" strokeLinecap="round" fill="none" />
            </motion.g>

            {/* ── Torso ── */}
            <path
              d="M12 22 Q12 18 22 18 Q32 18 32 22 L34 54 Q34 58 22 58 Q10 58 10 54Z"
              fill={P.shirt}
              stroke={P.shirtStroke}
              strokeWidth="1"
            />
            {/* Collar */}
            <path d="M17 20 L22 25 L27 20" stroke={P.accent} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />

            {/* ── Front leg ── */}
            <motion.g
              animate={{ rotate: [-8, 12, -8] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: EASE }}
              style={{ originX: '28px', originY: '56px' }}
            >
              <path d="M28 56 L31 80 L32 86" stroke={P.pants} strokeWidth="10" strokeLinecap="round" fill="none" />
              <path d="M32 86 L38 89 L42 88" stroke={P.shoes} strokeWidth="6.5" strokeLinecap="round" fill="none" />
            </motion.g>

            {/* ── Back arm (swinging) ── */}
            <motion.g
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: EASE }}
              style={{ originX: '14px', originY: '26px' }}
            >
              <path d="M14 26 L6 42 L4 48" stroke={P.skin} strokeWidth="6" strokeLinecap="round" fill="none" />
              <circle cx="4" cy="48" r="3" fill={P.skin} />
            </motion.g>

            {/* ── Front arm (holding suitcase) ── */}
            <motion.g
              animate={{ rotate: [3, -3, 3] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: EASE }}
              style={{ originX: '30px', originY: '26px' }}
            >
              <path d="M30 26 L38 42 L40 50" stroke={P.skin} strokeWidth="6" strokeLinecap="round" fill="none" />
              <circle cx="40" cy="50" r="3" fill={P.skin} />
            </motion.g>

            {/* ── Head ── */}
            <rect x="18" y="10" width="8" height="10" rx="3" fill={P.skin} /> {/* neck */}
            <ellipse cx="22" cy="2" rx="13" ry="14" fill={P.skin} /> {/* head */}
            <path d="M10 -4 Q16 -12 22 -12 Q28 -12 34 -4 L34 0 Q30 -6 22 -6 Q14 -6 12 0Z" fill={P.hair} /> {/* hair */}

            {/* Sunglasses */}
            <rect x="13" y="-2" width="8" height="5.5" rx="2.5" fill="#1e293b" />
            <rect x="23" y="-2" width="8" height="5.5" rx="2.5" fill="#1e293b" />
            <path d="M21 0 L23 0" stroke="#1e293b" strokeWidth="1.5" />
            <rect x="15" y="-1" width="2.5" height="1.5" rx="0.8" fill="#94a3b8" opacity="0.4" />
            <rect x="25" y="-1" width="2.5" height="1.5" rx="0.8" fill="#94a3b8" opacity="0.4" />

            {/* Smile */}
            <path d="M17 6 Q22 10 27 6" stroke={P.hair} strokeWidth="1.2" fill="none" strokeLinecap="round" />

            {/* ── Hat ── */}
            <motion.g animate={{ rotate: [0, -1.5, 0, 1.5, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: EASE }}>
              <ellipse cx="22" cy="-8" rx="22" ry="6" fill={P.hat} />
              <path d="M12 -8 Q12 -22 22 -22 Q32 -22 32 -8" fill={P.hat} />
              <rect x="12" y="-11" width="20" height="4" rx="1" fill={P.hatDark} />
            </motion.g>
          </g>

          {/* ── SUITCASE ── */}
          <motion.g
            animate={{ rotate: [0.5, -0.5, 0.5] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: EASE }}
            style={{ originX: '218px', originY: '200px' }}
          >
            <g transform="translate(205 162)">
              {/* Handle */}
              <path d="M10 -8 L10 -14 C10 -18 22 -18 22 -14 L22 -8" stroke={P.handle} strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* Body */}
              <rect x="0" y="-8" width="32" height="38" rx="5" fill={P.suitcase} />
              <path d="M0 14 L32 14" stroke={P.suitcaseDark} strokeWidth="1.5" opacity="0.4" />
              {/* Stickers */}
              <circle cx="9" cy="2" r="4" fill={P.accent} opacity="0.7" />
              <rect x="19" y="18" width="7" height="7" rx="1.5" fill={P.scarf} opacity="0.6" />
              <circle cx="7" cy="22" r="2.5" fill={P.sparkle} opacity="0.5" />
              {/* Wheels */}
              <motion.g animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ originX: '8px', originY: '34px' }}>
                <circle cx="8" cy="34" r="4" fill={P.wheel} />
                <circle cx="8" cy="34" r="1.5" fill="#94a3b8" />
              </motion.g>
              <motion.g animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ originX: '24px', originY: '34px' }}>
                <circle cx="24" cy="34" r="4" fill={P.wheel} />
                <circle cx="24" cy="34" r="1.5" fill="#94a3b8" />
              </motion.g>
            </g>
          </motion.g>
        </motion.g>
      </motion.g>

      {/* Sparkles */}
      {[
        { x: 120, y: 110, d: 1.8, s: 3 },
        { x: 350, y: 120, d: 2.3, s: 2.5 },
        { x: 250, y: 90, d: 2.8, s: 2 },
        { x: 400, y: 100, d: 3.3, s: 2.5 },
      ].map((s, i) => (
        <motion.g
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, delay: s.d, repeat: Infinity, repeatDelay: 3.5 }}
        >
          <path
            d={`M${s.x} ${s.y - s.s} L${s.x + s.s * 0.3} ${s.y - s.s * 0.3} L${s.x + s.s} ${s.y} L${s.x + s.s * 0.3} ${s.y + s.s * 0.3} L${s.x} ${s.y + s.s} L${s.x - s.s * 0.3} ${s.y + s.s * 0.3} L${s.x - s.s} ${s.y} L${s.x - s.s * 0.3} ${s.y - s.s * 0.3}Z`}
            fill={P.sparkle}
          />
        </motion.g>
      ))}
    </svg>
  )
}
