// Restaure l'état de production après un test interrompu :
// - repasse l'emplacement « cta » de l'Accueil à « Photo par défaut »
// - efface une éventuelle légende de test laissée sur cet emplacement
// Utilise Chrome + CDP sur http://localhost:9222 (même profil que le test).
// Usage : ADMIN_GATE_PASSWORD=… node scripts/restore-cta.mjs
const ADMIN_BASE = process.env.ADMIN_BASE || 'https://regard-fraternel.vercel.app/admin/'
const gatePw = process.env.ADMIN_GATE_PASSWORD
const gateEmail = process.env.ADMIN_GATE_EMAIL || 'ongregardfraternel13@gmail.com'

const targets = await (await fetch('http://localhost:9222/json/list')).json()
const page = targets.find((t) => t.type === 'page')
if (!page) { console.error('Aucun onglet Chrome trouvé sur le port 9222.'); process.exit(2) }
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

// Accepter automatiquement les dialogues confirm() (natif ou en cours)
await send('Page.enable')
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.method === 'Page.javascriptDialogOpening') {
    console.log('  (dialogue confirm accepté automatiquement)')
    send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {})
  }
})
await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.confirm = () => true;' })

await send('Page.navigate', { url: ADMIN_BASE })
await sleep(3000)

// Porte d'accès si le cookie a expiré
if (await evalv('!!document.querySelector(".gate-form")')) {
  if (!gatePw) { console.error('Porte active et ADMIN_GATE_PASSWORD absent.'); process.exit(1) }
  console.log('Porte d\'accès : connexion…')
  await evalv(`(() => {
    const set = (s, v) => { const el = document.querySelector(s); if (!el) throw new Error('champ absent: ' + s); el.value = v; };
    const email = document.querySelector('.gate-form input[type=email]');
    if (email) set('.gate-form input[type=email]', ${JSON.stringify(gateEmail)});
    set('.gate-form input[type=password]', ${JSON.stringify(gatePw)});
    document.querySelector('.gate-form').requestSubmit();
  })()`)
}

// Attendre l'interface admin (session Supabase persistée ou formulaire)
let ready = false
for (let i = 0; i < 20; i++) {
  await sleep(1000)
  if (await evalv('!!document.querySelector(".admin__tabs")')) { ready = true; break }
  if (await evalv('!!document.querySelector(".admin__form")')) break
}
if (!ready) {
  console.log('Interface admin non visible. État :', await evalv('document.body && document.body.innerText.slice(0, 120)'))
  process.exit(1)
}
if (!(await evalv('!!document.querySelector(".admin__tabs")'))) {
  console.log('Session Supabase expirée : formulaire de connexion affiché — connectez-vous à la main ou relancez avec une session valide.')
  process.exit(1)
}
console.log('Interface admin visible.')
await evalv('window.confirm = () => true')

// Légende de test éventuellement laissée
const caption = await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-caption input")?.value || ""')
console.log('Légende actuelle de « cta » :', JSON.stringify(caption))
if (caption.trim()) {
  await evalv(`(() => {
    const input = document.querySelectorAll('.admin__slot')[3]?.querySelector('.admin__slot-caption input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelectorAll('.admin__slot')[3]?.querySelector('.admin__slot-caption .btn').click();
  })()`)
  await sleep(2500)
  ok('Légende de test effacée', (await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-caption input")?.value || ""')) === '')
}

// Restauration de la photo par défaut
const badge = await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-badge")?.textContent.trim()')
console.log('Badge actuel de « cta » :', badge)
if (badge === 'Personnalisée') {
  await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__icon-btn--danger").click()')
  let restored = false
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    if ((await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-badge")?.textContent.trim()')) === 'Photo par défaut') { restored = true; break }
  }
  ok('Emplacement « cta » restauré (Photo par défaut)', restored)
} else {
  ok('Emplacement « cta » déjà sur la photo par défaut', true)
}

// Vérification finale sur le site public
await send('Page.navigate', { url: 'https://regard-fraternel.vercel.app/' })
await sleep(6000)
const ctaBg = await evalv('getComputedStyle(document.querySelector(".cta-band__bg")).backgroundImage')
ok('Accueil : le fond CTA est revenu à la photo locale', !ctaBg.includes('supabase.co'))
console.log('   (fond :', ctaBg.slice(0, 110) + '…)')

console.log('\n=== RESTAURATION TERMINÉE ===')
ws.close()
process.exit(0)
