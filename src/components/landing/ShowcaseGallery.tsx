import { useEffect, useRef } from 'react'

/**
 * Auto-scrolling reel of creatives produced by the pipeline. Drifts on its
 * own, pauses on hover, and is grab-scrollable with the mouse (drag) or
 * trackpad. Cards pop forward with a colored glow on hover.
 *
 * HOW TO ADD REAL CREATIVES: drop image/video files into
 *   src/assets/showcase/
 * (jpg / png / webp / gif / mp4 / webm), commit, push. They're picked up
 * automatically at build time, sorted by filename (01-…, 02-… to control
 * order). Until then the section renders styled sample cards.
 */

const found = import.meta.glob('../../assets/showcase/*.{jpg,jpeg,png,webp,gif,mp4,webm,JPG,PNG,MP4}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const files = Object.keys(found)
  .sort()
  .map((path) => ({ url: found[path], video: /\.(mp4|webm)$/i.test(path) }))

const SAMPLES = [
  { label: 'Product hero — sneaker drop', g: 'from-orange-500/50 via-rose-500/40 to-purple-600/40', glow: 'rgba(244,114,94,0.55)' },
  { label: '15s vertical cut — skincare', g: 'from-sky-500/50 via-cyan-400/40 to-emerald-500/40', glow: 'rgba(56,189,248,0.55)', video: true },
  { label: 'Campaign still — coffee brand', g: 'from-amber-500/50 via-orange-400/40 to-red-500/40', glow: 'rgba(251,146,60,0.55)' },
  { label: 'UGC demo — fitness app', g: 'from-violet-500/50 via-purple-400/40 to-fuchsia-500/40', glow: 'rgba(167,139,250,0.6)', video: true },
  { label: 'Lifestyle set — travel client', g: 'from-teal-500/50 via-emerald-400/40 to-lime-500/40', glow: 'rgba(45,212,191,0.55)' },
  { label: 'Hook test A/B — fintech', g: 'from-blue-500/50 via-indigo-400/40 to-violet-500/40', glow: 'rgba(99,102,241,0.6)', video: true },
  { label: 'Packshot series — cosmetics', g: 'from-pink-500/50 via-rose-400/40 to-orange-400/40', glow: 'rgba(244,114,182,0.55)' },
  { label: 'Launch teaser — audio gear', g: 'from-cyan-400/50 via-sky-400/40 to-indigo-500/40', glow: 'rgba(56,189,248,0.55)', video: true },
]

export default function ShowcaseGallery() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const real = files.length > 0
  // duplicate the track so scrollLeft can loop seamlessly at the halfway mark
  const items = real ? [...files, ...files] : [...SAMPLES, ...SAMPLES]

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let paused = false
    const STEP = 0.6 // px per tick (~16ms) → smooth, unaffected by rAF throttling

    const timer = window.setInterval(() => {
      if (paused) return
      el.scrollLeft += STEP
      const half = el.scrollWidth / 2
      if (el.scrollLeft >= half) el.scrollLeft -= half
    }, 16)

    const pause = () => { paused = true }
    const resume = () => { if (!dragging) paused = false }
    el.addEventListener('pointerenter', pause)
    el.addEventListener('pointerleave', resume)

    // grab-to-scroll
    let dragging = false
    let startX = 0
    let startScroll = 0
    const onDown = (e: PointerEvent) => {
      dragging = true
      paused = true
      startX = e.clientX
      startScroll = el.scrollLeft
      el.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      el.scrollLeft = startScroll - (e.clientX - startX)
    }
    const onUp = (e: PointerEvent) => {
      dragging = false
      paused = false
      try { el.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)

    return () => {
      clearInterval(timer)
      el.removeEventListener('pointerenter', pause)
      el.removeEventListener('pointerleave', resume)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [])

  return (
    <div
      className="relative"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, black 6%, black 94%, transparent)',
      }}
    >
      <div ref={scrollerRef} className="reel-scroller px-6 lg:px-8">
        {items.map((item, i) =>
          real ? (
            <div
              key={i}
              className="reel-item w-56 sm:w-72 aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-brand-900/40 select-none"
              style={{ ['--reel-glow' as string]: 'rgba(139,123,247,0.5)' }}
            >
              {(item as { video: boolean }).video ? (
                <video src={(item as { url: string }).url} className="w-full h-full object-cover pointer-events-none" autoPlay muted loop playsInline />
              ) : (
                <img src={(item as { url: string }).url} alt="Creative made with Brandscape" className="w-full h-full object-cover pointer-events-none" loading="lazy" draggable={false} />
              )}
            </div>
          ) : (
            <div
              key={i}
              className={`reel-item w-56 sm:w-72 aspect-[4/5] rounded-2xl border border-white/10 bg-gradient-to-br ${(item as (typeof SAMPLES)[number]).g} relative overflow-hidden select-none`}
              style={{ ['--reel-glow' as string]: (item as (typeof SAMPLES)[number]).glow }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_60%)]" />
              {(item as (typeof SAMPLES)[number]).video && (
                <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                  <svg className="w-4 h-4 text-white translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
              <div className="reel-item__label absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/75 to-transparent">
                <p className="text-white text-xs font-heading font-semibold">{(item as (typeof SAMPLES)[number]).label}</p>
                <p className="text-white/50 text-[9px] font-heading tracking-wider mt-0.5">SAMPLE</p>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
