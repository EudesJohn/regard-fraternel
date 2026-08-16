<script setup>
import { site } from '../data.js'
import Icon from './Icon.vue'

const documents = [
  {
    num: 'DOC. 01',
    titre: 'Statuts',
    texte: "Les statuts de l'ONG fixent l'identification, les objectifs, la composition, l'organisation et les ressources de REGARD FRATERNEL, conformément à la loi béninoise."
  },
  {
    num: 'DOC. 02',
    titre: 'Règlement Intérieur',
    texte: "Le règlement intérieur précise les modalités d'application des statuts : adhésion, démission, droits et devoirs des membres, discipline, sanctions et gestion."
  },
  {
    num: 'DOC. 03',
    titre: 'Procès-Verbal',
    texte: "Le procès-verbal de la 2ᵉ Assemblée Générale Extraordinaire acte l'adoption des nouveaux statuts et l'élection des membres des organes dirigeants."
  }
]
</script>

<template>
  <section id="textes" class="section section--alt">
    <div class="container">
      <p class="eyebrow reveal" v-reveal>Textes juridiques</p>
      <h2 class="section-title reveal" v-reveal>
        Des textes <em>fondateurs</em> transparents et accessibles
      </h2>
      <p class="section-intro reveal" v-reveal>
        REGARD FRATERNEL est régie par des textes juridiques complets, adoptés en
        Assemblée Générale Constitutive et conformes à la {{ site.loi }}.
      </p>

      <div class="legal__grid">
        <article
          v-for="(d, i) in documents"
          :key="d.titre"
          class="legal-card reveal" v-reveal
          :style="{ '--reveal-delay': i * 110 + 'ms' }"
        >
          <p class="legal-card__num">{{ d.num }}</p>
          <h3>{{ d.titre }}</h3>
          <p>{{ d.texte }}</p>
          <a class="legal-card__link" :href="site.documents" target="_blank" rel="noopener">
            Consulter le document
            <Icon name="arrowRight" :size="16" />
          </a>
        </article>
      </div>

      <div class="legal-doc reveal" v-reveal>
        <div>
          <h3>Les textes juridiques complets</h3>
          <p>
            Statuts · Règlement Intérieur · Procès-Verbal — document PDF officiel de
            l'organisation.
          </p>
        </div>
        <a class="btn btn--primary" :href="site.documents" target="_blank" rel="noopener">
          <Icon name="download" :size="18" />
          Télécharger le PDF
        </a>
      </div>
    </div>
  </section>
</template>
