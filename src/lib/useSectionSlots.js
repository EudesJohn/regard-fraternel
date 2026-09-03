import { ref, onMounted } from 'vue'
import { getSectionSlots } from './photos.js'
import { slotDefault } from './sections.js'

/**
 * Charge les emplacements fixes (slots) d'UNE section.
 * `url(key)` renvoie la photo personnalisée (Supabase) ou la photo locale par défaut.
 */
export function useSectionSlots(slug) {
  const slots = ref({})
  const loading = ref(true)

  const url = (key) => slots.value[key]?.url || slotDefault(slug, key)

  const load = async () => {
    slots.value = await getSectionSlots(slug)
    loading.value = false
  }

  onMounted(load)

  return { slots, loading, url, load }
}

/**
 * Charge les emplacements fixes de PLUSIEURS sections d'un coup.
 * `url(slug, key)` résout la photo personnalisée ou la locale par défaut.
 */
export function useManySlots(slugs) {
  const all = ref({})
  const loading = ref(true)

  const url = (slug, key) => {
    const v = all.value[slug]?.[key]
    if (v && v.url) return v.url
    return slotDefault(slug, key)
  }

  const load = async () => {
    const entries = await Promise.all(
      [...new Set(slugs)].map(async (s) => [s, await getSectionSlots(s)])
    )
    all.value = Object.fromEntries(entries)
    loading.value = false
  }

  onMounted(load)

  return { all, loading, url, load }
}
