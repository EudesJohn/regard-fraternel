// ============================================================
// Tests du middleware Vercel (porte d'accès /admin)
// Exécution : npm test  (runner natif Node, aucune dépendance)
// Simule les requêtes avec l'API Request standard.
// ============================================================
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

process.env.ADMIN_GATE_PASSWORD = 'mot-de-passe-de-test-securise'
process.env.ADMIN_GATE_EMAIL = 'admin@regardfraternel.org'
process.env.ADMIN_GATE_MAX_ATTEMPTS = '3'
process.env.ADMIN_GATE_WINDOW_SECONDS = '600'

const middleware = (await import('../middleware.js')).default
const COOKIE_NAME = 'rf_admin_gate'

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex')

/** Construit une requête de test. */
const req = (path, init = {}) =>
  new Request(`https://regard-fraternel.vercel.app${path}`, {
    redirect: 'manual',
    ...init
  })

/** Requête POST /admin/login avec formulaire. */
const loginReq = ({ email, password, origin, referer, host } = {}) => {
  const body = new URLSearchParams()
  if (email !== undefined) body.set('email', email)
  if (password !== undefined) body.set('password', password)
  const headers = { 'content-type': 'application/x-www-form-urlencoded' }
  if (origin) headers.origin = origin
  if (referer) headers.referer = referer
  if (host) headers.host = host
  return req('/admin/login', { method: 'POST', body, headers })
}

/** Réinitialise le rate limiter (Upstash absent → store mémoire). */
const fresh = () => {
  // Chaque import initialisé une seule fois : on isole via des IP uniques par test.
  let counter = 0
  return () => `10.0.${Math.floor(counter / 250)}.${(counter++) % 250}`
}
const nextIp = fresh()

before(() => {
  // Rien : le middleware lit process.env à chaque appel.
})

after(() => {
  delete process.env.ADMIN_GATE_PASSWORD
  delete process.env.ADMIN_GATE_EMAIL
})

/* ================= Comportement général ================= */

describe('porte admin — comportement général', () => {
  test('503 fail-closed si ADMIN_GATE_PASSWORD absente', async () => {
    delete process.env.ADMIN_GATE_PASSWORD
    const res = await middleware(req('/admin/'))
    assert.equal(res.status, 503)
    assert.match(await res.text(), /indisponible/i)
    process.env.ADMIN_GATE_PASSWORD = 'mot-de-passe-de-test-securise'
  })

  test('/admin redirige 308 vers /admin/', async () => {
    const res = await middleware(req('/admin'))
    assert.equal(res.status, 308)
    assert.equal(res.headers.get('location'), 'https://regard-fraternel.vercel.app/admin/')
  })

  test('401 + page de connexion sans cookie', async () => {
    const res = await middleware(req('/admin/'))
    assert.equal(res.status, 401)
    const html = await res.text()
    assert.match(html, /gate-form/)
    assert.match(html, /noindex/)
  })

  test('401 brut sur les assets (code source jamais servi)', async () => {
    const res = await middleware(req('/admin/assets/index-abc123.js'))
    assert.equal(res.status, 401)
    assert.equal(await res.text(), 'Unauthorized')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  })

  test('en-têtes de sécurité présents sur la page de connexion', async () => {
    const res = await middleware(req('/admin/'))
    assert.equal(res.headers.get('x-frame-options'), 'DENY')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.match(res.headers.get('content-security-policy') || '', /frame-ancestors 'none'/)
    assert.match(res.headers.get('content-security-policy') || '', /script-src 'none'/)
  })

  test('undefined (continuer) avec le bon cookie', async () => {
    const res = await middleware(
      req('/admin/', { headers: { cookie: `${COOKIE_NAME}=${sha256('mot-de-passe-de-test-securise')}` } })
    )
    assert.equal(res, undefined)
  })

  test('cookie invalide ou forgé → 401', async () => {
    const cases = [
      `${COOKIE_NAME}=deadbeef`,
      `${COOKIE_NAME}=`, // vide → rejeté (présence exigée)
      `${COOKIE_NAME.toUpperCase()}=${sha256('mot-de-passe-de-test-securise')}`
    ]
    for (const cookie of cases) {
      const res = await middleware(req('/admin/', { headers: { cookie } }))
      assert.equal(res.status, 401, `cookie « ${cookie} » aurait dû être refusé`)
    }
  })
})

/* ================= Connexion ================= */

describe('porte admin — connexion', () => {
  test('302 + cookie HttpOnly/Secure/SameSite avec identifiants corrects', async () => {
    const res = await middleware(loginReq({
      email: 'admin@regardfraternel.org',
      password: 'mot-de-passe-de-test-securise',
      host: 'regard-fraternel.vercel.app'
    }))
    assert.equal(res.status, 302)
    assert.equal(res.headers.get('location'), '/admin/')
    const cookie = res.headers.get('set-cookie') || ''
    assert.match(cookie, new RegExp(`${COOKIE_NAME}=${sha256('mot-de-passe-de-test-securise')}`))
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /Secure/i)
    assert.match(cookie, /SameSite=Lax/i)
  })

  test('401 avec message générique si mot de passe faux', async () => {
    const res = await middleware(loginReq({
      email: 'admin@regardfraternel.org',
      password: 'mauvais-mot-de-passe',
      host: 'regard-fraternel.vercel.app'
    }))
    assert.equal(res.status, 401)
    const html = await res.text()
    assert.match(html, /incorrect/)
    assert.doesNotMatch(html, /supabase|postgres|stack|erreur interne/i)
  })

  test('401 si e-mail faux (message identique : pas d énumération)', async () => {
    const res = await middleware(loginReq({
      email: 'inconnu@exemple.com',
      password: 'mot-de-passe-de-test-securise',
      host: 'regard-fraternel.vercel.app'
    }))
    assert.equal(res.status, 401)
    assert.match(await res.text(), /incorrect/)
  })

  test('403 si Origin cross-origin (anti-CSRF)', async () => {
    const res = await middleware(loginReq({
      email: 'admin@regardfraternel.org',
      password: 'mot-de-passe-de-test-securise',
      origin: 'https://evil.example.com',
      host: 'regard-fraternel.vercel.app'
    }))
    assert.equal(res.status, 403)
    assert.equal(await res.text(), 'Forbidden')
  })

  test('403 si Referer cross-origin', async () => {
    const res = await middleware(loginReq({
      email: 'admin@regardfraternel.org',
      password: 'mot-de-passe-de-test-securise',
      referer: 'https://evil.example.com/login',
      host: 'regard-fraternel.vercel.app'
    }))
    assert.equal(res.status, 403)
  })

  test('soumission sans Origin/Referer acceptée (moteur de test, curl…)', async () => {
    const res = await middleware(loginReq({
      email: 'admin@regardfraternel.org',
      password: 'mot-de-passe-de-test-securise',
      host: 'regard-fraternel.vercel.app'
    }))
    assert.equal(res.status, 302)
  })

  test('mode sha256: — connexion avec l empreinte en variable d env', async () => {
    const hash = sha256('mot-de-passe-de-test-securise')
    process.env.ADMIN_GATE_PASSWORD = `sha256:${hash}`
    const res = await middleware(loginReq({
      email: 'admin@regardfraternel.org',
      password: 'mot-de-passe-de-test-securise', // le secret en clair côté client
      host: 'regard-fraternel.vercel.app'
    }))
    assert.equal(res.status, 302)
    const cookie = res.headers.get('set-cookie') || ''
    assert.match(cookie, new RegExp(`${COOKIE_NAME}=${hash}`)) // token = empreinte
    process.env.ADMIN_GATE_PASSWORD = 'mot-de-passe-de-test-securise'
  })

  test('mode sha256: — le mot de passe en clair COMME variable échoue', async () => {
    // Si l'opérateur colle le hash « sha256:xxx » et que l attaquant saisit
    // « sha256:xxx » comme mot de passe : la comparaison porte sur l empreinte
    // de la saisie, pas sur la chaîne littérale.
    const hash = sha256('mot-de-passe-de-test-securise')
    process.env.ADMIN_GATE_PASSWORD = `sha256:${hash}`
    const res = await middleware(loginReq({
      email: 'admin@regardfraternel.org',
      password: `sha256:${hash}`,
      host: 'regard-fraternel.vercel.app'
    }))
    assert.equal(res.status, 401)
    process.env.ADMIN_GATE_PASSWORD = 'mot-de-passe-de-test-securise'
  })
})

/* ================= Anti force brute ================= */

describe('porte admin — anti force brute', () => {
  test('429 après ADMIN_GATE_MAX_ATTEMPTS échecs (compteur par IP)', async () => {
    const ip = nextIp()
    const attempt = (password) =>
      middleware(
        req('/admin/login', {
          method: 'POST',
          headers: {
            'x-forwarded-for': ip,
            host: 'regard-fraternel.vercel.app',
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({ email: 'admin@regardfraternel.org', password })
        })
      )

    // 3 échecs tolérés (MAX_ATTEMPTS=3)
    for (let i = 0; i < 3; i++) {
      const r = await attempt('encore-faux')
      assert.equal(r.status, 401, `échec n°${i + 1} doit renvoyer 401`)
    }

    // 4e tentative → 429 (compteur > MAX_ATTEMPTS), même avec le BON mot de passe
    const blocked = await attempt('mot-de-passe-de-test-securise')
    assert.equal(blocked.status, 429)
    assert.match(await blocked.text(), /Trop de tentatives/)
    assert.equal(blocked.headers.get('retry-after'), '600')
  })

  test('les IPs différentes ne se bloquent pas entre elles', async () => {
    const a = nextIp()
    const b = nextIp()
    const attempt = (ip, password) =>
      middleware(
        req('/admin/login', {
          method: 'POST',
          headers: {
            'x-forwarded-for': ip,
            host: 'regard-fraternel.vercel.app',
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({ email: 'admin@regardfraternel.org', password })
        })
      )
    await attempt(a, 'faux-1')
    await attempt(a, 'faux-2')
    // Une seule tentative pour b : pas de blocage.
    const res = await attempt(b, 'mot-de-passe-de-test-securise')
    assert.equal(res.status, 302)
  })

  test('la connexion réussie réinitialise le compteur (via resetFailures)', async () => {
    const ip = nextIp()
    const attempt = (password) =>
      middleware(
        req('/admin/login', {
          method: 'POST',
          headers: {
            'x-forwarded-for': ip,
            host: 'regard-fraternel.vercel.app',
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({ email: 'admin@regardfraternel.org', password })
        })
      )
    // 1 seul échec puis succès : le compteur repart à zéro (resetFailures).
    await attempt('faux-a')
    const ok = await attempt('mot-de-passe-de-test-securise')
    assert.equal(ok.status, 302)
    // MAX_ATTEMPTS=3 : si le compteur n'était PAS réinitialisé, ces 3 échecs
    // suivants pousseraient le total à 4 → 429. Un 401 prouve le reset.
    for (let i = 0; i < 3; i++) {
      const again = await attempt(`faux-${i}`)
      assert.equal(again.status, 401, `échec n°${i + 1} après reset : 401 attendu (pas 429)`)
    }
  })
})

/* ================= Journalisation ================= */

describe('porte admin — journalisation', () => {
  test('les valeurs de log sont nettoyées (anti log injection)', async () => {
    const lines = []
    const original = console.log
    console.log = (...args) => lines.push(String(args[0]))
    try {
      await middleware(
        req('/admin/', {
          headers: {
            'user-agent': 'bot"/>\u001f<script>'
          }
        })
      )
    } finally {
      console.log = original
    }
    const logged = lines.join('\n')
    // Chaque ligne reste du JSON exploitable, sans caractère de contrôle brut.
    for (const line of lines) {
      if (!line.startsWith('{')) continue
      assert.doesNotMatch(line, /[\u0000-\u001f]/, 'caractère de contrôle brut dans les logs')
      assert.doesNotMatch(line, /<script>/)
    }
    assert.ok(logged.length > 0)
  })
})
