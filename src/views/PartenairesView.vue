<script setup>
import { ref, computed, onMounted } from 'vue'
import { partenaires } from '../data.js'
import { getPhotos, photoUrl } from '../lib/photos.js'
import { useSectionSlots } from '../lib/useSectionSlots.js'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

// Emplacements fixes : bannière, logo partenaire, fond CTA (remplaçables depuis l'application d'administration)
const { url: slotUrl } = useSectionSlots('partenaires')

const partnerLogos = computed(() => [
  {
    nom: 'Mama Yovo',
    image: slotUrl('logo'),
    description:
      "Partenaire engagé aux côtés de REGARD FRATERNEL pour soutenir les actions éducatives et solidaires de l'ONG au Bénin."
  }
])

/* Galerie des partenaires (gérée depuis l'application d'administration, section « partenaires ») */
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
          nos programmes sur le terrain.
        </p>

        <div class="partenaires__grid">
          <article
            v-for="(p, i) in partnerLogos"
            :key="p.nom"
            class="partenaire-card partenaire-card--logo reveal"
            v-reveal
            :style="{ '--reveal-delay': i * 100 + 'ms' }"
          >
            <img class="partenaire-card__logo-img" :src="p.image" :alt="`Logo ${p.nom}`" />
            <div>
              <h3>{{ p.nom }}</h3>
              <p>{{ p.description }}</p>
            </div>
          </article>

          <!-- Photos ajoutées par l'admin (section partenaires) -->
          <article
            v-for="(photo, i) in photos"
            :key="photo.id || photo.url"
            class="partenaire-card partenaire-card--logo reveal"
            v-reveal
            :style="{ '--reveal-delay': (partnerLogos.length + i) * 100 + 'ms' }"
          >
            <img class="partenaire-card__logo-img" :src="photoUrl(photo.url, 480)" :alt="photo.caption || 'Partenaire'" loading="lazy" />
            <div v-if="photo.caption">
              <h3>{{ photo.caption }}</h3>
            </div>
          </article>

          <article
            v-for="(p, i) in partenaires"
            :key="p.nom"
            class="partenaire-card reveal"
            v-reveal
            :style="{ '--reveal-delay': (partnerLogos.length + photos.length + i) * 100 + 'ms' }"
          >
            <div class="partenaire-card__icon"><Icon :name="p.icon" :size="26" /></div>
            <h3>{{ p.nom }}</h3>
            <p>{{ p.description }}</p>
            <ul class="partenaire-card__contact">
              <li>
                <Icon name="mail" :size="16" />
                <a :href="`mailto:${p.email}`">{{ p.email }}</a>
              </li>
              <li>
                <Icon name="phone" :size="16" />
                <a :href="`tel:${p.tel.replace(/\s/g, '')}`">{{ p.tel }}</a>
              </li>
            </ul>
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
