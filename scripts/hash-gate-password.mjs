// ============================================================
// REGARD FRATERNEL — Hachage du mot de passe de la porte /admin
//
// Génère la valeur à coller dans Vercel (ADMIN_GATE_PASSWORD)
// sous la forme « sha256:<empreinte> » : le secret en clair ne
// transite plus par la console Vercel ni par les logs.
//
// Usage :
//   node scripts/hash-gate-password.mjs "votre phrase secrète"
// ou en mode interactif (le secret n'apparaît pas dans l'historique shell) :
//   node scripts/hash-gate-password.mjs
// ============================================================
import { createHash } from 'node:crypto'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const secret = process.argv[2] || (await askSecret())

if (!secret || secret.length < 12) {
  console.error('Erreur : utilisez une phrase secrète de 12 caractères minimum.')
  process.exit(1)
}

const hash = createHash('sha256').update(secret, 'utf8').digest('hex')

console.log('\nValeur à définir dans Vercel (Settings → Environment Variables) :')
console.log(`\n  ADMIN_GATE_PASSWORD=sha256:${hash}\n`)
console.log('Puis redéployez. La connexion se fait toujours avec la phrase')
console.log('secrète en clair (pas avec l\'empreinte) ; seul le serveur la')
console.log('compare sous forme hachée.\n')

async function askSecret() {
  const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true })
  // Masque la saisie à l'écran
  stdout.write('Phrase secrète (saisie masquée) : ')
  stdout.write('\u001b[30m\u001b[40m')
  const answer = await new Promise((resolve) => {
    stdin.once('data', (d) => resolve(String(d).trim()))
  })
  stdout.write('\u001b[0m')
  console.log()
  rl.close()
  return answer
}
