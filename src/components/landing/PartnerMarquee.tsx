import { useEffect, useRef } from 'react'

/**
 * "Trusted by" logo reel. Drifts left→to→right forever, pauses on hover.
 * Logos live in src/assets/partners/*.png (drop a file, commit, done) and
 * are tinted via .partner-logo to match the band's gray text.
 *
 * The track is rendered 4× so the wrap by one set-width is seamless even
 * on ultrawide screens. Interval-driven, not rAF (throttled panes).
 */

const found = import.meta.glob('../../assets/partners/*.{png,PNG}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const logos = Object.keys(found)
  .sort()
  .map((path) => ({
    url: found[path],
    name: path.split('/').pop()?.replace(/\.png$/i, '').replace(/[-_]/g, ' ') ?? 'Partner',
  }))

const COPIES = 4

export default function PartnerMarquee() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || logos.length === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let paused = false
    const STEP = 0.5 // px per ~16ms tick; negative direction = drift rightward

    const timer = window.setInterval(() => {
      if (paused) return
      const setWidth = el.scrollWidth / COPIES
      if (setWidth <= 0) return
      el.scrollLeft -= STEP
      if (el.scrollLeft <= 0) el.scrollLeft += setWidth
    }, 16)

    const pause = () => {
      paused = true
    }
    const resume = () => {
      paused = false
    }
    el.addEventListener('pointerenter', pause)
    el.addEventListener('pointerleave', resume)
    return () => {
      clearInterval(timer)
      el.removeEventListener('pointerenter', pause)
      el.removeEventListener('pointerleave', resume)
    }
  }, [])

  if (logos.length === 0) return null

  const items = Array.from({ length: COPIES }).flatMap(() => logos)

  return (
    <div
      className="relative"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div ref={ref} className="partner-track">
        {items.map((logo, i) => (
          <div key={i} className="partner-item">
            <img src={logo.url} alt={logo.name} title={logo.name} className="partner-logo" loading="lazy" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  )
}
