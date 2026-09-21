<script setup>
import { ref, onMounted } from 'vue'
import { getPhotos, photoUrl } from '../lib/photos.js'
import { useSectionSlots } from '../lib/useSectionSlots.js'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

// Emplacements fixes : bannière, logo partenaire, fond CTA (remplaçables depuis l'application d'administration)
const { url: slotUrl } = useSectionSlots('partenaires')

/* Galerie des partenaires (gérée depuis l'application d'administration, section « partenaires ») :
   légende = nom du partenaire, description = texte affiché dessous */
const photos = ref([])
const loading = ref(true)

onMounted(async () => {
  photos.value = await getPhotos('partenaires')
  loading.value = false
})
</script>

<template>
  <div>
    <PageHeader
      title="Partenaires"
      subtitle="Des acteurs engagés à nos côtés pour la solidarité, l'éducation et la santé des communautés."
      :image="slotUrl('header')"
      eyebrow="Ils nous soutiennent"
    />

    <!-- Cartes partenaires -->
    <section class="section">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Nos partenaires</p>
        <h2 class="section-title reveal" v-reveal>Ils nous <em>soutiennent</em></h2>
        <p class="section-intro reveal" v-reveal>
          Des partenaires locaux et internationaux œuvrent avec nous pour faire vivre
          nos piliers d'intervention sur le terrain.
        </p>

        <div class="partenaires__grid">
          <!-- Photos ajoutées par l'admin (section partenaires) :
               légende = nom du partenaire, description = texte affiché dessous -->
          <article
            v-for="(photo, i) in photos"
            :key="photo.id || photo.url"
            class="partenaire-card partenaire-card--logo reveal"
            v-reveal
            :style="{ '--reveal-delay': i * 100 + 'ms' }"
          >
            <img class="partenaire-card__logo-img" :src="photoUrl(photo.url, 480)" :alt="photo.caption || 'Partenaire'" loading="lazy" />
            <div v-if="photo.caption || photo.description">
              <h3 v-if="photo.caption">{{ photo.caption }}</h3>
              <p v-if="photo.description">{{ photo.description }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Galerie des partenaires (photos gérées depuis l'application d'administration) -->
    <section v-if="!loading && photos.length" class="section section--alt">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>En images</p>
        <h2 class="section-title reveal" v-reveal>Nos partenaires <em>sur le terrain</em></h2>

        <div class="gallery">
          <figure
            v-for="(photo, i) in photos"
            :key="photo.id || photo.url"
            class="gallery__item"
            :class="{ 'gallery__item--tall': i % 5 === 2 }"
          >
            <img :src="photoUrl(photo.url, 480)" :alt="photo.caption || 'Nos partenaires'" loading="lazy" />
            <figcaption v-if="photo.caption" class="gallery__caption">{{ photo.caption }}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-band">
      <div class="cta-band__bg" :style="{ backgroundImage: `url(${slotUrl('cta')})` }"></div>
      <div class="cta-band__scrim"></div>
      <div class="container cta-band__content reveal" v-reveal>
        <h2>Devenir partenaire</h2>
        <p>
          Entreprises, associations, fondations ou particuliers : rejoignez nos
          partenaires et soutenez concrètement les actions de REGARD FRATERNEL.
        </p>
        <div>
          <RouterLink to="/contact" class="btn btn--primary">
            Nous contacter
            <Icon name="arrowRight" :size="18" />
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
