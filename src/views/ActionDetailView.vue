<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { programmes } from '../data.js'
import { getPhotos, getSectionSlots, photoUrl, slotDefault } from '../lib/photos.js'
import PageHeader from '../components/PageHeader.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'
import Icon from '../components/Icon.vue'

const route = useRoute()
const programme = computed(() => programmes.find((p) => p.id === route.params.id) || programmes[0])
const photos = ref([])

// Couverture de la page = emplacement fixe « cover » de la section du pilier
const cover = ref('')

const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const openLightbox = (i) => {
  lightboxIndex.value = i
  lightboxOpen.value = true
}

/* ---------- Chargement de la galerie ---------- */
const galleryLoading = ref(true)
const loadProgress = ref(0)

// Précharge toutes les miniatures de la galerie, puis affiche.
// Au 2ᵉ passage, le Service Worker renvoie les images depuis le cache → quasi instantané.
const loadGallery = async (cle) => {
  galleryLoading.value = true
  loadProgress.value = 0
  photos.value = cle ? await getPhotos(cle) : []

  const total = photos.value.length
  if (!total) {
    galleryLoading.value = false
    return
  }

  // Photos locales (repli) : affichage immédiat en lazy-load — le préchargement
  // est réservé aux miniatures Supabase (photoUrl les redimensionne).
  const isLocal = photos.value.every((p) => !p.url || p.url.startsWith('/'))
  if (isLocal) {
    galleryLoading.value = false
    return
  }

  let done = 0
  await Promise.all(
    photos.value.map(
      (p) =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = img.onerror = () => {
            done++
            loadProgress.value = Math.round((done / total) * 100)
            resolve()
          }
          img.src = photoUrl(p.url, 480)
        })
    )
  )

  galleryLoading.value = false
}

watch(
  () => programme.value?.photos,
  async (cle) => {
    if (!cle) return
    // Couverture : emplacement fixe (photo locale par défaut tant que rien n'est personnalisé)
    cover.value = slotDefault(cle, 'cover')
    const slots = await getSectionSlots(cle)
    cover.value = slots.cover?.url || cover.value
    await loadGallery(cle)
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="programme">
    <PageHeader
      :title="programme.titre"
      :subtitle="programme.sousTitre"
      :image="cover"
      :eyebrow="`Pilier ${programme.numero}`"
    />

    <section class="section">
      <div class="container">
        <div class="program-panel">
          <div class="program-panel__info reveal" v-reveal>
            <h3>{{ programme.titre }}</h3>
            <p class="program-panel__sub">{{ programme.sousTitre }}</p>
            <p class="program-panel__text">{{ programme.texte }}</p>

            <div style="margin-top: 34px; display: flex; gap: 14px; flex-wrap: wrap">
              <RouterLink to="/adhesion" class="btn btn--dark">
                Soutenir ce pilier
                <Icon name="arrowRight" :size="18" />
              </RouterLink>
              <RouterLink to="/actions" class="btn" style="border: 1.5px solid var(--sand-300); color: var(--ink-soft)">
                Tous les piliers
              </RouterLink>
            </div>
          </div>

          <!-- Page de chargement de la galerie -->
          <div v-if="galleryLoading" class="gallery-loading">
            <div class="gallery-loading__spinner"></div>
            <p class="gallery-loading__title">Chargement des photos…</p>
            <p class="gallery-loading__count">{{ loadProgress }} %</p>
            <div class="gallery-loading__bar">
              <div class="gallery-loading__bar-fill" :style="{ width: loadProgress + '%' }"></div>
            </div>
            <p class="gallery-loading__hint">Les photos sont préparées pour un affichage rapide.</p>
          </div>

          <!-- Galerie vide (pilier sans photo pour l'instant) -->
          <div v-else-if="!photos.length" class="gallery gallery--empty">
            <p>
              Aucune photo pour ce pilier pour l'instant — les actions sont en cours de
              documentation. Revenez bientôt !
            </p>
          </div>

          <!-- Galerie -->
          <div v-else class="gallery reveal" v-reveal style="--reveal-delay: 120ms">
            <figure
              v-for="(photo, i) in photos"
              :key="photo.id || photo.url"
              class="gallery__item"
              :class="{ 'gallery__item--tall': i % 5 === 2 }"
              @click="openLightbox(i)"
            >
              <img :src="photoUrl(photo.url, 480)" :alt="photo.caption || `${programme.titre} — photo ${i + 1}`" loading="lazy" />
              <figcaption v-if="photo.caption" class="gallery__caption">{{ photo.caption }}</figcaption>
              <span class="gallery__zoom" aria-hidden="true"><Icon name="zoomIn" :size="26" /></span>
            </figure>
          </div>
        </div>
      </div>
    </section>

    <PhotoLightbox
      v-if="lightboxOpen"
      :photos="photos"
      :index="lightboxIndex"
      @close="lightboxOpen = false"
      @prev="lightboxIndex = (lightboxIndex - 1 + photos.length) % photos.length"
      @next="lightboxIndex = (lightboxIndex + 1) % photos.length"
    />
  </div>
</template>
