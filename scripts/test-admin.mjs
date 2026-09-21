// Test admin de bout en bout (Chrome + CDP sur http://localhost:9222).
// Usage : node scripts/test-admin.mjs <EMAIL> <MOT_DE_PASSE>
// Le test : connexion → remplacer la photo de l'emplacement « cta » de l'Accueil
// → vérifier sur le site → légende → restaurer la photo par défaut
// → ajouter puis supprimer une photo libre. Tout est restauré à la fin.
// NB : l'admin est servie à /admin sur le même domaine, derrière la porte
// d'accès (middleware Vercel). Si le mot de passe de la porte est fourni via
// l'environnement ADMIN_GATE_PASSWORD, le test le saisit automatiquement.
const [email, password] = process.argv.slice(2)
if (!email || !password) {
  console.error('Usage : node scripts/test-admin.mjs <EMAIL> <MOT_DE_PASSE>')
  process.exit(2)
}

const ADMIN_BASE = process.env.ADMIN_BASE || 'https://regard-fraternel.vercel.app/admin/'
const PUBLIC_BASE = 'https://regard-fraternel.vercel.app'
const TEST_IMG = 'D:/Regard fraternel/regard-fraternel-site/public/images/photos/don/don-01.jpg'

const targets = await (await fetch('http://localhost:9222/json/list')).json()
const page = targets.find((t) => t.type === 'page')
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
// Garde-fou global : le test ne doit pas dépasser 5 minutes
setTimeout(() => { console.error('Timeout global (5 min)'); process.exit(1) }, 300000).unref()
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

// Accepter automatiquement les confirm() (restauration / suppression)
await send('Page.enable')
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.method === 'Page.javascriptDialogOpening') {
    send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {})
  }
})
await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.confirm = () => true;' })

// Attendre que l'interface admin soit réellement rendue (après navigation)
const waitAdmin = async () => {
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    const ready = await evalv('!!document.querySelector(".admin__tabs") && document.querySelectorAll(".admin__slot").length >= 4')
    if (ready) return true
  }
  return false
}

// ---------- Porte d'accès (middleware /admin) ----------
await send('Page.navigate', { url: ADMIN_BASE })
await sleep(2500)
if (await evalv('!!document.querySelector(".gate-form")')) {
  const gatePw = process.env.ADMIN_GATE_PASSWORD
  const gateEmail = process.env.ADMIN_GATE_EMAIL || 'ongregardfraternel13@gmail.com'
  if (!gatePw) {
    console.error('La porte d\'accès /admin est active : définissez ADMIN_GATE_PASSWORD ou débloquez-la à la main dans le navigateur testé.')
    process.exit(1)
  }
  console.log('Porte d\'accès : saisie de l\'e-mail et du mot de passe…')
  await evalv(`(() => {
    const set = (s, v) => { const el = document.querySelector(s); if (!el) throw new Error('champ absent: ' + s); el.value = v; };
    const email = document.querySelector('.gate-form input[type=email]');
    if (email) set('.gate-form input[type=email]', ${JSON.stringify(gateEmail)});
    set('.gate-form input[type=password]', ${JSON.stringify(gatePw)});
    document.querySelector('.gate-form').requestSubmit();
  })()`)
}

// ---------- Connexion ----------
// Attendre que le formulaire de connexion Supabase soit réellement rendu
let formReady = false
for (let i = 0; i < 15; i++) {
  await sleep(1000)
  if (await evalv('!!document.querySelector(".admin__form")')) { formReady = true; break }
}
console.log('Formulaire de connexion :', formReady ? 'visible' : 'introuvable')
// Surcharge confirm() directement dans le document vivant
await evalv('window.confirm = () => true')
await evalv(`(() => {
  const set = (s, v) => { const el = document.querySelector(s); if (!el) throw new Error('champ absent: ' + s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  set('#admin-email', ${JSON.stringify(email)});
  set('#admin-password', ${JSON.stringify(password)});
  const form = document.querySelector('.admin__form');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
})()`)
console.log('Connexion admin…')

let loggedIn = false
for (let i = 0; i < 20; i++) {
  await sleep(1000)
  if (await evalv('!!document.querySelector(".admin__tabs")')) { loggedIn = true; break }
}
ok('Connexion réussie (interface admin visible)', loggedIn)
if (!loggedIn) {
  console.log('Erreur affichée :', await evalv('document.querySelector(".admin__error")?.textContent || "(aucune)"'))
  process.exit(1)
}

// ---------- Pré-nettoyage (exécution précédente interrompue ?) ----------
const ctaCustomBefore = await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-badge")?.textContent.trim() === "Personnalisée"')
if (ctaCustomBefore) {
  console.log('Pré-nettoyage : restauration de l\'emplacement « cta » laissé personnalisé…')
  await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__icon-btn--danger").click()')
  for (let i = 0; i < 15; i++) {
    await sleep(1000)
    if ((await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-badge")?.textContent.trim()')) === 'Photo par défaut') break
  }
}

// ---------- État initial ----------
const tabs = await evalv('document.querySelectorAll(".admin__tab").length')
ok(`13 onglets de sections affichés (reçu : ${tabs})`, tabs === 13)
const slotCount = await evalv('document.querySelectorAll(".admin__slot").length')
ok(`4 emplacements fixes sur l'Accueil (reçu : ${slotCount})`, slotCount === 4)
const badgeCta = await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-badge")?.textContent.trim()')
ok(`Emplacement « cta » en « ${badgeCta} »`, badgeCta === 'Photo par défaut')

// ---------- 1. Remplacer la photo de l'emplacement « cta » ----------
const { root } = await send('DOM.getDocument')
const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '.admin__slot:nth-child(4) input[type=file]' })
await send('DOM.setFileInputFiles', { nodeId, files: [TEST_IMG] })
console.log('Remplacement de la photo « cta » en cours…')
let custom = false
for (let i = 0; i < 25; i++) {
  await sleep(1000)
  if ((await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-badge")?.textContent.trim()')) === 'Personnalisée') { custom = true; break }
}
ok('Badge passé à « Personnalisée »', custom)

// Vérification sur le site : le fond « Rejoignez REGARD FRATERNEL » utilise la nouvelle photo
await send('Page.navigate', { url: PUBLIC_BASE + '/' })
await sleep(6000)
const ctaBg = await evalv('getComputedStyle(document.querySelector(".cta-band__bg")).backgroundImage')
const ctaCustom = ctaBg.includes('supabase.co')
ok('Accueil : le fond CTA utilise la photo Supabase', ctaCustom)
console.log('   (fond :', ctaBg.slice(0, 110) + '…)')

// ---------- 2. Légende ----------
await send('Page.navigate', { url: ADMIN_BASE })
if (!(await waitAdmin())) {
  console.log('Admin non rendue après navigation. État :', await evalv('document.body && document.body.innerText.slice(0, 120)'))
  process.exit(1)
}
const captionInput = await evalv('!!document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-caption input")')
ok('champ légende de l\'emplacement « cta » rendu', captionInput)
await evalv(`(() => {
  const input = document.querySelectorAll('.admin__slot')[3]?.querySelector('.admin__slot-caption input');
  if (!input) return;
  input.value = 'Test légende admin';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelectorAll('.admin__slot')[3]?.querySelector('.admin__slot-caption .btn').click();
})()`)
let saved = false
for (let i = 0; i < 10; i++) {
  await sleep(1000)
  if (await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__saved")?.textContent.includes("Enregistré")')) { saved = true; break }
}
ok('Légende enregistrée (« Enregistré ✓ » affiché)', saved)

// ---------- 3. Restaurer la photo par défaut ----------
await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__icon-btn--danger").click()')
let restored = false
for (let i = 0; i < 15; i++) {
  await sleep(1000)
  if ((await evalv('document.querySelectorAll(".admin__slot")[3]?.querySelector(".admin__slot-badge")?.textContent.trim()')) === 'Photo par défaut') { restored = true; break }
}
ok('Emplacement « cta » restauré (photo par défaut)', restored)

await send('Page.navigate', { url: PUBLIC_BASE + '/' })
await sleep(6000)
const ctaBg2 = await evalv('getComputedStyle(document.querySelector(".cta-band__bg")).backgroundImage')
ok('Accueil : le fond CTA est revenu à la photo locale', !ctaBg2.includes('supabase.co'))

// ---------- 4. Ajout puis suppression d'une photo libre (galerie Accueil) ----------
await send('Page.navigate', { url: ADMIN_BASE })
if (!(await waitAdmin())) {
  console.log('Admin non rendue après navigation. État :', await evalv('document.body && document.body.innerText.slice(0, 120)'))
  process.exit(1)
}
await sleep(1000)
const countBefore = await evalv('document.querySelectorAll(".admin__grid .admin__photo").length')
console.log(`Galerie Accueil : ${countBefore} photo(s) avant test`)
const { root: r2 } = await send('DOM.getDocument')
const { nodeId: fileInput } = await send('DOM.querySelector', { nodeId: r2.nodeId, selector: '.admin__add .admin__file input[type=file]' })
await send('DOM.setFileInputFiles', { nodeId: fileInput, files: [TEST_IMG] })
await sleep(2000)
await evalv('Array.from(document.querySelectorAll(".admin__add .btn")).find(b => b.textContent.includes("Ajouter")).click()')
let added = false
for (let i = 0; i < 15; i++) {
  await sleep(1000)
  if ((await evalv('document.querySelectorAll(".admin__grid .admin__photo").length')) === countBefore + 1) { added = true; break }
}
ok(`Photo libre ajoutée (${countBefore} → ${countBefore + 1})`, added)

// Suppression de la photo ajoutée (dernière de la grille)
if (added) {
  await evalv('Array.from(document.querySelectorAll(".admin__photo")).pop().querySelector(".admin__icon-btn--danger").click()')
  let removed = false
  for (let i = 0; i < 15; i++) {
    await sleep(1000)
    if ((await evalv('document.querySelectorAll(".admin__grid .admin__photo").length')) === countBefore) { removed = true; break }
  }
  ok('Photo libre supprimée (retour à l’état initial)', removed)
}

console.log('\n=== FIN DU TEST ===')
ws.close()
process.exit(0)
