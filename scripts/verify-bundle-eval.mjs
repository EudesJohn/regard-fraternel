// ============================================================
// Vérification post-déploiement : télécharge un chunk depuis la
// PRODUCTION ainsi que ses dépendances statiques, puis l'évalue
// réellement dans Node. Détecte exactement la classe de bug
// « SECTIONS is not defined » (crash à l'évaluation du module,
// invisible au build mais fatal au navigateur).
//
// Usage :
//   node scripts/verify-bundle-eval.mjs                  # chunk photos (défaut)
//   node scripts/verify-bundle-eval.mjs photos-XXX.js    # chunk précis
// ============================================================
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = process.env.VERIFY_BASE || 'https://regard-fraternel.vercel.app/assets/'
const CHUNK = process.argv[2] || (await discoverPhotosChunk())

async function discoverPhotosChunk() {
  const html = await (await fetch('https://regard-fraternel.vercel.app/')).text()
  const entry = html.match(/\/assets\/index-[^"']+\.js/)?.[0]
  if (!entry) throw new Error('Entry JS introuvable dans index.html')
  const entryCode = await (await fetch('https://regard-fraternel.vercel.app' + entry)).text()
  const photosChunk = entryCode.match(/photos-[A-Za-z0-9_-]+\.js/)?.[0]
  if (!photosChunk) throw new Error('Chunk photos introuvable dans le bundle entry')
  return photosChunk
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rf-verify-'))
const seen = new Set()

async function grab(file) {
  if (seen.has(file)) return
  seen.add(file)
  const res = await fetch(BASE + file)
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${file}`)
  const code = await res.text()
  fs.writeFileSync(path.join(dir, file), code)
  for (const m of code.matchAll(/from\s*"\.\/([^"]+\.js)"/g)) {
    await grab(m[1])
  }
}

try {
  await grab(CHUNK)
  console.log('Chunks téléchargés depuis la production :', [...seen].join(', '))

  const url = 'file:///' + path.join(dir, CHUNK).split(path.sep).join('/')
  const mod = await import(url)

  console.log('✅ ÉVALUATION OK — aucune ReferenceError')
  console.log('   exports :', Object.keys(mod).sort().join(', '))
  if (mod.SECTIONS) {
    console.log(`✅ SECTIONS présent : ${mod.SECTIONS.length} sections`)
  }
  console.log('\nLe bug « SECTIONS is not defined » est corrigé en production.')
} catch (e) {
  console.error('❌ ÉCHEC :', e.message)
  process.exit(1)
}
