<script setup>
import { organes, presidium, bureauPostes } from '../data.js'
import Icon from './Icon.vue'

const icons = {
  users: 'users',
  briefcase: 'briefcase',
  compass: 'compass',
  scale: 'scale'
}
</script>

<template>
  <section id="gouvernance" class="section">
    <div class="container">
      <p class="eyebrow reveal" v-reveal>Gouvernance</p>
      <h2 class="section-title reveal" v-reveal>
        Des organes <em>structurés</em> pour une gestion transparente
      </h2>
      <p class="section-intro reveal" v-reveal>
        Conformément à nos statuts, l'organisation repose sur des organes clairement
        définis qui garantissent une gouvernance démocratique et responsable.
      </p>

      <div class="gov__grid">
        <article
          v-for="(o, i) in organes"
          :key="o.nom"
          class="gov-card reveal" v-reveal
          :style="{ '--reveal-delay': i * 100 + 'ms' }"
        >
          <div class="gov-card__icon">
            <Icon :name="icons[o.icon] || 'target'" :size="24" />
          </div>
          <h3>{{ o.nom }}</h3>
          <p>{{ o.role }}</p>
        </article>
      </div>

      <div class="bureau">
        <p class="eyebrow reveal" v-reveal style="margin-top: 40px">Le Présidium</p>
        <h2 class="section-title reveal" v-reveal style="font-size: clamp(1.6rem, 3vw, 2.2rem)">
          Membres ayant <em>signé</em> les textes fondateurs
        </h2>
        <p class="section-intro reveal" v-reveal>
          Le Présidium de l'Assemblée Générale Constitutive, signataire du
          Procès-Verbal du 10 avril 2025.
        </p>

        <div class="bureau__grid" style="grid-template-columns: repeat(3, 1fr)">
          <article
            v-for="(m, i) in presidium"
            :key="m.poste"
            class="bureau-card reveal" v-reveal
            :style="{ '--reveal-delay': i * 90 + 'ms' }"
          >
            <div class="bureau-card__avatar">{{ m.initiales }}</div>
            <div>
              <h4>{{ m.nom }}</h4>
              <span>{{ m.poste }}</span>
            </div>
          </article>
        </div>
      </div>

      <div class="bureau">
        <p class="eyebrow reveal" v-reveal style="margin-top: 40px">Le Bureau Exécutif</p>
        <h2 class="section-title reveal" v-reveal style="font-size: clamp(1.6rem, 3vw, 2.2rem)">
          Cinq postes au service de <em>la cause</em>
        </h2>
        <p class="section-intro reveal" v-reveal>
          Conformément à l'article 17 des statuts, le Bureau Exécutif est composé de
          cinq (05) membres élus en Assemblée Générale.
        </p>

        <div class="bureau__grid">
          <article
            v-for="(m, i) in bureauPostes"
            :key="m.poste"
            class="bureau-card reveal" v-reveal
            :style="{ '--reveal-delay': i * 90 + 'ms' }"
          >
            <div class="bureau-card__avatar" style="background: linear-gradient(135deg, var(--terracotta-500), var(--terracotta-600))">
              {{ m.initiales }}
            </div>
            <div>
              <h4>{{ m.poste }}</h4>
              <span>{{ m.nom }}</span>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
