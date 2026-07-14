import { useEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * Brandscape mark rendered as brushed metal: a soft white glow, a subtle
 * idle float, and a cursor-reactive specular highlight that sweeps across
 * the logo while it gravitates a few pixels toward the pointer. Pure
 * CSS/JS, no dependencies. Falls back to a still glowing logo where the
 * pointer never comes near (e.g. touch devices).
 */
export default function MetalLogo({
  src = '/logo-transparent.png',
  heightClass = 'h-20',
  className = '',
}: {
  src?: string
  heightClass?: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({})
  const [active, setActive] = useState(false)

  useEffect(() => {
    const RADIUS = 280 // px proximity at which the metal "wakes up"
    let raf = 0

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dx = e.clientX - cx
        const dy = e.clientY - cy
        const dist = Math.hypot(dx, dy)

        if (dist < RADIUS) {
          const pull = Math.max(0, 1 - dist / RADIUS) // 0 (far) → 1 (over)
          const mx = ((e.clientX - r.left) / r.width) * 100
          const my = ((e.clientY - r.top) / r.height) * 100
          setActive(true)
          setStyle({
            '--mx': `${mx}%`,
            '--my': `${my}%`,
            '--pull': pull.toFixed(3),
            transform: `translate(${(dx / RADIUS) * 12 * pull}px, ${(dy / RADIUS) * 12 * pull}px)`,
          } as CSSProperties)
        } else {
          setActive(false)
          setStyle({ transform: 'translate(0px, 0px)' })
        }
      })
    }

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} className={`metal-logo ${active ? 'is-active' : ''} ${className}`} style={style}>
      <img src={src} alt="Brandscape" className={`metal-logo__base ${heightClass} w-auto`} />
      <span className="metal-logo__sheen" style={{ ['--logo' as string]: `url(${src})` } as CSSProperties} />
    </div>
  )
}
