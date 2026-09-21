import { supabase, isSupabaseConfigured } from './supabase.js'
import { sanitizeText, sanitizeEmail, sanitizePhone } from './validation.js'

/**
 * Partenaires — cartes éditables depuis l'admin (table `partners`).
 * Affichées sur /partenaires et /contact. Les logos restent gérés via la
 * galerie photos de la section « partenaires » (photos libres).
 */

const MAX_PARTNERS = 50

function normalizePartner(p) {
  return {
    id: p?.id,
    name: sanitizeText(p?.name, 80),
    description: sanitizeText(p?.description, 500),
    email: sanitizeEmail(p?.email) || '',
    phone: sanitizePhone(p?.phone) || '',
    position: Number(p?.position) || 0
  }
}

/** Partenaires pour l'affichage public (triés ; [] si rien en base). */
export async function getPartners() {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('id, name, description, email, phone, position')
      .order('position', { ascending: true })
      .limit(MAX_PARTNERS)
    if (error) throw error
    return (data || []).map(normalizePartner)
  } catch (e) {
    console.warn('[partners] Supabase indisponible, aucun partenaire affiché.', e)
    return []
  }
}

/** Ajoute un partenaire (admin). */
export async function addPartner({ name, description = '', email = '', phone = '' }) {
  if (!isSupabaseConfigured) throw new Error('Supabase n est pas configuré.')
  const n = normalizePartner({ name, description, email, phone })
  if (!n.name) throw new Error('Le nom du partenaire est requis.')

  const { count } = await supabase
    .from('partners')
    .select('id', { count: 'exact', head: true })

  const { data, error } = await supabase
    .from('partners')
    .insert({ name: n.name, description: n.description, email: n.email, phone: n.phone, position: count || 0 })
    .select('id, name, description, email, phone, position')
    .single()
  if (error) throw error
  return normalizePartner(data)
}

/** Modifie un partenaire (patch en liste blanche). */
export async function updatePartner(id, patch = {}) {
  const allowed = {}
  if ('name' in patch) {
    const n = normalizePartner({ name: patch.name })
    if (!n.name) throw new Error('Le nom du partenaire est requis.')
    allowed.name = n.name
  }
  if ('description' in patch) allowed.description = sanitizeText(patch.description, 500)
  if ('email' in patch) allowed.email = sanitizeEmail(patch.email) || ''
  if ('phone' in patch) allowed.phone = sanitizePhone(patch.phone) || ''
  if (Object.keys(allowed).length === 0) throw new Error('Rien à mettre à jour.')

  const { data, error } = await supabase
    .from('partners')
    .update(allowed)
    .eq('id', id)
    .select('id, name, description, email, phone, position')
    .single()
  if (error) throw error
  return normalizePartner(data)
}

/** Supprime un partenaire. */
export async function deletePartner(id) {
  const { error } = await supabase.from('partners').delete().eq('id', id)
  if (error) throw error
}

/** Échange les positions de deux partenaires (↑ / ↓). */
export async function movePartner(partner, dir, list) {
  const idx = list.findIndex((p) => p.id === partner.id)
  const other = list[idx + dir]
  if (!other) return
  await updatePartner(partner.id, { position: other.position })
  await updatePartner(other.id, { position: partner.position })
}
