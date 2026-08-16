<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { programmes } from '../data.js'
import { getPhotos, photoUrl } from '../lib/photos.js'
import PageHeader from '../components/PageHeader.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'
import Icon from '../components/Icon.vue'

const route = useRoute()
const programme = computed(() => programmes.find((p) => p.id === route.params.id) || programmes[0])
const photos = ref([])

const covers = {
  sanitaire: '/images/design/cover-sanitaire.jpg',
  scolaire: '/images/design/cover-scolaire.jpg',
  jeux: '/images/design/cover-jeux.jpg',
  donEcole: '/images/design/cover-don.jpg'
}

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

watch(() => programme.value?.photos, loadGallery, { immediate: true })
</script>

<template>
  <div v-if="programme">
    <PageHeader
      :title="programme.titre"
      :subtitle="programme.sousTitre"
      :image="covers[programme.photos]"
      :eyebrow="`Programme ${programme.numero}`"
    />

    <section class="section">
      <div class="container">
        <div class="program-panel">
          <div class="program-panel__info reveal" v-reveal>
            <h3>{{ programme.titre }}</h3>
            <p class="program-panel__sub">{{ programme.sousTitre }}</p>
            <p class="program-panel__text">{{ programme.texte }}</p>

            <div class="program-stats">
              <div v-for="s in programme.stats" :key="s.label" class="program-stat">
                <strong>{{ s.valeur }}</strong>
                <span>{{ s.label }}</span>
              </div>
            </div>

            <div style="margin-top: 34px; display: flex; gap: 14px; flex-wrap: wrap">
              <RouterLink to="/adhesion" class="btn btn--dark">
                Soutenir ce programme
                <Icon name="arrowRight" :size="18" />
              </RouterLink>
              <RouterLink to="/actions" class="btn" style="border: 1.5px solid var(--sand-300); color: var(--ink-soft)">
                Tous les programmes
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
