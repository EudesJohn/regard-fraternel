/**
 * REGARD FRATERNEL — Validation & assainissement des entrées (OWASP A03: Injection).
 *
 * Toutes les valeurs saisies par un utilisateur (formulaire de contact,
 * légendes de photos, champs de connexion) passent par ces helpers avant d'être
 * envoyées à Supabase ou à FormSubmit.
 *
 * Principe : on valide le FORMAT côté client (ergonomie) ET avant l'envoi
 * (défense en profondeur) — l'application réelle reste côté serveur
 * (RLS Supabase, contraintes SQL, middleware Vercel).
 */

/* ---------- Types & patterns ---------- */

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[a-zA-Z]{2,24}$/
// Téléphone : chiffres, espaces, +, -, (), . — 6 à 20 caractères utiles
const PHONE_RE = /^[+0-9][0-9\s\-().]{5,19}$/

export const LIMITS = {
  name: 80,
  email: 254,
  phone: 20,
  message: 2000,
  caption: 120,
  url: 2048
}

/* ---------- Assainissement (sanitization) ---------- */

/**
 * Nettoie une chaîne libre : supprime les caractères de contrôle invisibles
 * (utilisés pour la log-spam et l'obfuscation), borne la longueur et
 * compacte les espaces. N'essaie PAS de « supprimer » du HTML : le contenu
 * est ensuite toujours rendu échappé par Vue ({{ }}), jamais en v-html.
 */
export function sanitizeText(value, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '') // contrôles C0/C1, TAB \t conservé via \u000b exclusions
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/** Identique à sanitizeText mais préserve les sauts de ligne (messages). */
export function sanitizeMultiline(value, maxLength = LIMITS.message) {
  if (typeof value !== 'string') return ''
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

/* ---------- Validateurs ---------- */

/** Valide et assainit un nom / prénom. Retourne null si invalide. */
export function sanitizeName(value) {
  const v = sanitizeText(value, LIMITS.name)
  if (!v) return null
  // Un nom légitime : lettres (accents compris), espaces, - ' . ’
  if (!/^[\p{L}\p{M}'’.\- ]+$/u.test(v)) return null
  return v
}

/** Valide un e-mail. Retourne la valeur assainie, ou null si invalide. */
export function sanitizeEmail(value) {
  const v = sanitizeText(value, LIMITS.email).toLowerCase()
  return EMAIL_RE.test(v) ? v : null
}

/** Valide un numéro de téléphone (optionnel). Retourne la valeur, ou null si invalide. */
export function sanitizePhone(value) {
  const v = sanitizeText(value, LIMITS.phone)
  if (!v) return ''
  return PHONE_RE.test(v) ? v : null
}

/**
 * Valide une URL de photo. STRICTEMENT limité aux origines autorisées :
 *  - le bucket public Supabase du projet
 *  - les chemins locaux du site (/images/…)
 * Bloque javascript:, data:, vbscript: et toute origine tierce
 * (une URL stockée en base est rendue par le site public → surface XSS).
 */
export function sanitizePhotoUrl(value) {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (!v || v.length > LIMITS.url) return null

  // Chemin local du site (photos par défaut)
  if (v.startsWith('/images/') && !v.includes('\\') && !/[\s"']/.test(v)) return v

  // URL absolue : seule l'origine Supabase du projet est acceptée
  try {
    const u = new URL(v)
    if (u.protocol !== 'https:') return null
    if (!/\.supabase\.co$/.test(u.hostname)) return null
    if (!u.pathname.startsWith('/storage/v1/object/public/photos/')) return null
    return u.toString()
  } catch {
    return null
  }
}

/** Valide une légende de photo (texte court affiché sous l'image). */
export function sanitizeCaption(value) {
  return sanitizeText(value, LIMITS.caption).replace(/[<>{}$]/g, '')
}

/**
 * Slug de section sûr : uniquement [a-z0-9-] (les sections légitimes du site
 * le respectent tous). Retourne null si invalide.
 */
export function sanitizeSectionSlug(value) {
  return typeof value === 'string' && /^[a-z0-9-]{1,40}$/.test(value) ? value : null
}

/**
 * Nom de fichier sûr pour le stockage : garde uniquement lettres, chiffres,
 * point, tiret et underscore (anti path-traversal, anti caractères exotiques).
 * Les séparateurs de chemin (/, \) et les points de traversal sont neutralisés,
 * puis le nom est borné — le nom de fichier final ne peut plus remonter un
 * arbre de répertoires.
 */
export function safeFileName(name, maxLen = 60) {
  const base = String(name || 'image')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .toLowerCase()
    .replace(/[\\/]+/g, '_') // séparateurs de chemin → underscore
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^\.+(?=\.|$)/gm, '') // séquences de points de tête (traversal)
    .slice(-maxLen)
    .replace(/^[._-]+/, '') || 'image'
  return base
}

/* ---------- Uploads (défense en profondeur, doublée côté Storage) ---------- */

/** Types MIME d'image acceptés et taille maximale (10 Mo). */
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/**
 * Vérifie qu'un fichier uploadé est une image acceptable.
 * Le contrôle du magic number (en-têtes JPEG/PNG/WEBP) empêche de contourner
 * la vérification en renommant un fichier (ex : .jpg qui est en réalité un HTML).
 */
export async function assertSafeUpload(file) {
  if (!file) throw new Error('Aucun fichier fourni.')
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image refusée : taille maximale 10 Mo.')
  }
  const mime = String(file.type || '').toLowerCase()
  if (!ALLOWED_IMAGE_TYPES.has(mime)) {
    throw new Error('Format refusé : utilisez JPEG, PNG ou WebP.')
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
  const isWebp =
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50 // « WEBP » à l'octet 8
  if (!isJpeg && !isPng && !isWebp) {
    throw new Error('Fichier refusé : le contenu n est pas une image valide.')
  }
}

/* ---------- Honeypot (OWASP : anti-automatisation) ---------- */

/**
 * Vérifie le champ piège d'un formulaire public.
 * Le champ est invisible (CSS) et absent du tabindex : un humain ne le
 * remplit jamais, un bot qui parse le DOM le remplit.
 * Retourne true si le formulaire doit être SILENCIEUSEMENT rejeté.
 */
export function honeypotTripped(form, fieldName = 'website') {
  if (!form || typeof form !== 'object') return true
  const v = String(form[fieldName] ?? '')
  return v.length > 0
}

/* ---------- Divers ---------- */

/** Débit artificiel : rend les énumérations de mots de passe moins efficaces. */
export function fakeDelay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
