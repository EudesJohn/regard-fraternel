import { supabase, isSupabaseConfigured } from './supabase.js'
import { sanitizeText, sanitizeMultiline, assertSafeUpload, safeFileName } from './validation.js'

/**
 * « Nos histoires » — page /histoires.
 *
 * Deux tables Supabase :
 *  - stories        : les récits (photo + kicker + titre + corps) ;
 *  - stories_config : ligne unique avec les textes de la page
 *                     (sous-titre, introduction, conclusion).
 * Tout est modifiable depuis l'admin (RLS : lecture publique, écriture admin).
 */

export const DEFAULT_STORIES_CONFIG = {
  subtitle: 'Des histoires de courage, d’espoir et de changement',
  intro:
    'Découvrez les récits inspirants des enfants, des familles et des communautés que Regard Fraternel accompagne au Bénin. À travers leurs parcours, découvrez les défis rencontrés, les espoirs retrouvés et les changements rendus possibles grâce à la solidarité et à l’engagement de nos partenaires, donateurs et bénévoles.',
  outro: 'Chaque histoire compte. Chaque geste peut changer une vie.'
}

const MAX_STORIES = 100
const BUCKET = 'photos'

/* ---------- Textes de la page ---------- */

export async function getStoriesConfig() {
  if (!isSupabaseConfigured) return { ...DEFAULT_STORIES_CONFIG }
  try {
    const { data, error } = await supabase
      .from('stories_config')
      .select('subtitle, intro, outro')
      .eq('id', 1)
      .maybeSingle()
    if (error) throw error
    return {
      subtitle: sanitizeText(data?.subtitle, 160) || DEFAULT_STORIES_CONFIG.subtitle,
      intro: sanitizeText(data?.intro, 1000) || DEFAULT_STORIES_CONFIG.intro,
      outro: sanitizeText(data?.outro, 300) || DEFAULT_STORIES_CONFIG.outro
    }
  } catch (e) {
    console.warn('[stories] Supabase indisponible, textes par défaut affichés.', e)
    return { ...DEFAULT_STORIES_CONFIG }
  }
}

export async function saveStoriesConfig(cfg) {
  if (!isSupabaseConfigured) throw new Error('Supabase n est pas configuré.')
  const row = {
    id: 1,
    subtitle: sanitizeText(cfg?.subtitle, 160),
    intro: sanitizeMultiline(cfg?.intro, 1000),
    outro: sanitizeMultiline(cfg?.outro, 300)
  }
  const { error } = await supabase.from('stories_config').upsert(row)
  if (error) throw error
  return row
}

/* ---------- Récits ---------- */

function normalizeStory(s) {
  return {
    id: s?.id,
    url: typeof s?.url === 'string' ? s.url : '',
    caption: sanitizeText(s?.caption, 120),
    kicker: sanitizeText(s?.kicker, 60),
    body: sanitizeMultiline(s?.body, 4000),
    position: Number(s?.position) || 0
  }
}

/** Récits pour l'affichage public (liste triée ; [] si rien en base). */
export async function getStories() {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('id, url, caption, kicker, body, position')
      .order('position', { ascending: true })
      .limit(MAX_STORIES)
    if (error) throw error
    return (data || []).map(normalizeStory)
  } catch (e) {
    console.warn('[stories] Supabase indisponible, aucune histoire affichée.', e)
    return []
  }
}

/** Ajoute une histoire : upload de la photo, puis ligne en base. */
export async function addStory(file, { caption = '', kicker = '', body = '' }) {
  await assertSafeUpload(file)
  const path = `histoires/${Date.now()}-${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { count } = await supabase
    .from('stories')
    .select('id', { count: 'exact', head: true })

  const { data, error } = await supabase
    .from('stories')
    .insert({
      url: publicUrl,
      caption: sanitizeText(caption, 120),
      kicker: sanitizeText(kicker, 60),
      body: sanitizeMultiline(body, 4000),
      position: count || 0
    })
    .select('id, url, caption, kicker, body, position')
    .single()
  if (error) throw error
  return normalizeStory(data)
}

/** Modifie les textes d'une histoire (patch en liste blanche). */
export async function updateStory(id, patch = {}) {
  const allowed = {}
  if ('caption' in patch) allowed.caption = sanitizeText(patch.caption, 120)
  if ('kicker' in patch) allowed.kicker = sanitizeText(patch.kicker, 60)
  if ('body' in patch) allowed.body = sanitizeMultiline(patch.body, 4000)
  if ('position' in patch) {
    if (!Number.isInteger(patch.position) || patch.position < 0 || patch.position > 100000) {
      throw new Error('Position invalide.')
    }
    allowed.position = patch.position
  }
  if (Object.keys(allowed).length === 0) throw new Error('Rien à mettre à jour.')

  const { data, error } = await supabase
    .from('stories')
    .update(allowed)
    .eq('id', id)
    .select('id, url, caption, kicker, body, position')
    .single()
  if (error) throw error
  return normalizeStory(data)
}

/** Remplace la photo d'une histoire (nouvel upload + suppression de l'ancien fichier). */
export async function replaceStoryPhoto(story, file) {
  if (!story || typeof story.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(story.id)) {
    throw new Error('Identifiant invalide.')
  }
  await assertSafeUpload(file)
  const path = `histoires/${Date.now()}-${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data, error } = await supabase
    .from('stories')
    .update({ url: publicUrl })
    .eq('id', story.id)
    .select('id, url, caption, kicker, body, position')
    .single()
  if (error) throw error

  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = (story.url || '').indexOf(marker)
  const oldPath = idx === -1 ? null : story.url.slice(idx + marker.length)
  if (oldPath && oldPath !== path) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }
  return normalizeStory(data)
}

/** Supprime une histoire (ligne + fichier). */
export async function deleteStory(story) {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = (story?.url || '').indexOf(marker)
  const oldPath = idx === -1 ? null : story.url.slice(idx + marker.length)
  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }
  const { error } = await supabase.from('stories').delete().eq('id', story.id)
  if (error) throw error
}

/** Échange les positions de deux histoires (↑ / ↓). */
export async function moveStory(story, dir, list) {
  const idx = list.findIndex((s) => s.id === story.id)
  const other = list[idx + dir]
  if (!other) return
  await updateStory(story.id, { position: other.position })
  await updateStory(other.id, { position: story.position })
}
