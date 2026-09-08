import { supabase, isSupabaseConfigured } from './supabase.js'
import { defaultPhotos } from './defaultPhotos.js'

export { SECTIONS, sectionLabel, slotDefault } from './sections.js'

const BUCKET = 'photos'

/**
 * Version optimisée d'une URL d'image Supabase (redimensionnement à la volée).
 * Les grilles chargent une miniature légère ; la lightbox utilise l'original.
 * Ne modifie pas les autres URLs (images locales de mise en page).
 */
export function photoUrl(url, width = 500) {
  if (!url || !url.includes('/storage/v1/object/public/')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}width=${width}&quality=70&resize=contain`
}

/**
 * Photos d'une section pour l'affichage public.
 * Repli automatique : si Supabase n'est pas configuré, est en erreur ou si la
 * section est encore vide en base, on affiche les photos locales (defaultPhotos).
 */
export async function getPhotos(section) {
  const fallback = defaultPhotos[section] || []
  if (!isSupabaseConfigured) return fallback
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('id, url, caption, position')
      .eq('section', section)
      .is('key', null) // les emplacements fixes sont gérés séparément
      .order('position', { ascending: true })
    if (error) throw error
    return data && data.length ? data : fallback
  } catch (e) {
    console.warn(`[photos] Supabase indisponible pour « ${section} », photos locales utilisées.`, e)
    return fallback
  }
}

/**
 * Photos d'une section pour l'administration : uniquement les lignes Supabase.
 * Retourne [] si Supabase n'est pas configuré.
 */
export async function getManagedPhotos(section) {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('id, url, caption, position')
      .eq('section', section)
      .is('key', null) // les emplacements fixes sont gérés séparément
      .order('position', { ascending: true })
    if (error) throw error
    return data || []
  } catch (e) {
    console.error(`[photos] Impossible de charger la section « ${section} ».`, e)
    return []
  }
}

/** Ajoute une photo : upload dans le bucket, puis ligne dans la table. */
export async function addPhoto(section, file, caption = '') {
  const path = `${section}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { count } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('section', section)
    .is('key', null)

  const { data, error } = await supabase
    .from('photos')
    .insert({ section, url: publicUrl, caption, position: count || 0 })
    .select('id, url, caption, position')
    .single()
  if (error) throw error
  return data
}

/** Modifie la légende (et éventuellement la position) d'une photo. */
export async function updatePhoto(id, patch) {
  const { data, error } = await supabase
    .from('photos')
    .update(patch)
    .eq('id', id)
    .select('id, url, caption, position')
    .single()
  if (error) throw error
  return data
}

/* ============================================================
 * Emplacements fixes (slots) : images de mise en page modifiables
 * depuis l'admin. Une ligne en base = emplacement personnalisé ;
 * sinon la photo locale par défaut est utilisée.
 * ============================================================ */

/** Retourne { key: { id, url, caption } } pour les emplacements fixes d'une section. */
export async function getSectionSlots(section) {
  const out = {}
  if (!isSupabaseConfigured) return out
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('id, url, caption, key')
      .eq('section', section)
    if (error) throw error
    for (const row of data || []) {
      if (row.key) out[row.key] = { id: row.id, url: row.url, caption: row.caption || '' }
    }
  } catch (e) {
    console.warn(`[photos] Emplacements indisponibles pour « ${section} ».`, e)
  }
  return out
}

/** Insère ou met à jour une photo d'emplacement fixe, identifiée par (section, key). */
export async function saveSlotPhoto(section, key, { url, caption = '' }) {
  const { data, error } = await supabase
    .from('photos')
    .upsert({ section, key, url, caption }, { onConflict: 'section,key' })
    .select('id, url, caption')
    .single()
  if (error) throw error
  return data
}

/** Remplace l'image d'un emplacement fixe : upload + upsert + suppression de l'ancien fichier. */
export async function replaceSlotPhoto(section, key, file, current) {
  const path = `${section}/${key}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const saved = await saveSlotPhoto(section, key, { url: publicUrl, caption: current?.caption || '' })

  const oldPath = current ? pathFromUrl(current.url) : null
  if (oldPath && oldPath !== path) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }
  return saved
}

/** Restaure l'emplacement fixe par défaut : supprime la ligne (et le fichier du bucket si présent). */
export async function deleteSlotPhoto(section, key) {
  const { data } = await supabase
    .from('photos')
    .select('id, url')
    .eq('section', section)
    .eq('key', key)
    .maybeSingle()
  if (!data) return
  const oldPath = pathFromUrl(data.url)
  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }
  const { error } = await supabase.from('photos').delete().eq('id', data.id)
  if (error) throw error
}

/** Extrait le chemin de stockage depuis l'URL publique du bucket. */
function pathFromUrl(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

/** Remplace l'image d'une photo existante (nouvel upload, suppression de l'ancien fichier). */
export async function replacePhoto(photo, file) {
  const path = `${photo.section || 'photos'}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data, error } = await supabase
    .from('photos')
    .update({ url: publicUrl })
    .eq('id', photo.id)
    .select('id, url, caption, position')
    .single()
  if (error) throw error

  const oldPath = pathFromUrl(photo.url)
  if (oldPath && oldPath !== path) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }
  return data
}

/** Supprime une photo : ligne en base + fichier dans le bucket (si présent). */
export async function deletePhoto(photo) {
  const oldPath = pathFromUrl(photo.url)
  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }
  const { error } = await supabase.from('photos').delete().eq('id', photo.id)
  if (error) throw error
}

/** Échange les positions de deux photos (réordonnancement ↑ / ↓). */
export async function movePhoto(photo, dir, list) {
  const idx = list.findIndex((p) => p.id === photo.id)
  const other = list[idx + dir]
  if (!other) return
  await updatePhoto(photo.id, { position: other.position })
  await updatePhoto(other.id, { position: photo.position })
}

/**
 * Enregistre un nouvel ordre complet de photos (glisser-déposer).
 * Deux passes pour éviter les collisions de position : décalage puis positions finales.
 */
export async function reorderPhotos(list) {
  const OFFSET = 100000
  for (let i = 0; i < list.length; i++) {
    if (list[i].position !== i) {
      await updatePhoto(list[i].id, { position: i + OFFSET })
    }
  }
  for (let i = 0; i < list.length; i++) {
    if (list[i].position !== i) {
      await updatePhoto(list[i].id, { position: i })
    }
    list[i].position = i
  }
}

