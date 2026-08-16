<script setup>
import Icon from './Icon.vue'

const values = [
  {
    icon: 'handshake',
    titre: 'Solidarité',
    texte: 'Être aux côtés des plus vulnérables, partager les ressources et les efforts pour bâtir une société plus juste et inclusive au Bénin et en Afrique.'
  },
  {
    icon: 'sunrise',
    titre: 'Espérance',
    texte: 'Donner aux communautés les moyens de croire en l’avenir : éducation, santé, développement — chaque action fait naître une lueur d’espoir.'
  },
  {
    icon: 'heart',
    titre: 'Amour',
    texte: 'Agir avec humanité, dignité et respect pour chaque personne, car chaque regard posé avec bienveillance peut sauver une vie humaine.'
  }
]
</script>

<template>
  <section class="section values">
    <div class="container">
      <p class="eyebrow" style="color: var(--terracotta-400)">Notre devise</p>
      <h2 class="section-title" style="color: var(--white); margin-bottom: 54px">
        Solidarité · Espérance · <em>Amour</em>
      </h2>

      <div class="values__grid">
        <article
          v-for="(v, i) in values"
          :key="v.titre"
          class="value-card reveal" v-reveal
          :style="{ '--reveal-delay': i * 130 + 'ms' }"
        >
          <div class="value-card__icon">
            <Icon :name="v.icon" :size="28" />
          </div>
          <h3>{{ v.titre }}</h3>
          <p>{{ v.texte }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
