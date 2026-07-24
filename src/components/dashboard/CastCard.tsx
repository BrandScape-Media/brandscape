import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listInfluencersForAgency, setProjectCast, type AgencyInfluencer } from '../../lib/orchestrator'

/**
 * The campaign's cast on the project page: shows who's bound to perform the
 * videos, and lets the agency pin/override it (or hand it back to the AI).
 * Mirrors the Discovery pin — the shoot plan fills it if left to the AI.
 */
export default function CastCard({
  projectId,
  influencerId,
  onChanged,
}: {
  projectId: string
  influencerId: string | null | undefined
  onChanged: () => void
}) {
  const { demoMode } = useAuth()
  const [roster, setRoster] = useState<AgencyInfluencer[]>([])
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // roster filters — the library grows past what fits in a 3-up grid fast
  const [genderF, setGenderF] = useState('all')
  const [ageF, setAgeF] = useState('all')
  const [tagF, setTagF] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (demoMode) return
    listInfluencersForAgency().then(setRoster).catch(() => undefined)
  }, [demoMode])

  const current = roster.find((i) => i.id === influencerId) ?? null

  const genders = useMemo(() => [...new Set(roster.map((i) => i.gender))].sort(), [roster])
  const ages = useMemo(() => [...new Set(roster.map((i) => i.age_bracket).filter(Boolean))].sort(), [roster])
  const tags = useMemo(
    () => [...new Set(roster.flatMap((i) => i.tags ?? []).map((t) => t.toLowerCase()))].sort(),
    [roster],
  )

  const shown = useMemo(
    () =>
      roster.filter((i) => {
        if (genderF !== 'all' && i.gender !== genderF) return false
        if (ageF !== 'all' && i.age_bracket !== ageF) return false
        if (tagF !== 'all' && !(i.tags ?? []).some((t) => t.toLowerCase() === tagF)) return false
        if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [roster, genderF, ageF, tagF, search],
  )

  const filtersOn = genderF !== 'all' || ageF !== 'all' || tagF !== 'all' || !!search
  const clearFilters = () => {
    setGenderF('all')
    setAgeF('all')
    setTagF('all')
    setSearch('')
  }
  const selectCls =
    'flex-1 min-w-0 px-2 py-1.5 bg-brand-900 border border-white/10 rounded-lg text-brand-300 font-body text-[11px] focus:outline-none focus:border-white/30 transition-colors'

  const choose = async (id: string | null) => {
    setBusy(true)
    setError(null)
    try {
      await setProjectCast(projectId, id)
      setPicking(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the cast')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-brand-900/30 border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">CAST</h3>
        {!demoMode && (
          <button
            onClick={() => setPicking((p) => !p)}
            className="text-[10px] font-heading tracking-wide text-brand-500 hover:text-white transition-colors"
          >
            {picking ? 'CLOSE' : 'CHANGE'}
          </button>
        )}
      </div>

      {/* Current binding */}
      <div className="flex items-center gap-3">
        {influencerId && current?.primary_url ? (
          <img src={current.primary_url} alt={current.name} className="w-11 h-14 rounded-lg object-cover" />
        ) : (
          <div className="w-11 h-14 rounded-lg bg-brand-900 flex items-center justify-center text-lg">
            {influencerId ? '🎭' : '✨'}
          </div>
        )}
        <div className="min-w-0">
          {influencerId ? (
            <>
              <p className="font-heading font-semibold text-sm text-white truncate">{current?.name ?? 'Cast persona'}</p>
              <p className="text-brand-600 text-[11px] font-body truncate">
                {current ? `${current.gender} · ${current.age_bracket}` : 'pinned'}
                {current?.voice_name ? ` · 🎙 ${current.voice_name}` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="font-heading font-semibold text-sm text-white">AI will cast</p>
              <p className="text-brand-600 text-[11px] font-body">Chosen at the shoot plan, from your brief</p>
            </>
          )}
        </div>
      </div>

      {/* Picker */}
      {picking && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          {roster.length === 0 ? (
            <p className="text-brand-600 text-[11px] font-body">No influencers available yet.</p>
          ) : (
            <>
            {/* Filters — narrow the roster down to the right look */}
            <div className="space-y-2 mb-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full px-2.5 py-1.5 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-[11px] placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
              />
              <div className="flex items-center gap-1.5">
                <select value={genderF} onChange={(e) => setGenderF(e.target.value)} className={selectCls}>
                  <option value="all">Any gender</option>
                  {genders.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={ageF} onChange={(e) => setAgeF(e.target.value)} className={selectCls}>
                  <option value="all">Any age</option>
                  {ages.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                {tags.length > 0 && (
                  <select value={tagF} onChange={(e) => setTagF(e.target.value)} className={selectCls}>
                    <option value="all">Any tag</option>
                    {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-600 text-[10px] font-body">
                  {shown.length} of {roster.length} {roster.length === 1 ? 'persona' : 'personas'}
                </span>
                {filtersOn && (
                  <button onClick={clearFilters} className="text-brand-500 hover:text-white text-[10px] font-heading tracking-wide transition-colors">
                    CLEAR
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => choose(null)}
                disabled={busy}
                className={`rounded-lg border-2 p-1.5 text-center transition-all disabled:opacity-40 ${
                  !influencerId ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div className="w-full aspect-[3/4] rounded bg-brand-900 flex items-center justify-center text-base">✨</div>
                <span className="block text-[9px] font-heading text-brand-300 mt-1">AI decides</span>
              </button>
              {shown.map((inf) => (
                <button
                  key={inf.id}
                  onClick={() => choose(inf.id)}
                  disabled={busy}
                  title={`${inf.gender} · ${inf.age_bracket}${inf.voice_name ? ` · 🎙 ${inf.voice_name}` : ''}`}
                  className={`rounded-lg border-2 p-1.5 text-center transition-all disabled:opacity-40 ${
                    influencerId === inf.id ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  {inf.primary_url ? (
                    <img src={inf.primary_url} alt={inf.name} className="w-full aspect-[3/4] rounded object-cover" />
                  ) : (
                    <div className="w-full aspect-[3/4] rounded bg-brand-900" />
                  )}
                  <span className="block text-[9px] font-heading text-brand-300 mt-1 truncate">{inf.name}</span>
                </button>
              ))}
            </div>
            {shown.length === 0 && (
              <p className="text-brand-600 text-[11px] font-body mt-3">No persona matches these filters.</p>
            )}
            </>
          )}
          {error && <p className="text-red-400 text-[11px] font-body mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
}
