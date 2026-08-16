<script setup>
import { programmes } from '../data.js'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

const cover = {
  sanitaire: '/images/design/cover-sanitaire.jpg',
  scolaire: '/images/design/cover-scolaire.jpg',
  jeux: '/images/design/cover-jeux.jpg',
  donEcole: '/images/design/cover-don.jpg'
}
</script>

<template>
  <div>
    <PageHeader
      title="Nos actions"
      subtitle="Santé, éducation, loisirs et dons : des programmes concrets menés auprès des communautés au Bénin."
      image="/images/design/scolaire-band.jpg"
      eyebrow="Sur le terrain"
    />

    <section class="section">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Nos programmes</p>
        <h2 class="section-title reveal" v-reveal>Quatre piliers <em>d'action</em></h2>
        <p class="section-intro reveal" v-reveal>
          Chaque programme répond à un besoin concret des communautés, en lien avec nos
          objectifs statutaires. Cliquez sur un programme pour découvrir ses photos.
        </p>

        <div class="program-cards program-cards--alt">
          <RouterLink
            v-for="(p, i) in programmes"
            :key="p.id"
            :to="`/actions/${p.id}`"
            class="program-card reveal" v-reveal
            :style="{ '--reveal-delay': i * 100 + 'ms' }"
          >
            <img :src="cover[p.photos]" :alt="p.titre" />
            <div class="program-card__scrim"></div>
            <div class="program-card__body">
              <span class="program-card__num">{{ p.numero }}</span>
              <h3>{{ p.titre }}</h3>
              <p>{{ p.sousTitre }}</p>
              <p class="program-card__desc">{{ p.texte }}</p>
              <span class="program-card__link">
                Voir la galerie
                <Icon name="arrowRight" :size="16" />
              </span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
