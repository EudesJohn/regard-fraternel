// Copie le build de l'application admin (admin/dist) dans dist/admin afin de
// produire un déploiement unique sur Vercel : site public à /, admin à /admin/.
// Exécuté après le build des deux applications (npm run build:all).
import { cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const srcDir = path.join(root, 'admin', 'dist')
const destDir = path.join(root, 'dist', 'admin')

if (!existsSync(srcDir)) {
  console.error('admin/dist introuvable — exécutez d’abord « npm run build:admin ».')
  process.exit(1)
}

await rm(destDir, { recursive: true, force: true })
await cp(srcDir, destDir, { recursive: true })
console.log(`✓ admin/dist → dist/admin`)
