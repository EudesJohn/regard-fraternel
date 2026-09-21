// Vérification « aucune image cassée » sur toutes les pages via Chrome DevTools Protocol.
// Usage : node scripts/check-images.mjs  (Chrome doit tourner avec --remote-debugging-port=9222)
const routes = ['', 'apropos', 'actions', 'actions/sanitaire', 'actions/scolaire', 'actions/jeux', 'actions/don', 'gouvernance', 'histoires', 'don', 'adhesion', 'partenaires', 'contact']
const BASE = 'http://localhost:4173/'

async function main() {
  // Cible PAGE (pas le browser) pour pouvoir utiliser Page.navigate
  const targets = await (await fetch('http://localhost:9222/json/list')).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id
      pending.set(msgId, { resolve, reject })
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    }
  }
  await new Promise((r) => (ws.onopen = r))

  const evaluate = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    return res.result.value
  }

  let totalBroken = 0
  for (const route of routes) {
    await send('Page.navigate', { url: BASE + route })
    // Attendre le chargement + un peu pour les images lazy
    await new Promise((r) => setTimeout(r, 6000))
    const report = await evaluate(`(() => {
      const broken = []
      document.querySelectorAll('img').forEach((img) => {
        if (img.complete && img.naturalWidth === 0) broken.push(img.src)
      })
      // Fonds CSS : tester les images d'arrière-plan
      const bg = new Set()
      document.querySelectorAll('*').forEach((el) => {
        const s = getComputedStyle(el).backgroundImage
        if (s && s !== 'none' && s.includes('url(')) bg.add(s)
      })
      const bgBroken = []
      bg.forEach((s) => {
        const m = s.match(/url\\(["']?([^"')]+)["']?\\)/)
        if (!m) return
        const url = m[1]
        const img = new Image()
        img.src = url
        if (img.complete && img.naturalWidth === 0) bgBroken.push(url)
      })
      return { broken, bgBroken, total: document.images.length }
    })()`)
    const status = report.broken.length || report.bgBroken.length ? '✗ CASSÉ' : '✓ ok'
    console.log((route || 'accueil').padEnd(20), status.padEnd(8), 'img:', report.total, 'cassées:', report.broken.length, 'fond cassés:', report.bgBroken.length)
    if (report.broken.length) console.log('   ', report.broken.join('\n    '))
    if (report.bgBroken.length) console.log('   ', report.bgBroken.join('\n    '))
    totalBroken += report.broken.length + report.bgBroken.length
  }
  console.log('\nTotal images cassées :', totalBroken)
  ws.close()
  process.exit(totalBroken ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
