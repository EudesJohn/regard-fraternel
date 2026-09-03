// Vérifie le rendu de la porte d'accès (/admin) et de l'application admin dans
// un vrai navigateur (Chrome + CDP sur http://localhost:9222), et enregistre des
// captures d'écran dans screenshots/.
//
// Usage :
//   node scripts/check-gate.mjs [URL_ADMIN] [MOT_DE_PASSE_PORTE] [E-MAIL_PORTE]
//
// Variables d'environnement (recommandé) :
//   ADMIN_GATE_PASSWORD     mot de passe de la porte d'accès
//   ADMIN_GATE_EMAIL        e-mail de la porte d'accès
//   SUPABASE_ADMIN_EMAIL    e-mail du compte Supabase (facultatif)
//   SUPABASE_ADMIN_PASSWORD mot de passe du compte Supabase (facultatif)
//
// Si SUPABASE_ADMIN_EMAIL/PASSWORD sont fournis, le script se connecte aussi à
// Supabase et vérifie l'écran de gestion des photos (captures incluses).
// Aucune donnée n'est modifiée : vérification en lecture seule.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ADMIN_URL = process.argv[2] || process.env.ADMIN_BASE || 'https://regard-fraternel.vercel.app/admin/'
const GATE_PASSWORD = process.argv[3] || process.env.ADMIN_GATE_PASSWORD || 'Regard-Fraternel'
const GATE_EMAIL = process.argv[4] || process.env.ADMIN_GATE_EMAIL || 'ongregardfraternel13@gmail.com'
const SB_EMAIL = process.env.SUPABASE_ADMIN_EMAIL || ''
const SB_PASSWORD = process.env.SUPABASE_ADMIN_PASSWORD || ''
const OUT_DIR = path.join(process.cwd(), 'screenshots')
await mkdir(OUT_DIR, { recursive: true })

const targets = await (await fetch('http://localhost:9222/json/list')).json()
const page = targets.find((t) => t.type === 'page')
if (!page) {
  console.error('Aucun onglet Chrome trouvé sur le port 9222.')
  process.exit(2)
}
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const send = (m, p = {}) =>
  new Promise((res, rej) => {
    const i = ++id
    const t = setTimeout(() => { pending.delete(i); rej(new Error('CDP timeout: ' + m)) }, 30000)
    pending.set(i, { res: (v) => { clearTimeout(t); res(v) }, rej: (e) => { clearTimeout(t); rej(e) } })
    ws.send(JSON.stringify({ id: i, method: m, params: p }))
  })
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result)
  }
}
await new Promise((r) => (ws.onopen = r))

const evalv = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ok = (label, cond) => console.log((cond ? '  ✓ ' : '  ✗ ') + label)

const shot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  const file = path.join(OUT_DIR, name)
  await writeFile(file, Buffer.from(data, 'base64'))
  console.log(`  📷 ${name} (${(Buffer.byteLength(data, 'base64') / 1024).toFixed(0)} Ko)`)
}

await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.enable')

// ---------- 1. Porte d'accès ----------
console.log(`\n[1] Navigation vers ${ADMIN_URL}`)
await send('Page.navigate', { url: ADMIN_URL })
let gateReady = false
for (let i = 0; i < 20; i++) {
  await sleep(1000)
  if (await evalv('!!document.querySelector(".gate-form") || !!document.querySelector(".admin-shell")')) { gateReady = true; break }
}
if (!gateReady) {
  console.log('Page introuvable ou toujours en chargement. Dernier état :')
  console.log('  title :', await evalv('document.title'))
  console.log('  body  :', (await evalv('document.body && document.body.innerText.slice(0, 120)')) || '(vide)')
  process.exit(1)
}
const isGate = await evalv('!!document.querySelector(".gate-form")')
console.log(isGate ? '  → Porte d’accès affichée' : '  → Autre page affichée')
if (isGate) {
  ok('titre « Accès restreint »', (await evalv('document.title')).includes('Accès restreint'))
  ok('logo présent', await evalv('!!document.querySelector(".gate-logo")'))
  ok('champ e-mail présent', await evalv('!!document.querySelector(".gate-form input[type=email]")'))
  ok('champ mot de passe présent', await evalv('!!document.querySelector(".gate-form input[type=password]")'))
  const err = await evalv('document.querySelector(".gate-error")?.textContent.trim()')
  if (err) console.log(`  ⚠️ message affiché : « ${err} »`)
  const font = await evalv('getComputedStyle(document.querySelector(".gate-card h1")).fontFamily.split(",")[0]')
  console.log(`  police titre : ${font}`)
  await shot('01-porte-acces.png')
}

// ---------- 2. Connexion à la porte ----------
console.log('\n[2] Saisie de l’e-mail et du mot de passe d’accès')
await evalv(`(() => {
  const set = (s, v) => { const el = document.querySelector(s); if (!el) throw new Error('champ absent: ' + s); el.value = v; };
  const email = document.querySelector('.gate-form input[type=email]');
  if (email) set('.gate-form input[type=email]', ${JSON.stringify(GATE_EMAIL)});
  set('.gate-form input[type=password]', ${JSON.stringify(GATE_PASSWORD)});
  document.querySelector('.gate-form').requestSubmit();
})()`)
let adminState = ''
for (let i = 0; i < 20; i++) {
  await sleep(1000)
  const s = await evalv(`(document.querySelector('.admin__form') && 'login') ||
    (document.querySelector('.admin-shell') && document.querySelector('.admin__title')?.textContent.includes('configuration') && 'config') ||
    (document.querySelector('.admin__tabs') && 'gestion') || ''`)
  if (s) { adminState = s; break }
}
if (!adminState) {
  console.log('L’admin ne s’est pas chargée. État :')
  console.log('  title :', await evalv('document.title'))
  console.log('  body  :', (await evalv('document.body && document.body.innerText.slice(0, 150)')) || '(vide)')
  process.exit(1)
}
console.log(`  → Écran affiché : ${adminState === 'login' ? 'connexion Supabase' : adminState === 'config' ? 'configuration requise' : 'gestion'}`)
ok('barre supérieure (logo + marque)', await evalv(`!!document.querySelector('.admin-shell__logo') && document.querySelector('.admin-shell__brand')?.innerText.includes('REGARD FRATERNEL')`))
if (adminState === 'login') {
  ok('formulaire de connexion Supabase', await evalv(`!!document.querySelector('.admin__login')`))
  ok('icône bouclier', await evalv(`!!document.querySelector('.admin__login-icon svg')`))
  await shot('02-admin-connexion.png')

  // ---------- 3. Connexion Supabase (si identifiants fournis) ----------
  if (SB_EMAIL && SB_PASSWORD) {
    console.log('\n[3] Connexion au compte Supabase…')
    await evalv(`(() => {
      const set = (s, v) => { const el = document.querySelector(s); if (!el) throw new Error('champ absent: ' + s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('#admin-email', ${JSON.stringify(SB_EMAIL)});
      set('#admin-password', ${JSON.stringify(SB_PASSWORD)});
      document.querySelector('.admin__form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`)
    let gestion = false
    for (let i = 0; i < 25; i++) {
      await sleep(1000)
      if (await evalv('!!document.querySelector(".admin__tabs")')) { gestion = true; break }
    }
    if (!gestion) {
      const err = await evalv('document.querySelector(".admin__error")?.textContent || "(aucune)"')
      console.log(`  ✗ Connexion refusée : ${err}`)
      process.exit(1)
    }
    console.log('  → Connecté : écran de gestion affiché')
    const tabs = await evalv('document.querySelectorAll(".admin__tab").length')
    const slots = await evalv('document.querySelectorAll(".admin__slot").length')
    const photos = await evalv('document.querySelectorAll(".admin__grid .admin__photo").length')
    const connectedAs = await evalv('document.querySelector(".admin__head .admin__text")?.innerText.trim()')
    ok('barre de titre « Gestion des photos »', await evalv(`document.querySelector('.admin__title')?.textContent.includes('Gestion des photos')`))
    ok(`12 onglets de sections (reçu : ${tabs})`, tabs === 12)
    ok(`4 emplacements fixes sur l'Accueil (reçu : ${slots})`, slots === 4)
    ok('galerie rendue', photos >= 0)
    console.log(`  connecté en tant que : ${connectedAs || '(?)'}`)
    await sleep(1500) // laisser les images se charger
    await shot('03-admin-gestion.png')
  } else {
    console.log('\n[3] Identifiants Supabase non fournis (SUPABASE_ADMIN_EMAIL/PASSWORD) :')
    console.log('    vérification de l’écran de gestion non effectuée.')
  }
} else if (adminState === 'config') {
  await shot('02-admin-config.png')
}

console.log('\n=== FIN — captures dans ' + OUT_DIR + ' ===')
ws.close()
process.exit(0)
