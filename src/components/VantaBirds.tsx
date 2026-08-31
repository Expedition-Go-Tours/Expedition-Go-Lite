import { useEffect, useRef } from 'react'

interface VantaBirdsProps {
  className?: string
  options?: Record<string, unknown>
}

export default function VantaBirds({ className, options }: VantaBirdsProps) {
  const ref = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const effectRef = useRef<any>(null)

  useEffect(() => {
    if (!ref.current) return

    let cancelled = false

    import('vanta/dist/vanta.birds.min.js').then((mod) => {
      if (cancelled || !ref.current) return
      const BIRDS = mod.default || mod.BIRDS
      effectRef.current = BIRDS({
        el: ref.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
        ...options,
      })
    })

    return () => {
      cancelled = true
      effectRef.current?.destroy()
      effectRef.current = null
    }
  }, [options])

  return <div ref={ref} className={className} style={{ width: '100%', height: '100%' }} />
}
