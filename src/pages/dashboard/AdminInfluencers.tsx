import { useEffect, useRef, useState } from 'react'
import {
  adminListInfluencers,
  adminCreateInfluencer,
  adminUpdateInfluencer,
  adminDeleteInfluencer,
  adminUploadInfluencerImage,
  adminSetPrimaryInfluencerImage,
  adminDeleteInfluencerImage,
  adminListVoices,
  type Influencer,
  type InfluencerGender,
  type InfluencerAgeBracket,
  type TtsVoice,
} from '../../lib/orchestrator'
import { timeAgo } from '../../lib/format'

/**
 * Curated influencer library — the cast of the media pipeline. Each
 * persona pairs reference images (same face, different looks) with ONE
 * ElevenLabs voice, so picking the influencer picks the voice. Voices stay
 * editable while the library is being curated.
 */

const AGE_BRACKETS: InfluencerAgeBracket[] = ['18-25', '26-35', '36-50', '50+']

export default function AdminInfluencers() {
  const [influencers, setInfluencers] = useState<Influencer[] | null>(null)
  const [voices, setVoices] = useState<TtsVoice[]>([])
  const [voicesConfigured, setVoicesConfigured] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Influencer | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminListInfluencers()
      .then(setInfluencers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the influencer library'))
    adminListVoices()
      .then((res) => {
        setVoices(res.voices)
        setVoicesConfigured(res.configured)
      })
      .catch(() => setVoicesConfigured(false))
  }, [])

  const replace = (inf: Influencer) => {
    setInfluencers((list) => (list ?? []).map((x) => (x.id === inf.id ? inf : x)))
    setSelected((cur) => (cur?.id === inf.id ? inf : cur))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading font-semibold text-sm text-white">Influencer Library</h2>
          <p className="text-brand-600 text-xs font-body mt-0.5">
            Each persona = reference images + one fixed voice. Picking the influencer picks the voice.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2.5 bg-white text-black font-heading font-bold text-[11px] tracking-wide rounded-lg hover:bg-brand-200 transition-colors"
        >
          + NEW INFLUENCER
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg flex items-center justify-between gap-4">
          <p className="text-red-400 text-xs font-body">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500/60 hover:text-red-400 text-xs font-heading">✕</button>
        </div>
      )}
      {!voicesConfigured && (
        <div className="mb-4 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
          <p className="text-amber-300/90 text-xs font-body">
            Voice list unavailable (ElevenLabs not reachable) — you can still create influencers and assign voices later.
          </p>
        </div>
      )}

      {influencers === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] bg-brand-900/20 border border-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : influencers.length === 0 ? (
        <div className="text-center py-16 bg-brand-900/20 border border-white/5 rounded-xl">
          <p className="text-brand-400 font-heading text-sm mb-1">No influencers yet</p>
          <p className="text-brand-700 font-body text-xs">
            Create your first persona, upload their reference photos, and pin a voice to them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {influencers.map((inf) => {
            const primary = inf.images.find((i) => i.is_primary) ?? inf.images[0]
            return (
              <button
                key={inf.id}
                onClick={() => setSelected(inf)}
                className={`text-left bg-brand-900/20 border rounded-xl overflow-hidden transition-all duration-300 group ${
                  inf.active ? 'border-white/5 hover:border-white/20' : 'border-white/5 opacity-50'
                }`}
              >
                <div className="aspect-[3/4] bg-brand-900/50 relative">
                  {primary?.view_url ? (
                    <img src={primary.view_url} alt={inf.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-brand-700 text-[10px] font-heading tracking-wider">NO PHOTO</span>
                    </div>
                  )}
                  {!inf.active && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-brand-950/80 text-brand-400 text-[9px] font-heading tracking-wider">
                      INACTIVE
                    </span>
                  )}
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-brand-950/80 text-brand-300 text-[9px] font-heading">
                    {inf.images.length} photo{inf.images.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-heading font-semibold text-sm text-white truncate group-hover:text-brand-200">{inf.name}</p>
                  <p className="text-brand-600 text-[11px] font-body mt-0.5">
                    {inf.gender} · {inf.age_bracket}
                  </p>
                  <p className={`text-[11px] font-body mt-1 truncate ${inf.voice_name ? 'text-violet-300/80' : 'text-amber-400/70'}`}>
                    {inf.voice_name ? `🎙 ${inf.voice_name}` : 'No voice yet'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {creating && (
        <CreateDialog
          voices={voices}
          onClose={() => setCreating(false)}
          onCreated={(inf) => {
            setInfluencers((list) => [inf, ...(list ?? [])])
            setCreating(false)
            setSelected(inf)
          }}
        />
      )}

      {selected && (
        <DetailDialog
          influencer={selected}
          voices={voices}
          onClose={() => setSelected(null)}
          onChanged={replace}
          onDeleted={(id) => {
            setInfluencers((list) => (list ?? []).filter((x) => x.id !== id))
            setSelected(null)
          }}
          onError={setError}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2.5 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors'

function VoiceSelect({
  voices,
  value,
  onChange,
}: {
  voices: TtsVoice[]
  value: string
  onChange: (voiceId: string) => void
}) {
  const playing = useRef<HTMLAudioElement | null>(null)
  const preview = voices.find((v) => v.voice_id === value)?.preview_url

  const playPreview = () => {
    if (!preview) return
    playing.current?.pause()
    playing.current = new Audio(preview)
    playing.current.play().catch(() => undefined)
  }

  return (
    <div className="flex gap-2">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">— no voice yet —</option>
        {voices.map((v) => (
          <option key={v.voice_id} value={v.voice_id}>
            {v.name}
            {v.category ? ` (${v.category})` : ''}
          </option>
        ))}
      </select>
      {preview && (
        <button
          type="button"
          onClick={playPreview}
          title="Play voice preview"
          className="shrink-0 px-3 rounded-lg border border-white/10 text-brand-300 hover:text-white hover:border-white/30 text-xs font-heading transition-colors"
        >
          ▶
        </button>
      )}
    </div>
  )
}

function CreateDialog({
  voices,
  onClose,
  onCreated,
}: {
  voices: TtsVoice[]
  onClose: () => void
  onCreated: (inf: Influencer) => void
}) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<InfluencerGender>('female')
  const [ageBracket, setAgeBracket] = useState<InfluencerAgeBracket>('26-35')
  const [voiceId, setVoiceId] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const voice = voices.find((v) => v.voice_id === voiceId)
      const inf = await adminCreateInfluencer({
        name: name.trim(),
        gender,
        age_bracket: ageBracket,
        ...(voiceId ? { voice_id: voiceId, voice_name: voice?.name } : {}),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      onCreated(inf)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the influencer')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-md bg-brand-950 border border-white/10 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading font-bold text-lg mb-5">New Influencer</h2>
        <div className="space-y-4">
          <Field label="Persona name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sofia" className={inputCls} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <select value={gender} onChange={(e) => setGender(e.target.value as InfluencerGender)} className={inputCls}>
                <option value="female">female</option>
                <option value="male">male</option>
              </select>
            </Field>
            <Field label="Age bracket">
              <select value={ageBracket} onChange={(e) => setAgeBracket(e.target.value as InfluencerAgeBracket)} className={inputCls}>
                {AGE_BRACKETS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Voice (changeable any time)">
            <VoiceSelect voices={voices} value={voiceId} onChange={setVoiceId} />
          </Field>
          <Field label="Tags (comma-separated)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="energetic, warm, UGC" className={inputCls} />
          </Field>
          {error && <p className="text-red-400 text-xs font-body">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-5 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy || !name.trim()}
              className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30"
            >
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailDialog({
  influencer,
  voices,
  onClose,
  onChanged,
  onDeleted,
  onError,
}: {
  influencer: Influencer
  voices: TtsVoice[]
  onClose: () => void
  onChanged: (inf: Influencer) => void
  onDeleted: (id: string) => void
  onError: (m: string) => void
}) {
  const [voiceId, setVoiceId] = useState(influencer.voice_id ?? '')
  const [tags, setTags] = useState(influencer.tags.join(', '))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dirty =
    voiceId !== (influencer.voice_id ?? '') ||
    tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).join(',') !== influencer.tags.join(',')

  const save = async () => {
    setSaving(true)
    try {
      const voice = voices.find((v) => v.voice_id === voiceId)
      const nextTags = tags.split(',').map((t) => t.trim()).filter(Boolean)
      await adminUpdateInfluencer(influencer.id, {
        voice_id: voiceId,
        voice_name: voiceId ? voice?.name ?? influencer.voice_name ?? '' : '',
        tags: nextTags,
      })
      onChanged({
        ...influencer,
        voice_id: voiceId || null,
        voice_name: voiceId ? voice?.name ?? influencer.voice_name : null,
        tags: nextTags.map((t) => t.toLowerCase()),
      })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    try {
      await adminUpdateInfluencer(influencer.id, { active: !influencer.active })
      onChanged({ ...influencer, active: !influencer.active })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not update')
    }
  }

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      let current = influencer
      for (const file of [...files]) {
        const img = await adminUploadInfluencerImage(influencer.id, file)
        current = { ...current, images: [...current.images, img] }
        onChanged(current)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const makePrimary = async (imageId: string) => {
    try {
      await adminSetPrimaryInfluencerImage(imageId)
      onChanged({
        ...influencer,
        images: influencer.images.map((i) => ({ ...i, is_primary: i.id === imageId })),
      })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not set primary image')
    }
  }

  const removeImage = async (imageId: string) => {
    try {
      await adminDeleteInfluencerImage(imageId)
      onChanged({ ...influencer, images: influencer.images.filter((i) => i.id !== imageId) })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not delete the image')
    }
  }

  const removeInfluencer = async () => {
    try {
      await adminDeleteInfluencer(influencer.id)
      onDeleted(influencer.id)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not delete the influencer')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-950 border border-white/10 rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-heading font-bold text-lg">{influencer.name}</h2>
            <p className="text-brand-600 text-xs font-body mt-0.5">
              {influencer.gender} · {influencer.age_bracket} · added {timeAgo(influencer.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleActive}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-heading font-bold tracking-wide border transition-colors ${
                influencer.active
                  ? 'border-green-500/30 text-green-400 hover:border-green-500/60'
                  : 'border-white/15 text-brand-500 hover:border-white/30'
              }`}
            >
              {influencer.active ? 'ACTIVE' : 'INACTIVE'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-white/10 text-brand-300 hover:text-white hover:border-white/30 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Reference images */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-heading font-semibold text-[11px] text-brand-300 tracking-wider uppercase">
              Reference images
            </h3>
            <label
              className={`px-3.5 py-2 bg-white text-black font-heading font-bold text-[10px] tracking-wide rounded-lg cursor-pointer transition-colors ${
                uploading ? 'opacity-40 pointer-events-none' : 'hover:bg-brand-200'
              }`}
            >
              {uploading ? 'Uploading…' : '+ ADD PHOTOS'}
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
            </label>
          </div>
          {influencer.images.length === 0 ? (
            <p className="text-brand-700 text-xs font-body py-4 text-center bg-brand-900/20 border border-white/5 rounded-xl">
              No photos yet — upload the same face in different clothing/backgrounds.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {influencer.images.map((img) => (
                <div key={img.id} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-brand-900/50 border border-white/5 group">
                  {img.view_url ? (
                    <img src={img.view_url} alt={img.label ?? ''} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-brand-700 text-[9px] font-heading">
                      NO PREVIEW
                    </div>
                  )}
                  {img.is_primary && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-violet-500/90 text-white text-[8px] font-heading font-bold tracking-wide">
                      PRIMARY
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-brand-950/90 to-transparent">
                    {!img.is_primary && (
                      <button
                        onClick={() => makePrimary(img.id)}
                        className="flex-1 py-1 rounded bg-white/90 text-black text-[8px] font-heading font-bold tracking-wide"
                      >
                        PRIMARY
                      </button>
                    )}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="flex-1 py-1 rounded bg-red-500/90 text-white text-[8px] font-heading font-bold tracking-wide"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voice + tags */}
        <div className="space-y-4">
          <Field label="Voice (picking the influencer picks this voice)">
            <VoiceSelect voices={voices} value={voiceId} onChange={setVoiceId} />
          </Field>
          <Field label="Tags (comma-separated)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="energetic, warm, UGC" />
          </Field>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-xs font-body">Delete {influencer.name} and all photos?</span>
              <button onClick={removeInfluencer} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-heading font-bold">
                YES, DELETE
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg border border-white/15 text-brand-300 text-[10px] font-heading">
                CANCEL
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[10px] font-heading tracking-wide text-brand-600 hover:text-red-400 transition-colors"
            >
              DELETE INFLUENCER
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="px-5 py-2.5 bg-white text-black font-heading font-bold text-xs rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
