// ============================================================
// Test de fumée : chaque module de src/lib doit s'importer sans lever
// d'erreur d'évaluation (imports circulaires, références non définies…).
// Ces crashes passent inaperçus au build Vite mais cassent le site en
// production — exactement le bug « SECTIONS is not defined ».
// ============================================================
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('modules — import sans erreur d évaluation', () => {
  test('sections.js expose le registre complet (12 sections)', async () => {
    const m = await import('../src/lib/sections.js')
    assert.ok(Array.isArray(m.SECTIONS) && m.SECTIONS.length === 12)
    assert.equal(m.SECTIONS[0].slug, 'hero')
    assert.equal(typeof m.sectionLabel, 'function')
    assert.equal(typeof m.slotDefault, 'function')
  })

  test('sections.js : « textes » et « gouvernance » supprimés, « histoires » et « don » présents', async () => {
    const m = await import('../src/lib/sections.js')
    const slugs = m.SECTIONS.map((s) => s.slug)
    assert.ok(!slugs.includes('textes'), 'la section textes doit être supprimée')
    assert.ok(!slugs.includes('gouvernance'), 'la section gouvernance doit être supprimée')
    assert.ok(slugs.includes('histoires'))
    assert.ok(slugs.includes('don'))
  })

  test('photos.js évalue sans ReferenceError et ré-exporte SECTIONS', async () => {
    // AVANT correctif, cet import levait : « SECTIONS is not defined ».
    const m = await import('../src/lib/photos.js')
    assert.ok(Array.isArray(m.SECTIONS) && m.SECTIONS.length === 12)
    assert.equal(typeof m.getPhotos, 'function')
    assert.equal(typeof m.updatePhoto, 'function')
  })

  test('photos.js : la whitelist interne connaît les vraies sections', async () => {
    const m = await import('../src/lib/photos.js')
    // updatePhoto ne doit pas rejeter un patch vide → prouve que le module
    // a évalué ALLOWED_SECTIONS sans crash (le guard est atteint après).
    await assert.rejects(
      () => m.updatePhoto('00000000-0000-0000-0000-000000000000', {}),
      /Rien à mettre à jour/
    )
  })

  test('useSectionSlots.js évalue sans erreur (imports croisés avec photos.js)', async () => {
    const m = await import('../src/lib/useSectionSlots.js')
    assert.equal(typeof m.useSectionSlots, 'function')
    assert.equal(typeof m.useManySlots, 'function')
  })

  test('supabase.js évalue sans erreur même sans configuration .env', async () => {
    const m = await import('../src/lib/supabase.js')
    // Sans VITE_SUPABASE_URL (contexte Node), le client est null — pas de crash.
    assert.ok('supabase' in m && 'isSupabaseConfigured' in m)
  })

  test('contact.js et validation.js évalue sans erreur', async () => {
    const c = await import('../src/lib/contact.js')
    const v = await import('../src/lib/validation.js')
    assert.equal(typeof c.sendContactMessage, 'function')
    assert.equal(typeof v.sanitizeName, 'function')
  })

  test('stories.js et don.js évaluent sans erreur', async () => {
    const s = await import('../src/lib/stories.js')
    const d = await import('../src/lib/don.js')
    assert.equal(typeof s.getStories, 'function')
    assert.equal(typeof s.getStoriesConfig, 'function')
    assert.equal(typeof d.getDonConfig, 'function')
  })
})
