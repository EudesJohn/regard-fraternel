// ============================================================
// Tests de src/lib/validation.js — validateurs & assainisseurs
// Exécution : npm test  (runner natif Node, aucune dépendance)
// ============================================================
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeText,
  sanitizeMultiline,
  sanitizeName,
  sanitizeEmail,
  sanitizePhone,
  sanitizePhotoUrl,
  sanitizeCaption,
  sanitizeSectionSlug,
  safeFileName,
  assertSafeUpload,
  honeypotTripped,
  LIMITS
} from '../src/lib/validation.js'

describe('sanitizeText', () => {
  test('trimme et compacte les espaces', () => {
    assert.equal(sanitizeText('  bonjour   le  monde  \n '), 'bonjour le monde')
  })

  test('supprime les caractères de contrôle (anti log/JSON injection)', () => {
    assert.equal(sanitizeText('ab\u0000cd\u001f'), 'abcd')
    assert.equal(sanitizeText('ligne1\u000bligne2'), 'ligne1ligne2')
  })

  test('borne la longueur au maximum demandé', () => {
    assert.equal(sanitizeText('a'.repeat(500), 100).length, 100)
  })

  test('retourne une chaîne vide pour les entrées non textuelles', () => {
    assert.equal(sanitizeText(null), '')
    assert.equal(sanitizeText(undefined), '')
    assert.equal(sanitizeText(42), '')
    assert.equal(sanitizeText({ x: 1 }), '')
  })
})

describe('sanitizeMultiline', () => {
  test('préserve les sauts de ligne utiles', () => {
    assert.equal(sanitizeMultiline('ligne 1\nligne 2\n\nligne 3'), 'ligne 1\nligne 2\n\nligne 3')
  })

  test('compacte les sauts de ligne excessifs (3+ → 2)', () => {
    assert.equal(sanitizeMultiline('a\n\n\n\n\nb'), 'a\n\nb')
  })

  test('supprime les contrôles mais garde \\n', () => {
    assert.equal(sanitizeMultiline('ab\u0001cd\nef'), 'abcd\nef')
  })

  test('borne à LIMITS.message', () => {
    const out = sanitizeMultiline('x'.repeat(LIMITS.message + 500))
    assert.equal(out.length, LIMITS.message)
  })
})

describe('sanitizeName', () => {
  test('accepte les noms courants (accents, tirets, apostrophes)', () => {
    assert.equal(sanitizeName('Marie-Josée de l\'Épine'), 'Marie-Josée de l\'Épine')
    assert.equal(sanitizeName('Amadou Ousmane Diallo'), 'Amadou Ousmane Diallo')
  })

  test('refuse les chiffres et symboles', () => {
    assert.equal(sanitizeName('Jean <script>alert(1)</script>'), null)
    assert.equal(sanitizeName('User123'), null)
    assert.equal(sanitizeName('$money'), null)
  })

  test('refuse les chaînes vides', () => {
    assert.equal(sanitizeName('   '), null)
    assert.equal(sanitizeName(''), null)
  })
})

describe('sanitizeEmail', () => {
  test('accepte un e-mail valide et le normalise en minuscules', () => {
    assert.equal(sanitizeEmail('  Jean.Dupont@Exemple.COM '), 'jean.dupont@exemple.com')
  })

  test('refuse les formats invalides', () => {
    assert.equal(sanitizeEmail('pas-un-email'), null)
    assert.equal(sanitizeEmail('a@b'), null)
    assert.equal(sanitizeEmail('deux @@ex.com'), null)
    assert.equal(sanitizeEmail(''), null)
    assert.equal(sanitizeEmail('a b@ex.com'), null)
  })
})

describe('sanitizePhone', () => {
  test('accepte les formats internationaux courants', () => {
    assert.equal(sanitizePhone('+229 97 12 34 56'), '+229 97 12 34 56')
    assert.equal(sanitizePhone('+33 (0)1.23.45.67.89'), '+33 (0)1.23.45.67.89')
  })

  test('retourne une chaîne vide si non renseigné', () => {
    assert.equal(sanitizePhone(''), '')
    assert.equal(sanitizePhone('   '), '')
  })

  test('refuse les numéros invalides (null)', () => {
    assert.equal(sanitizePhone('abc'), null)
    assert.equal(sanitizePhone('12'), null) // trop court
    assert.equal(sanitizePhone('97123456<script>'), null)
  })
})

describe('sanitizePhotoUrl', () => {
  const PROJECT = 'uyuepanuxbohqefziolp.supabase.co'

  test('accepte une URL du bucket public Supabase du projet', () => {
    const url = `https://${PROJECT}/storage/v1/object/public/photos/hero/123-photo.jpg`
    assert.equal(sanitizePhotoUrl(url), `${url.endsWith('/') ? url : url}`)
  })

  test('accepte un chemin local /images/…', () => {
    assert.equal(sanitizePhotoUrl('/images/photos/don/don-01.jpg'), '/images/photos/don/don-01.jpg')
  })

  test('refuse javascript:, data: et vbscript:', () => {
    assert.equal(sanitizePhotoUrl('javascript:alert(1)'), null)
    assert.equal(sanitizePhotoUrl('data:text/html;base64,PHNjcmlwdD4='), null)
    assert.equal(sanitizePhotoUrl('vbscript:msgbox'), null)
  })

  test('refuse tout autre hébergeur (hôtage de <img src>)', () => {
    assert.equal(sanitizePhotoUrl('https://evil.example.com/pixel.jpg'), null)
    assert.equal(sanitizePhotoUrl(`https://${PROJECT}/auth/v1/anything`), null) // hors bucket public photos
    assert.equal(sanitizePhotoUrl('http://insecure.example.com/a.jpg'), null) // pas de http
  })

  test('refuse les chaînes vides et trop longues', () => {
    assert.equal(sanitizePhotoUrl(''), null)
    assert.equal(sanitizePhotoUrl('https://a.b/' + 'x'.repeat(3000)), null)
  })
})

describe('sanitizeCaption & sanitizeSectionSlug', () => {
  test('légende : borne, supprime HTML/JS et contrôles', () => {
    assert.equal(sanitizeCaption('  <img src=x>  '), 'img src=x')
    assert.equal(sanitizeCaption('a\u0000b'), 'ab')
    assert.equal(sanitizeCaption('y'.repeat(500)).length, LIMITS.caption)
  })

  test('slug de section : uniquement [a-z0-9-]', () => {
    assert.equal(sanitizeSectionSlug('hero'), 'hero')
    assert.equal(sanitizeSectionSlug('actions/../../etc'), null)
    assert.equal(sanitizeSectionSlug('Hero'), null)
    assert.equal(sanitizeSectionSlug(42), null)
  })
})

describe('safeFileName', () => {
  test('neutralise les tentatives de traversal de répertoire', () => {
    // Les séparateurs et points disparaissent : aucun chemin ne peut être reconstruit.
    for (const [input, output] of [
      ['../../etc/passwd', 'etc_passwd'],
      ['..\\..\\windows\\system32', 'windows_system32'],
      ['....//....//etc/shadow', 'etc_shadow']
    ]) {
      const out = safeFileName(input)
      assert.ok(!out.includes('..') && !out.includes('/') && !out.includes('\\'), `« ${out} » contient encore un élément de traversal`)
      assert.equal(out, output)
    }
  })

  test('normalise accents, casse et séparateurs', () => {
    assert.equal(safeFileName('École Primaire (2024).jpg'), 'ecole_primaire_2024_.jpg')
  })

  test('force une longueur maximale', () => {
    assert.ok(safeFileName('x'.repeat(300)).length <= 60)
  })

  test('fournit un nom par défaut', () => {
    assert.equal(safeFileName(''), 'image')
  })
})

describe('assertSafeUpload', () => {
  const makeFile = (bytes, type, name = 'test.jpg') => ({
    size: bytes.length,
    type,
    name,
    slice: (start, end) => ({
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset + start, bytes.byteOffset + (end ?? bytes.length))
    })
  })

  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0])
  const WEBP = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0]) // « WEBP »
  const HTML = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) // « <html> »

  test('accepte un vrai JPEG', async () => {
    await assertSafeUpload(makeFile(JPEG, 'image/jpeg'))
  })

  test('accepte un vrai PNG et un vrai WebP', async () => {
    await assertSafeUpload(makeFile(PNG, 'image/png'))
    await assertSafeUpload(makeFile(WEBP, 'image/webp'))
  })

  test("refuse un HTML renommé en .jpg (magic number)", async () => {
    await assert.rejects(() => assertSafeUpload(makeFile(HTML, 'image/jpeg', 'faux.jpg')))
  })

  test('refuse les types MIME non image', async () => {
    await assert.rejects(() => assertSafeUpload(makeFile(JPEG, 'application/pdf')))
  })

  test('refuse les fichiers trop gros (> 10 Mo)', async () => {
    const big = { ...makeFile(JPEG, 'image/jpeg'), size: 11 * 1024 * 1024 }
    await assert.rejects(() => assertSafeUpload(big))
  })

  test('refuse les fichiers vides', async () => {
    const empty = { ...makeFile(JPEG, 'image/jpeg'), size: 0 }
    await assert.rejects(() => assertSafeUpload(empty))
  })

  test('refuse l\'absence de fichier', async () => {
    await assert.rejects(() => assertSafeUpload(null))
  })
})

describe('honeypotTripped', () => {
  test('déclenché si le champ piège est rempli', () => {
    assert.equal(honeypotTripped({ website: 'http://spam.example' }, 'website'), true)
    assert.equal(honeypotTripped({ website: ' ' }, 'website'), true) // espace = rempli
  })

  test('non déclenché si vide ou absent (humain)', () => {
    assert.equal(honeypotTripped({ website: '' }, 'website'), false)
    assert.equal(honeypotTripped({ nom: 'Jean' }, 'website'), false)
  })

  test('fail-closed : formulaire absent = déclenché', () => {
    assert.equal(honeypotTripped(null), true)
  })
})
