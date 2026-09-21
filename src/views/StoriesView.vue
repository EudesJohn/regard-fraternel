<script setup>
import { ref, onMounted, computed } from 'vue'
import { getStories, getStoriesConfig } from '../lib/stories.js'
import { useSectionSlots } from '../lib/useSectionSlots.js'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

/* Bannière remplaçable depuis l'admin (section « histoires ») */
const { url: slotUrl } = useSectionSlots('histoires')

const config = ref({ subtitle: '', intro: '', outro: '' })
const stories = ref([])
const loading = ref(true)

onMounted(async () => {
  const [cfg, list] = await Promise.all([getStoriesConfig(), getStories()])
  config.value = cfg
  stories.value = list
  loading.value = false
})

/* Texte complet déplié ? (un seul récit ouvert à la fois) */
const openId = ref(null)

const hasStories = computed(() => stories.value.length > 0)
</script>

<template>
  <div>
    <PageHeader
      title="Nos histoires"
      :subtitle="config.subtitle"
      :image="slotUrl('header')"
      eyebrow="Des vies changées"
    />

    <!-- Introduction (éditable dans l'admin) -->
    <section class="section">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Des récits vrais</p>
        <h2 class="section-title reveal" v-reveal>Des histoires de <em>courage et d'espoir</em></h2>
        <p class="section-intro reveal" v-reveal style="max-width: 820px">
          {{ config.intro }}
        </p>
      </div>
    </section>

    <!-- Récits -->
    <section class="section section--alt" style="padding-top: 0">
      <div class="container">
        <p v-if="loading" class="section-intro">Chargement des histoires…</p>

        <template v-else-if="hasStories">
          <div class="stories__grid">
            <article
              v-for="(s, i) in stories"
              :key="s.id"
              class="story-card reveal"
              v-reveal
              :style="{ '--reveal-delay': (i % 3) * 100 + 'ms' }"
            >
              <img class="story-card__img" :src="s.url" :alt="s.caption || 'Histoire'" loading="lazy" />
              <div class="story-card__body">
                <p v-if="s.kicker" class="story-card__kicker">{{ s.kicker }}</p>
                <h3 v-if="s.caption">{{ s.caption }}</h3>
                <p class="story-card__excerpt" :class="{ 'is-open': openId === s.id }" style="white-space: pre-line">{{ s.body }}</p>
                <button
                  v-if="s.body"
                  class="story-card__toggle"
                  type="button"
                  @click="openId = openId === s.id ? null : s.id"
                >
                  {{ openId === s.id ? 'Réduire' : 'Lire la suite' }}
                  <Icon :name="openId === s.id ? 'chevronLeft' : 'chevronRight'" :size="16" style="transform: rotate(-90deg)" />
                </button>
              </div>
            </article>
          </div>
        </template>

        <p v-else class="section-intro">
          Les premières histoires arrivent très bientôt — revenez nous voir !
        </p>
      </div>
    </section>

    <!-- Conclusion (éditable dans l'admin) -->
    <section class="cta-band">
      <div class="cta-band__bg" :style="{ backgroundImage: `url(${slotUrl('header')})` }"></div>
      <div class="cta-band__scrim"></div>
      <div class="container cta-band__content reveal" v-reveal>
        <h2>{{ config.outro }}</h2>
        <div>
          <RouterLink to="/don" class="btn btn--primary">
            Faire un don
            <Icon name="heart" :size="18" />
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
