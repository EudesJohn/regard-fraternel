<script setup>
import { computed } from 'vue'
import { programmes, piliersIntro, piliersTransversal } from '../data.js'
import { useManySlots } from '../lib/useSectionSlots.js'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

// Emplacements fixes : bannière de la page + couvertures des piliers
const { url: slotUrl } = useManySlots(['actions', ...programmes.map((p) => p.photos)])

const cover = computed(() =>
  Object.fromEntries(programmes.map((p) => [p.photos, slotUrl(p.photos, 'cover')]))
)
</script>

<template>
  <div>
    <PageHeader
      title="Nos actions"
      subtitle="Éducation, égalité des genres, santé et environnement : quatre piliers d'intervention au service des communautés au Bénin."
      :image="slotUrl('actions', 'header')"
      eyebrow="Sur le terrain"
    />

    <section class="section">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Nos piliers d'intervention</p>
        <h2 class="section-title reveal" v-reveal>Nos quatre piliers <em>d'intervention</em></h2>
        <p class="section-intro reveal" v-reveal>
          {{ piliersIntro }}
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
              <span class="program-card__num">Pilier {{ p.numero }}</span>
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

        <div class="transversal reveal" v-reveal>
          <div class="transversal__icon">
            <Icon name="shield" :size="30" />
          </div>
          <div class="transversal__body">
            <h3>{{ piliersTransversal.titre }}</h3>
            <p>{{ piliersTransversal.texte }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
