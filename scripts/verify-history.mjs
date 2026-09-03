// Vérification du passage au history mode (URLs sans #) :
//  1. Accès direct à une route (/gouvernance) → la page se rend (fallback SPA)
//  2. Navigation via les liens → URL propre, sans '#'
//  3. Ancien lien en hash (#/gouvernance) → redirigé vers /gouvernance
//  4. Route imbriquée (/actions/sanitaire) → se rend correctement
// Utilise Chrome + CDP sur http://localhost:9222
const BASE = 'http://localhost:4173'

async function main() {
  const targets = await (await fetch('http://localhost:9222/json/list')).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const send = (m, p = {}) =>
    new Promise((res, rej) => {
      const i = ++id
      pending.set(i, { res, rej })
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
  const ok = (label, cond, extra = '') => console.log((cond ? '  ✓ ' : '  ✗ ') + label + (extra ? '  (' + extra + ')' : ''))

  // ---------- 1. Accès direct à /gouvernance ----------
  await send('Page.navigate', { url: BASE + '/gouvernance' })
  await sleep(3500)
  const url1 = await evalv('location.href')
  const title1 = await evalv('document.title')
  const prez = await evalv('!!document.querySelector(".bureau__grid")')
  ok('Accès direct /gouvernance : URL sans #', !url1.includes('#'), url1)
  ok('  → page Gouvernance rendue', prez)
  ok('  → titre = ' + title1, title1.includes('Gouvernance'))

  // ---------- 2. Navigation via les liens (navbar) ----------
  await evalv(`(() => {
    const link = [...document.querySelectorAll('.nav__link')].find(l => l.textContent.trim().toLowerCase().includes('contact'))
    if (link) link.click()
  })()`)
  await sleep(2500)
  const url2 = await evalv('location.href')
  const contact = await evalv('!!document.querySelector(".contact") || !!document.querySelector("form") || document.body.innerText.includes("contact")')
  ok('Navigation vers /contact : URL propre', url2 === BASE + '/contact', url2)
  ok('  → page Contact rendue', contact)

  // ---------- 3. Ancien lien en hash → redirection ----------
  await send('Page.navigate', { url: BASE + '/#/gouvernance' })
  await sleep(3500)
  const url3 = await evalv('location.href')
  const prez3 = await evalv('!!document.querySelector(".bureau__grid")')
  ok('Ancien lien #/gouvernance redirigé vers /gouvernance', url3 === BASE + '/gouvernance', url3)
  ok('  → page Gouvernance rendue après redirection', prez3)

  // ---------- 4. Route imbriquée /actions/sanitaire ----------
  await send('Page.navigate', { url: BASE + '/actions/sanitaire' })
  await sleep(3500)
  const url4 = await evalv('location.href')
  const actionPage = await evalv('!!document.querySelector(".action-detail") || document.body.innerText.includes("sanitaire") || document.body.innerText.length > 500')
  ok('Route imbriquée /actions/sanitaire', url4 === BASE + '/actions/sanitaire' && actionPage, url4)

  // ---------- 5. Retour accueil (bouton logo) ----------
  await send('Page.navigate', { url: BASE + '/' })
  await sleep(3000)
  const url5 = await evalv('location.href')
  const hero = await evalv('!!document.querySelector(".hero")')
  ok('Accueil : URL propre /', url5 === BASE + '/', url5)
  ok('  → page Accueil rendue', hero)

  ws.close()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
