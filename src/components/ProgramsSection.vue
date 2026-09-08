<script setup>
import { ref, computed, watch } from 'vue'
import { programmes } from '../data.js'
import { getPhotos, photoUrl } from '../lib/photos.js'
import PhotoLightbox from './PhotoLightbox.vue'
import Icon from './Icon.vue'

const activeId = ref('education')
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const active = computed(() => programmes.find((p) => p.id === activeId.value))
const photos = ref([])

const openLightbox = (index) => {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

watch(
  () => active.value?.photos,
  async (cle) => {
    photos.value = cle ? await getPhotos(cle) : []
  },
  { immediate: true }
)
</script>

<template>
  <section id="actions" class="section section--alt">
    <div class="container">
      <p class="eyebrow reveal" v-reveal>Nos actions</p>
      <h2 class="section-title reveal" v-reveal>
        Nos quatre piliers <em>d'intervention</em>
      </h2>
      <p class="section-intro reveal" v-reveal>
        Éducation, égalité des genres, santé et environnement : découvrez les actions
        menées par REGARD FRATERNEL auprès des communautés. Cliquez sur les photos pour les agrandir.
      </p>

      <div class="program-tabs reveal" v-reveal role="tablist" aria-label="Piliers">
        <button
          v-for="p in programmes"
          :key="p.id"
          class="program-tab"
          :class="{ 'is-active': activeId === p.id }"
          role="tab"
          :aria-selected="activeId === p.id"
          @click="activeId = p.id"
        >
          {{ p.titre }}
        </button>
      </div>

      <div class="program-panel" v-if="active">
        <div class="program-panel__info reveal" v-reveal>
          <h3>{{ active.titre }}</h3>
          <p class="program-panel__sub">{{ active.sousTitre }}</p>
          <p class="program-panel__text">{{ active.texte }}</p>
          <a href="#adhesion" class="btn btn--dark">
            Soutenir ce pilier
            <Icon name="arrowRight" :size="18" />
          </a>
        </div>

        <div class="gallery reveal" v-reveal style="--reveal-delay: 120ms">
          <figure
            v-for="(photo, i) in photos"
            :key="photo.id || photo.url"
            class="gallery__item"
            :class="{ 'gallery__item--tall': i % 5 === 2 }"
            @click="openLightbox(i)"
          >
            <img :src="photoUrl(photo.url, 480)" :alt="photo.caption || `${active.titre} — photo ${i + 1}`" loading="lazy" />
            <figcaption v-if="photo.caption" class="gallery__caption">{{ photo.caption }}</figcaption>
            <span class="gallery__zoom" aria-hidden="true">
              <Icon name="zoomIn" :size="26" />
            </span>
          </figure>
        </div>
      </div>
    </div>

    <PhotoLightbox
      v-if="lightboxOpen"
      :photos="photos"
      :index="lightboxIndex"
      @close="lightboxOpen = false"
      @prev="lightboxIndex = (lightboxIndex - 1 + photos.length) % photos.length"
      @next="lightboxIndex = (lightboxIndex + 1) % photos.length"
    />
  </section>
</template>
