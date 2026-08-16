import { supabase, isSupabaseConfigured } from './supabase.js'

/**
 * Sections du site dont les photos sont gérables.
 * `cle` = valeur stockée dans la colonne `section` de la table `photos`.
 */
export const SECTIONS = [
  { cle: 'sanitaire', label: 'Appui sanitaire' },
  { cle: 'scolaire', label: 'Appui scolaire' },
  { cle: 'jeux', label: 'Espaces de jeux' },
  { cle: 'donEcole', label: 'Dons aux écoles' },
  { cle: 'partenaires', label: 'Partenaires' },
  { cle: 'hero', label: "Accueil (diaporama)" }
]

export const sectionLabel = (cle) => {
  const s = SECTIONS.find((s) => s.cle === cle)
  return s ? s.label : cle
}

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
 * Photos d'une section pour l'affichage public (depuis Supabase).
 * Retourne [] si Supabase n'est pas configuré ou en erreur.
 */
export async function getPhotos(section) {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('id, url, caption, position')
      .eq('section', section)
      .order('position', { ascending: true })
    if (error) throw error
    return data || []
  } catch (e) {
    console.warn(`[photos] Supabase indisponible pour « ${section} ».`, e)
    return []
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

