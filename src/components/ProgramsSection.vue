<script setup>
import { ref, computed, watch } from 'vue'
import { programmes } from '../data.js'
import { getPhotos, photoUrl } from '../lib/photos.js'
import PhotoLightbox from './PhotoLightbox.vue'
import Icon from './Icon.vue'

const activeId = ref('sanitaire')
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
        Des programmes <em>concrets</em> sur le terrain
      </h2>
      <p class="section-intro reveal" v-reveal>
        Santé, éducation, loisirs et dons : découvrez les actions menées par
        REGARD FRATERNEL auprès des communautés. Cliquez sur les photos pour les agrandir.
      </p>

      <div class="program-tabs reveal" v-reveal role="tablist" aria-label="Programmes">
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
            Soutenir ce programme
            <Icon name="arrowRight" :size="18" />
          </a>
          <div class="program-stats">
            <div v-for="s in active.stats" :key="s.label" class="program-stat">
              <strong>{{ s.valeur }}</strong>
              <span>{{ s.label }}</span>
            </div>
          </div>
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
