import { useState } from 'react'

type MediaType = 'all' | 'image' | 'video' | 'audio'

export default function LibraryPage() {
  const [filter, setFilter] = useState<MediaType>('all')
  const [search, setSearch] = useState('')

  const assets = [
    { id: '1', type: 'image' as const, name: 'Hero Shot — Nike Summer v3', project: 'Nike — Summer Campaign', status: 'completed' as const, date: '2h ago', size: '4K', format: 'PNG' },
    { id: '2', type: 'video' as const, name: 'A-Roll — Lifestyle Scene 1', project: 'Nike — Summer Campaign', status: 'completed' as const, date: '3h ago', size: '30s', format: 'MP4' },
    { id: '3', type: 'video' as const, name: 'B-Roll — Product Detail Close-up', project: 'Nike — Summer Campaign', status: 'generating' as const, date: 'In progress', size: '5s', format: 'MP4' },
    { id: '4', type: 'image' as const, name: 'Brand Logo Treatment — Dark BG', project: 'Spotify — Brand Redesign', status: 'completed' as const, date: '1d ago', size: '4K', format: 'PNG' },
    { id: '5', type: 'audio' as const, name: 'Voiceover — Script 1 (Male, Warm)', project: 'Nike — Summer Campaign', status: 'completed' as const, date: '4h ago', size: '45s', format: 'WAV' },
    { id: '6', type: 'image' as const, name: 'Social Creative A — 1:1 Format', project: 'Adidas — Holiday Ads', status: 'completed' as const, date: '5h ago', size: '1080px', format: 'JPG' },
    { id: '7', type: 'video' as const, name: 'Final Cut — Hero Video 30s', project: 'Nike — Summer Campaign', status: 'generating' as const, date: 'Rendering...', size: '30s', format: 'MP4' },
    { id: '8', type: 'audio' as const, name: 'Music — Sunrise Drive (Licensed)', project: 'Nike — Summer Campaign', status: 'completed' as const, date: '6h ago', size: '2:30', format: 'MP3' },
    { id: '9', type: 'image' as const, name: 'Social Creative B — 9:16 Story', project: 'Adidas — Holiday Ads', status: 'completed' as const, date: '6h ago', size: '1080x1920', format: 'JPG' },
  ]

  const filtered = assets.filter((a) => {
    if (filter !== 'all' && a.type !== filter) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.project.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const typeConfig: Record<string, { icon: string; bg: string; bgGen: string }> = {
    image: {
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      bg: 'bg-gradient-to-br from-blue-600/10 to-purple-600/10',
      bgGen: 'bg-gradient-to-br from-blue-600/20 to-purple-600/20',
    },
    video: {
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      bg: 'bg-gradient-to-br from-red-600/10 to-orange-600/10',
      bgGen: 'bg-gradient-to-br from-red-600/20 to-orange-600/20',
    },
    audio: {
      icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
      bg: 'bg-gradient-to-br from-green-600/10 to-emerald-600/10',
      bgGen: 'bg-gradient-to-br from-green-600/20 to-emerald-600/20',
    },
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-2xl">Media Library</h1>
          <p className="text-brand-500 text-sm font-body mt-1">
            {assets.length} assets across all projects.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* Filters */}
        <div className="flex items-center gap-1 bg-brand-900/30 rounded-xl p-1 border border-white/5">
          {(['all', 'image', 'video', 'audio'] as MediaType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-xs font-heading tracking-wide transition-all duration-200 ${
                filter === type
                  ? 'bg-white text-black font-bold'
                  : 'text-brand-500 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All Assets' : type === 'image' ? 'Images' : type === 'video' ? 'Videos' : 'Audio'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-10 pr-4 py-2.5 bg-brand-900/30 border border-white/5 rounded-xl text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Assets Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((asset) => {
            const config = typeConfig[asset.type]
            return (
              <div
                key={asset.id}
                className="bg-brand-900/20 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300 group"
              >
                {/* Preview Area */}
                <div className={`aspect-video ${config.bg} flex items-center justify-center relative`}>
                  <svg className="w-10 h-10 text-white/10 group-hover:text-white/20 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={config.icon} />
                  </svg>

                  {asset.status === 'generating' && (
                    <div className="absolute inset-0 bg-brand-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span className="text-brand-300 text-xs font-heading tracking-wide">GENERATING</span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  {asset.status === 'completed' && (
                    <div className="absolute inset-0 bg-brand-950/0 group-hover:bg-brand-950/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button className="px-5 py-2.5 bg-white text-black font-heading font-bold text-xs tracking-wide rounded-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        DOWNLOAD
                      </button>
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-heading font-bold tracking-wider ${config.bgGen} text-white/60 border border-white/5`}>
                      {asset.format}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-heading font-semibold text-sm text-white truncate group-hover:text-brand-200 transition-colors">
                    {asset.name}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-brand-600 text-xs font-body truncate max-w-[60%]">{asset.project}</span>
                    <span className="text-brand-700 text-[10px] font-heading">{asset.size}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.03]">
                    <span className={`text-[10px] font-heading tracking-wider flex items-center gap-1.5 ${
                      asset.status === 'completed' ? 'text-green-500/80' : 'text-blue-400'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        asset.status === 'completed' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                      }`} />
                      {asset.status === 'completed' ? 'READY' : 'GENERATING'}
                    </span>
                    <span className="text-brand-700 text-[10px] font-body">{asset.date}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand-900/50 border border-white/5 flex items-center justify-center">
            <svg className="w-7 h-7 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-brand-400 font-heading text-sm mb-1">No assets found</p>
          <p className="text-brand-700 font-body text-xs">Try adjusting your filters or search query</p>
        </div>
      )}
    </div>
  )
}
