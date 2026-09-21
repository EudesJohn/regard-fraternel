import { supabase, isSupabaseConfigured } from './supabase.js'
import { sanitizeText, sanitizeMultiline } from './validation.js'

/**
 * Configuration des dons — page « Faire un don » (/don).
 *
 * Une ligne unique (singleton, id = 1) dans la table `don_config` contient :
 *  - amounts          : montants prédéfinis (FCFA) proposés au visiteur ;
 *  - payment_channels : canaux de paiement affichés après le choix d'un montant
 *                       ([{ label, number, holder, description }]) ;
 *  - instructions     : consignes à suivre après le paiement ;
 *  - note             : message libre affiché en bas de page (usage des dons…).
 *
 * Tout est modifiable depuis l'admin (RLS : lecture publique, écriture admin).
 * Repli automatique : configuration locale par défaut ci-dessous, pour que la
 * page reste présentable tant que l'admin n'a rien saisi.
 */

export const DEFAULT_DON_CONFIG = {
  amounts: [1000, 2500, 5000, 10000, 25000, 50000, 100000],
  payment_channels: [],
  instructions:
    "Après votre don, envoyez-nous le reçu par WhatsApp ou par e-mail afin que nous puissions vous remercier et vous transmettre un reçu officiel de l'ONG.",
  note: "Chaque don finance directement nos actions sur le terrain : scolarité, santé, autonomisation des femmes et aide d'urgence. Merci pour votre solidarité."
}

const MAX_AMOUNTS = 12
const MAX_CHANNELS = 8
const MAX_AMOUNT_VALUE = 100000000
const MAX_TEXT = {
  label: 60,
  number: 60,
  holder: 80,
  description: 200,
  instructions: 1000,
  note: 500
}

/**
 * Configuration par défaut fusionnée avec les valeurs manquantes,
 * pour un rendu sûr même si la base est vide ou partiellement remplie.
 */
export function normalizeConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {}
  const amounts = Array.isArray(cfg.amounts) ? cfg.amounts : []
  const channels = Array.isArray(cfg.payment_channels) ? cfg.payment_channels : []

  return {
    amounts: amounts
      .map((a) => Math.round(Number(a)))
      .filter((a) => Number.isFinite(a) && a > 0 && a <= MAX_AMOUNT_VALUE)
      .slice(0, MAX_AMOUNTS),
    payment_channels: channels.slice(0, MAX_CHANNELS).map((c) => ({
      label: sanitizeText(c?.label, MAX_TEXT.label),
      number: sanitizeText(c?.number, MAX_TEXT.number),
      holder: sanitizeText(c?.holder, MAX_TEXT.holder),
      description: sanitizeText(c?.description, MAX_TEXT.description)
    })),
    instructions: sanitizeMultiline(cfg.instructions, MAX_TEXT.instructions),
    note: sanitizeMultiline(cfg.note, MAX_TEXT.note)
  }
}

/**
 * Configuration effective pour l'affichage public :
 * valeurs en base (normalisées), champs vides remplacés par les défauts.
 */
export async function getDonConfig() {
  if (!isSupabaseConfigured) return { ...DEFAULT_DON_CONFIG }
  try {
    const { data, error } = await supabase
      .from('don_config')
      .select('amounts, payment_channels, instructions, note')
      .eq('id', 1)
      .maybeSingle()
    if (error) throw error
    const n = normalizeConfig(data || {})
    return {
      amounts: n.amounts.length ? n.amounts : DEFAULT_DON_CONFIG.amounts,
      payment_channels: n.payment_channels.length ? n.payment_channels : DEFAULT_DON_CONFIG.payment_channels,
      instructions: n.instructions || DEFAULT_DON_CONFIG.instructions,
      note: n.note || DEFAULT_DON_CONFIG.note
    }
  } catch (e) {
    console.warn('[don] Supabase indisponible, configuration par défaut affichée.', e)
    return { ...DEFAULT_DON_CONFIG }
  }
}

/**
 * Sauvegarde admin : upsert de la ligne unique (RLS : réservé à l'admin).
 * Chaque champ est normalisé/assaini avant envoi (défense en profondeur ;
 * la vraie police reste le RLS et les contraintes SQL).
 */
export async function saveDonConfig(cfg) {
  if (!isSupabaseConfigured) throw new Error('Supabase n est pas configuré.')
  const n = normalizeConfig(cfg)
  const { error } = await supabase
    .from('don_config')
    .upsert({ id: 1, amounts: n.amounts, payment_channels: n.payment_channels, instructions: n.instructions, note: n.note })
  if (error) throw error
  return n
}
