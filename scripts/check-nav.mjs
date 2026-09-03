// Mesure l'en-tête à plusieurs largeurs d'écran : détecte le retour à la ligne
// des textes des boutons/liens (hauteur > hauteur attendue d'une ligne).
// Chrome doit tourner avec --remote-debugging-port=9222.
const widths = [1440, 1366, 1280, 1220, 1100, 900, 768, 375, 320]

async function main() {
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
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
    return res.result.value
  }

  for (const w of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: 'http://localhost:4173/' })
    await new Promise((r) => setTimeout(r, 3500))
    const info = await evaluate(`(() => {
      const btn = document.querySelector('.nav__cta')
      const toggle = document.querySelector('.nav__toggle')
      const links = [...document.querySelectorAll('.nav__link')]
      const heroBtns = [...document.querySelectorAll('.hero__cta .btn')]
      const brand = document.querySelector('.nav__brand')
      const wrap = (el) => el.scrollHeight > el.clientHeight + 1
      return {
        mode: toggle && getComputedStyle(toggle).display !== 'none' ? 'MOBILE (menu burger)' : 'desktop',
        ctaVisible: btn ? getComputedStyle(btn).display !== 'none' : false,
        ctaWrap: btn ? wrap(btn) : null,
        linksWrapped: links.filter(wrap).map((l) => l.textContent.trim()),
        heroBtnsWrapped: heroBtns.filter(wrap).map((b) => b.textContent.trim()),
        brandWrap: brand ? wrap(brand) : null
      }
    })()`)
    const broken = info.linksWrapped.length || info.ctaWrap || info.heroBtnsWrapped.length || info.brandWrap
    const flag = broken ? '✗ RETOUR À LA LIGNE' : '✓ une ligne'
    console.log(`largeur ${String(w).padEnd(5)} ${flag.padEnd(22)} ${info.mode.padEnd(24)} cta=${info.ctaWrap} liens=${JSON.stringify(info.linksWrapped)} heroBtns=${JSON.stringify(info.heroBtnsWrapped)} brand=${info.brandWrap}`)
  }
  ws.close()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
