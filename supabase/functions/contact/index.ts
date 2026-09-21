// ============================================================
// REGARD FRATERNEL — Edge Function « contact »
// Remplace l'envoi direct à FormSubmit : le message est validé
// côté serveur, anti-spammé (honeypot) et limité en débit
// (rate limiting par IP dans PostgreSQL), puis stocké en base.
//
// Déploiement :
//   npx supabase functions deploy contact --project-ref <ref>
// Secrets (Dashboard → Edge Functions → Secrets, ou CLI) :
//   RESEND_API_KEY    (optionnel : envoi d'e-mail via Resend)
//   CONTACT_TO_EMAIL  (optionnel, requis si RESEND_API_KEY)
//   ALLOWED_ORIGINS   (optionnel, défaut : même origine que l'URL Supabase)
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '86400'
}

const LIMITS = {
  name: 80,
  email: 254,
  phone: 20,
  message: 2000,
  subject: 300
}

const RATE_LIMIT = { max: 5, windowSeconds: 3600 } // 5 messages/heure/IP

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[a-zA-Z]{2,24}$/
const PHONE_RE = /^[+0-9][0-9\s\-().]{5,19}$/
const NAME_RE = /^[\p{L}\p{M}'’. \-]+$/u

// Hachage SHA-256 (Web Crypto, disponible nativement dans les Edge Functions).
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Empreinte IP « pepper » : les IPs sont à faible entropie (un attaquant qui
 * volerait la table pourrait les énumérer). Un secret d'application (pepper,
 * jamais stocké en base) rend l'énumération infaisable.
 * Définissez CONTACT_IP_PEPPER via `supabase secrets set` (chaîne aléatoire).
 */
function ipHash(ip) {
  const pepper = Deno.env.get('CONTACT_IP_PEPPER') ?? ''
  return sha256Hex(ip + pepper)
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json; charset=utf-8' }
  })
}

/** Message générique unique : aucun détail technique ne fuit (A09: Logging). */
const GENERIC_ERROR = "Une erreur est survenue. Merci de réessayer plus tard."

function clean(value, max) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max)
}

function clientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/* ---------- Validation côté serveur (miroir de src/lib/validation.js) ---------- */

function validate(payload) {
  const name = clean(payload.name, LIMITS.name)
  const email = clean(payload.email, LIMITS.email).toLowerCase()
  const phone = clean(payload.phone, LIMITS.phone)
  const message = clean(payload.message, LIMITS.message)

  if (!name || !NAME_RE.test(name)) return { error: 'invalid' }
  if (!EMAIL_RE.test(email)) return { error: 'invalid' }
  if (phone && !PHONE_RE.test(phone)) return { error: 'invalid' }
  if (message.length < 10) return { error: 'invalid' }

  return { name, email, phone, message }
}

/* ---------- Rate limiting (table PostgreSQL, pas de dépendance externe) ---------- */

async function checkRateLimit(adminKey, ip, max, windowSeconds) {
  const { data, error } = await adminKey.rpc('consume_contact_rate_limit', {
    p_ip: ip,
    p_window_seconds: windowSeconds,
    p_max: max
  })
  if (error) {
    // Fail-closed : si la règle ne peut pas être appliquée, on refuse.
    console.error(JSON.stringify({ app: 'contact-fn', event: 'rate_limit_error', message: error.message }))
    return false
  }
  return data === true
}

/* ---------- Envoi e-mail via Resend (optionnel) ---------- */

async function sendEmail({ name, email, phone, message }, toEmail) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return false // stockage seul : l'ONG relit les messages en base

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: Deno.env.get('CONTACT_FROM_EMAIL') || 'Site REGARD FRATERNEL <onboarding@resend.dev>',
      to: [toEmail],
      reply_to: email,
      subject: `Nouveau message — ${name}`,
      text: `Nom : ${name}\nE-mail : ${email}\nTéléphone : ${phone || 'Non renseigné'}\n\n${message}`
    })
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(JSON.stringify({ app: 'contact-fn', event: 'email_error', status: res.status, body: body.slice(0, 200) }))
  }
  return res.ok
}

/* ---------- Point d'entrée ---------- */

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  // Origin : rejeter les domaines explicitement étrangers (anti cross-site POST).
  const origin = request.headers.get('origin') || ''
  if (origin) {
    try {
      const originHost = new URL(origin).host
      const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      if (allowed.length > 0 && !allowed.includes(originHost)) {
        return json(403, { error: 'forbidden_origin' })
      }
    } catch {
      return json(403, { error: 'forbidden_origin' })
    }
  }

  try {
    const payload = await request.json().catch(() => ({}))

    // Honeypot serveur : le champ « website » doit être vide (le bot le remplit).
    if (typeof payload.website === 'string' && payload.website.length > 0) {
      // Fausse réussite : on n'éduque pas le bot.
      console.warn(JSON.stringify({ app: 'contact-fn', event: 'honeypot_tripped', ip: clientIp(request) }))
      return json(200, { ok: true })
    }

    const validation = validate(payload)
    if ('error' in validation) return json(400, { error: 'invalid_input' })

    const ip = clientIp(request)

    // Créer un client admin SANS dependance externe : on utilise la clé de
    // service fournie par la plateforme aux fonctions déployées.
    const { createClient } = await import('jsr:@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Rate limit par IP (fail-closed)
    const allowed = await checkRateLimit(supabase, ip, RATE_LIMIT.max, RATE_LIMIT.windowSeconds)
    if (!allowed) {
      console.warn(JSON.stringify({ app: 'contact-fn', event: 'rate_limited', ip }))
      return json(429, { error: 'too_many_requests' })
    }

    // 2. Stockage du message (source de vérité, consultable par l'admin)
    const { error: insertError } = await supabase.from('contact_messages').insert({
      name: validation.name,
      email: validation.email,
      phone: validation.phone || null,
      message: validation.message,
      ip_hash: await ipHash(ip)
    })
    if (insertError) {
      console.error(JSON.stringify({ app: 'contact-fn', event: 'insert_error', message: insertError.message }))
      return json(500, { error: 'storage_failed' })
    }

    // 3. E-mail (optionnel) — n'échoue pas la requête si Resend est en panne
    if (Deno.env.get('CONTACT_TO_EMAIL')) {
      await sendEmail(validation, Deno.env.get('CONTACT_TO_EMAIL'))
    }

    return json(200, { ok: true })
  } catch (e) {
    console.error(JSON.stringify({ app: 'contact-fn', event: 'unhandled', message: String(e?.message || e).slice(0, 300) }))
    return json(500, { error: GENERIC_ERROR })
  }
})
