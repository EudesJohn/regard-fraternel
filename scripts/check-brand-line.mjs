// Vérification visuelle : la 1ʳᵉ ligne « REGARD FRATERNEL (RF) » doit rester sur
// une seule ligne à toutes les largeurs d'écran, et toutes les 1ʳᵉs lignes de
// titres (hero, en-têtes de pages) doivent avoir la même taille de police.
//
// Usage : node scripts/check-brand-line.mjs [URL]   (défaut http://localhost:4173)
const BASE = process.argv[2] || 'http://localhost:4173'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9223

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const shots = path.join(process.cwd(), 'screenshots')
fs.mkdirSync(shots, { recursive: true })

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  `--user-data-dir=${path.join(shots, '.chrome-profile')}`,
  'about:blank'
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getPageWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const targets = await res.json()
      const page = targets.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch { /* Chrome pas prêt encore */ }
    await sleep(250)
  }
  throw new Error('Chrome headless non joignable sur le port ' + PORT)
}

const ws = new WebSocket(await getPageWsUrl())
let id = 0
const pending = new Map()
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id
    const t = setTimeout(() => { pending.delete(i); reject(new Error('CDP timeout: ' + method)) }, 30000)
    pending.set(i, { res: (v) => { clearTimeout(t); resolve(v) }, rej: reject })
    ws.send(JSON.stringify({ id: i, method, params }))
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

const evalv = async (expr) =>
  (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value

const goto = async (url) => {
  await send('Page.enable')
  await send('Page.navigate', { url })
  await sleep(3000)
  // Attend que l'app Vue soit montée (le h1 du hero existe)
  for (let i = 0; i < 20; i++) {
    const ok = await evalv(`!!document.querySelector('.hero__title') || !!document.querySelector('.page-header__title')`)
    if (ok) break
    await sleep(500)
  }
  // Attend que les polices soient chargées (sinon les mesures se font sur le
  // fallback serif et varient de quelques pixels)
  await evalv(`document.fonts.ready.then(() => true)`)
  await sleep(200)
}

const setWidth = async (w, h = 900) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 })
  await sleep(500)
}

const shot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(shots, name), Buffer.from(data, 'base64'))
}

// Mesure combien de lignes occupent les blocs clés + la taille de police calculée
const MEASURE = `(() => {
  const lines = (el) => {
    if (!el) return null
    const range = document.createRange()
    range.selectNodeContents(el)
    return Array.from(range.getClientRects()).filter(r => r.width > 2 && r.height > 2).length
  }
  const fs = (el) => el ? getComputedStyle(el).fontSize : null
  const h1 = document.querySelector('.hero__title.is-brand')
  const out = {
    url: location.pathname,
    brand: { el: !!h1, fs: fs(h1) }
  }
  // Géométrie de la ligne 1 (position, hauteur) — identique sur toutes les slides
  const line = document.querySelector('.hero__title.is-brand .hero__line')
  if (line) {
    const r = line.getBoundingClientRect()
    out.brandLine = { top: Math.round(r.top), left: Math.round(r.left), h: Math.round(r.height) }
  }
  const ph = document.querySelector('.page-header__title')
  out.pageHeader = ph ? { text: ph.textContent.trim(), lines: lines(ph), fs: fs(ph) } : null
  // Débordement horizontal global
  out.scrollOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth
  // La 1ʳᵉ ligne du bloc marque tient-elle sur une seule ligne ?
  // On ne garde que les fragments de la 1ʳᵉ ligne (même y que le haut du bloc) :
  // le <span> (2ᵉ ligne) est exclu du comptage.
  if (h1) {
    const r = document.createRange()
    r.selectNodeContents(h1)
    const all = Array.from(r.getClientRects()).filter(x => x.width > 2 && x.height > 2)
    const top = Math.min(...all.map(x => x.top))
    const first = all.filter(x => x.top < top + 2)
    out.brandRects = first.length
    out.brandW = Math.round(Math.max(...first.map(x => x.width)))
    out.brandH = Math.round(Math.max(...first.map(x => x.height)))
    // Largeur disponible pour le titre (colonne du heading)
    const heading = document.querySelector('.hero__heading')
    out.colW = heading ? Math.round(heading.getBoundingClientRect().width) : null
    out.brandFs = fs(h1)
  }
  return out
})()`

let failures = 0
const check = (label, cond, extra = '') => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (extra ? ' — ' + extra : ''))
  if (!cond) failures++
}

const WIDTHS = [1440, 1200, 1024, 861, 700, 480, 390, 360]

for (const [i, w] of WIDTHS.entries()) {
  await setWidth(w)
  await goto(BASE + '/')
  const m = await evalv(MEASURE)
  console.log('\\nAccueil @ ' + w + 'px')
  check('« REGARD FRATERNEL (RF) » présent', m.brand.el)
  check('RF sur une seule ligne (dans sa colonne)', m.brandRects === 1 && m.brandW <= m.colW, `${m.brandRects} ligne(s), texte ${m.brandW}px / colonne ${m.colW}px, fs ${m.brandFs}`)
  if (m.brandRects !== 1) failures++
  check('aucun débordement horizontal', m.scrollOverflow <= 0, `scrollWidth - clientWidth = ${m.scrollOverflow}`)
  // Les autres diapositives : le MÊME h1 change de texte → on clique chaque point
  const nDots = await evalv(`document.querySelectorAll('.hero__dot').length`)
  let otherOk = true
  const otherDetails = []
  for (let d = 1; d < nDots; d++) {
    await evalv(`document.querySelectorAll('.hero__dot')[${d}].click()`)
    await sleep(450)
    const s = await evalv(`(() => {
      const h1 = document.querySelector('.hero__title')
      const line = document.querySelector('.hero__title .hero__line')
      const r = document.createRange()
      r.selectNodeContents(line)
      const all = Array.from(r.getClientRects()).filter(x => x.width > 2 && x.height > 2)
      const heading = document.querySelector('.hero__heading')
      const rect = line.getBoundingClientRect()
      // En production, la 1ʳᵉ ligne peut contenir du padding... vérifions aussi le range de la ligne
      const rl = document.createRange()
      rl.selectNodeContents(line)
      const rlRects = Array.from(rl.getClientRects()).filter(x => x.width > 2 && x.height > 2)
      const topFrag = Math.min(...rlRects.map(x => x.top))
      const firstRow = rlRects.filter(x => x.top < topFrag + 2)
      const cs = getComputedStyle(h1)
      return {
        fs: cs.fontSize,
        lh: cs.lineHeight,
        firstLine: firstRow.length,
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        h: Math.round(rect.height),
        colW: heading ? Math.round(heading.getBoundingClientRect().width) : null,
        text: line.textContent.trim().slice(0, 34)
      }
    })()`)
    const sameFs = s.fs === m.brandFs
    const sameGeom = s.top === m.brandLine.top && s.left === m.brandLine.left && s.h === m.brandLine.h
    if (!sameFs || !sameGeom) otherOk = false
    // Les autres titres doivent aussi tenir en 1ʳᵉ ligne avant leur sous-ligne
    otherDetails.push(`${s.text}… fs=${s.fs} pos=(${s.top},${s.left}) h=${s.h} 1ʳᵉligne=${s.firstLine}`)
  }
  check('autres diapositives : même taille ET même position/hauteur de ligne 1 que RF', otherOk, `RF fs=${m.brandFs} pos=(${m.brandLine.top},${m.brandLine.left}) h=${m.brandLine.h} ; ${otherDetails.join(' | ')}`)
  await evalv(`document.querySelectorAll('.hero__dot')[0].click()`)
  await sleep(450)
  if (i === 0 || w === 390) await shot(`brand-accueil-${w}.png`)

  // Page interne (À propos) : le titre de page doit avoir la même taille
  await goto(BASE + '/apropos')
  const m2 = await evalv(MEASURE)
  check(`À propos @ ${w}px — titre de page à la même mesure`, m2.pageHeader && m2.pageHeader.fs === m.brand.fs, `page-header=${m2.pageHeader && m2.pageHeader.fs}, RF=${m.brand.fs}`)
  if (w === 1440 || w === 390) await shot(`brand-apropos-${w}.png`)
}

await send('Browser.close').catch(() => {})
setTimeout(() => chrome.kill(), 500)
console.log('\\n' + (failures === 0 ? '✅ Tous les contrôles passent.' : `❌ ${failures} contrôle(s) en échec.`))
process.exit(failures === 0 ? 0 : 1)
