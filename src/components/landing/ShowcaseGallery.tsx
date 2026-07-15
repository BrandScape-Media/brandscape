/**
 * Auto-scrolling reel of creatives produced by the pipeline.
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
  { label: 'Product hero — sneaker drop', g: 'from-orange-500/40 via-rose-500/30 to-purple-600/30' },
  { label: '15s vertical cut — skincare', g: 'from-sky-500/40 via-cyan-400/30 to-emerald-500/30', video: true },
  { label: 'Campaign still — coffee brand', g: 'from-amber-500/40 via-orange-400/30 to-red-500/30' },
  { label: 'UGC-style demo — fitness app', g: 'from-violet-500/40 via-purple-400/30 to-fuchsia-500/30', video: true },
  { label: 'Lifestyle set — travel client', g: 'from-teal-500/40 via-emerald-400/30 to-lime-500/30' },
  { label: 'Hook test A/B — fintech', g: 'from-blue-500/40 via-indigo-400/30 to-violet-500/30', video: true },
  { label: 'Packshot series — cosmetics', g: 'from-pink-500/40 via-rose-400/30 to-orange-400/30' },
  { label: 'Launch teaser — audio gear', g: 'from-slate-400/40 via-zinc-400/30 to-stone-500/30', video: true },
]

export default function ShowcaseGallery() {
  const real = files.length > 0
  // duplicate the track so the -50% translate loops seamlessly
  const items = real ? [...files, ...files] : [...SAMPLES, ...SAMPLES]

  return (
    <div className="relative overflow-hidden py-2" style={{ maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)' }}>
      <div className="marquee">
        {items.map((item, i) =>
          real ? (
            <div key={i} className="w-56 sm:w-72 aspect-[4/5] flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-brand-900/40">
              {(item as { video: boolean }).video ? (
                <video
                  src={(item as { url: string }).url}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img src={(item as { url: string }).url} alt="Creative made with Brandscape" className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>
          ) : (
            <div
              key={i}
              className={`w-56 sm:w-72 aspect-[4/5] flex-shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br ${(item as (typeof SAMPLES)[number]).g} relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_60%)]" />
              {(item as (typeof SAMPLES)[number]).video && (
                <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white/90 text-xs font-heading font-semibold">{(item as (typeof SAMPLES)[number]).label}</p>
                <p className="text-white/40 text-[9px] font-heading tracking-wider mt-0.5">SAMPLE</p>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
