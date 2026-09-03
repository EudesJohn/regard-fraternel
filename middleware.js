// ============================================================
// REGARD FRATERNEL — Porte d'accès de l'administration
// Middleware Vercel (Edge runtime).
//
// - Protège /admin et TOUS ses fichiers (HTML, JS, CSS compris) :
//   sans le cookie d'accès, le serveur refuse de servir quoi que ce
//   soit sous /admin — y compris le code source de l'application.
// - Anti force brute : limitation des tentatives de connexion par IP.
// - Journalisation de chaque événement (Vercel → Functions Logs).
//
// Variables d'environnement :
//   ADMIN_GATE_PASSWORD        (requis) mot de passe d'accès
//   ADMIN_GATE_EMAIL           (optionnel, recommandé) e-mail administrateur
//                              exigé à la connexion (sinon mot de passe seul)
//   ADMIN_GATE_MAX_ATTEMPTS    (optionnel, défaut 10) tentatives max / fenêtre
//   ADMIN_GATE_WINDOW_SECONDS  (optionnel, défaut 600) fenêtre en secondes
//   UPSTASH_REDIS_REST_URL     (optionnel, recommandé) compteur partagé Upstash
//   UPSTASH_REDIS_REST_TOKEN   (optionnel, recommandé) jeton REST Upstash
// ============================================================

const COOKIE_NAME = 'rf_admin_gate'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 jours
const RATE_LIMIT_PREFIX = 'rf-gate:login'

/* ================= Journalisation ================= */

function log(event, fields = {}) {
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), app: 'admin-gate', event, ...fields }))
  } catch {
    /* ne jamais casser la porte à cause des logs */
  }
}

function clientIp(request) {
  const h = request.headers
  return (
    (h.get('x-vercel-forwarded-for') || '').split(',')[0].trim() ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  )
}

function clientCountry(request) {
  return request.headers.get('x-vercel-ip-country') || undefined
}

function clientUa(request) {
  const ua = request.headers.get('user-agent') || ''
  return ua.length > 120 ? ua.slice(0, 120) : ua
}

/* ================= Utilitaires ================= */

/** Empreinte SHA-256 (le mot de passe n'est jamais stocké/comparé en clair). */
async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Parse le header Cookie (format simple, sans dépendance). */
function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq > -1) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }
  return out
}

function securityHeaders() {
  return {
    'content-type': 'text/html; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'content-security-policy':
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  }
}

/* ================= Anti force brute ================= */

const memoryStore = new Map() // repli sans Upstash (compteur par instance)
let memoryFallbackWarned = false

function windowSeconds() {
  const n = Number(process.env.ADMIN_GATE_WINDOW_SECONDS)
  return Number.isFinite(n) && n > 0 ? n : 600
}

function maxAttempts() {
  const n = Number(process.env.ADMIN_GATE_MAX_ATTEMPTS)
  return Number.isFinite(n) && n > 0 ? n : 10
}

function upstashConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

/** Incrémente le compteur d'échecs d'une IP et renvoie le nouveau total. */
async function countFailure(ip, ttl) {
  const key = `${RATE_LIMIT_PREFIX}:${ip}`
  if (upstashConfigured()) {
    try {
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify([['INCR', key], ['EXPIRE', key, ttl]])
      })
      if (res.ok) {
        const data = await res.json()
        return Number(Array.isArray(data) && data[0]) || 0
      }
    } catch {
      /* le backend est indisponible : on ne bloque pas, mais on journalise */
    }
    log('rate_limit_backend_error', { key })
    return 0
  }
  // Repli en mémoire (par instance) : utile sans compte Upstash ; le compteur
  // partagé Upstash prend le relais dès que UPSTASH_REDIS_REST_URL/TOKEN existent.
  if (!memoryFallbackWarned) {
    memoryFallbackWarned = true
    log('rate_limit_memory_fallback')
  }
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || entry.expiresAt < now) {
    memoryStore.set(key, { count: 1, expiresAt: now + ttl * 1000 })
    return 1
  }
  entry.count += 1
  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore) {
      if (v.expiresAt < now) memoryStore.delete(k)
    }
  }
  return entry.count
}

/** Réinitialise le compteur d'échecs d'une IP (connexion réussie). */
async function resetFailures(ip) {
  const key = `${RATE_LIMIT_PREFIX}:${ip}`
  if (upstashConfigured()) {
    try {
      await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify([['DEL', key]])
      })
    } catch {
      /* non bloquant */
    }
    return
  }
  memoryStore.delete(key)
}

/* ================= Pages ================= */

/** Page de connexion (marque, design system du site). */
function gatePage(error, requireEmail = false) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Accès restreint — REGARD FRATERNEL</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    padding: 24px;
    font-family: 'Inter', system-ui, sans-serif;
    color: #1c2420;
    background:
      radial-gradient(900px 420px at 85% -10%, rgba(201, 107, 61, 0.22), transparent 60%),
      radial-gradient(700px 380px at -10% 110%, rgba(43, 122, 96, 0.25), transparent 55%),
      linear-gradient(160deg, #10382c 0%, #0b2a21 100%);
  }
  .gate-card {
    width: min(420px, 100%);
    background: #fbf8f2;
    border-radius: 26px;
    padding: 42px 36px 36px;
    text-align: center;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
  }
  .gate-logo {
    width: 62px;
    height: 62px;
    margin: 0 auto 18px;
    border-radius: 16px;
    object-fit: cover;
  }
  .gate-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: #c96b3d;
    margin-bottom: 10px;
  }
  .gate-card h1 {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1.7rem;
    font-weight: 600;
    color: #0b2a21;
    margin-bottom: 8px;
  }
  .gate-sub {
    font-size: 0.92rem;
    color: #45524b;
    margin-bottom: 26px;
  }
  .gate-input {
    width: 100%;
    padding: 14px 16px;
    border: 1.5px solid #e3d5bc;
    border-radius: 12px;
    font-family: inherit;
    font-size: 0.95rem;
    background: #fff;
    color: #1c2420;
    margin-bottom: 14px;
    transition: border-color 0.25s ease, box-shadow 0.25s ease;
  }
  .gate-input:focus {
    outline: none;
    border-color: #2b7a60;
    box-shadow: 0 0 0 4px rgba(43, 122, 96, 0.14);
  }
  .gate-btn {
    width: 100%;
    padding: 14px 24px;
    border: none;
    border-radius: 999px;
    background: #c96b3d;
    color: #fff;
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(201, 107, 61, 0.35);
    transition: background 0.25s ease, transform 0.25s ease;
  }
  .gate-btn:hover {
    background: #ad4f24;
    transform: translateY(-1px);
  }
  .gate-error {
    min-height: 20px;
    margin-top: 12px;
    font-size: 0.86rem;
    font-weight: 600;
    color: #b3261e;
  }
  .gate-foot {
    font-size: 0.78rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; }
  }
</style>
</head>
<body>
  <form class="gate-form gate-card" method="post" action="/admin/login">
    <img class="gate-logo" src="/logo-light.png" alt="Logo REGARD FRATERNEL" />
    <p class="gate-eyebrow">Espace d'administration</p>
    <h1>Accès restreint</h1>
    <p class="gate-sub">${requireEmail ? "Entrez l'e-mail et le mot de passe d'accès pour continuer." : "Entrez le mot de passe d'accès pour continuer."}</p>
    ${requireEmail ? '<input class="gate-input" type="email" name="email" placeholder="E-mail administrateur" autocomplete="email" autofocus required />' : ''}
    <input class="gate-input" type="password" name="password" placeholder="Mot de passe d'accès" autocomplete="current-password" ${requireEmail ? '' : 'autofocus'} required />
    <button class="gate-btn" type="submit">Se connecter</button>
    <p class="gate-error">${error}</p>
  </form>
  <p class="gate-foot">REGARD FRATERNEL — ONG · Bénin</p>
</body>
</html>`
}

/** Page affichée si le mot de passe d'accès n'est pas configuré (fail closed). */
function blockedPage() {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Administration indisponible — REGARD FRATERNEL</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: 'Inter', system-ui, sans-serif;
    background: #0b2a21;
    color: #fbf8f2;
  }
  .box { max-width: 460px; text-align: center; line-height: 1.7; }
  h1 { font-size: 1.5rem; margin-bottom: 10px; }
  p { color: rgba(255, 255, 255, 0.7); font-size: 0.95rem; }
</style>
</head>
<body>
  <div class="box">
    <h1>Administration indisponible</h1>
    <p>Le mot de passe d'accès n'est pas configuré sur le serveur (variable ADMIN_GATE_PASSWORD). Contactez l'administrateur du site.</p>
  </div>
</body>
</html>`
}

/* ================= Middleware ================= */

export default async function middleware(request) {
  const url = new URL(request.url)
  const password = process.env.ADMIN_GATE_PASSWORD
  const gateEmail = (process.env.ADMIN_GATE_EMAIL || '').trim().toLowerCase()
  const requireEmail = Boolean(gateEmail)
  const ip = clientIp(request)
  const country = clientCountry(request)

  // /admin → /admin/ (URL canonique : les chemins relatifs des assets en dépendent)
  if (url.pathname === '/admin') {
    return Response.redirect(new URL('/admin/', request.url), 308)
  }

  // Configuration manquante → refus d'accès (jamais d'ouverture par défaut).
  if (!password) {
    log('gate_unconfigured', { ip, country, path: url.pathname })
    return new Response(blockedPage(), { status: 503, headers: securityHeaders() })
  }

  // Soumission du mot de passe sur /admin/login
  if (url.pathname === '/admin/login' && request.method === 'POST') {
    const ttl = windowSeconds()
    const attempts = maxAttempts()

    // 1. Anti force brute : blocage immédiat si trop d'échecs récents (par IP)
    const count = await countFailure(ip, ttl)
    if (count > attempts) {
      log('rate_limited', { ip, country, path: url.pathname, ua: clientUa(request) })
      return new Response(gatePage('Trop de tentatives. Réessayez dans quelques minutes.', requireEmail), {
        status: 429,
        headers: { ...securityHeaders(), 'retry-after': String(ttl) }
      })
    }

    // 2. Vérification e-mail + mot de passe
    const form = await request.formData()
    const enteredEmail = String(form.get('email') || '').trim().toLowerCase()
    const enteredPassword = String(form.get('password') || '')

    const emailOk = !requireEmail || enteredEmail === gateEmail
    const passwordOk = enteredPassword === password

    if (emailOk && passwordOk) {
      await resetFailures(ip)
      log('login_success', { ip, country, email: enteredEmail, ua: clientUa(request) })
      const token = await sha256(password)
      const secure = url.protocol === 'https:' ? '; Secure' : ''
      return new Response(null, {
        status: 302,
        headers: {
          location: '/admin/',
          'set-cookie': `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure}`
        }
      })
    }

    log('login_failed', {
      ip, country, path: url.pathname, email: enteredEmail,
      reason: emailOk ? 'wrong_password' : 'wrong_email', ua: clientUa(request)
    })
    return new Response(gatePage('E-mail ou mot de passe incorrect.', requireEmail), {
      status: 401,
      headers: securityHeaders()
    })
  }

  // Vérification du cookie d'accès
  const cookies = parseCookies(request.headers.get('cookie'))
  const expected = await sha256(password)
  if (cookies[COOKIE_NAME] === expected) {
    return undefined // continue : le fichier demandé est servi normalement
  }

  // Non autorisé : page de connexion pour toute navigation sous /admin,
  // 401 brut uniquement pour les fichiers (JS, CSS…) dont le code ne doit
  // jamais être délivré sans authentification.
  if (url.pathname.startsWith('/admin/assets/')) {
    log('denied_asset', { ip, country, path: url.pathname })
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'content-type': 'text/plain', 'x-content-type-options': 'nosniff' }
    })
  }
  log('denied_page', { ip, country, path: url.pathname })
  return new Response(gatePage('', requireEmail), { status: 401, headers: securityHeaders() })
}

export const config = {
  matcher: ['/admin/:path*']
}
