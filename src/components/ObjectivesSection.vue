<script setup>
import { objectifs } from '../data.js'
import Icon from './Icon.vue'

const icons = {
  shield: 'shield',
  handshake: 'handshake',
  sprout: 'sprout',
  graduation: 'graduation',
  tractor: 'wheat'
}
</script>

<template>
  <section class="section section--alt">
    <div class="container">
      <p class="eyebrow reveal" v-reveal>Nos objectifs</p>
      <h2 class="section-title reveal" v-reveal>
        Cinq axes pour <em>transformer</em> les communautés
      </h2>
      <p class="section-intro reveal" v-reveal>
        Conformément à nos statuts, REGARD FRATERNEL poursuit des objectifs concrets
        pour le bien-être et l'épanouissement des populations au Bénin et en Afrique.
      </p>

      <div class="objectifs__grid">
        <article
          v-for="(o, i) in objectifs"
          :key="o.titre"
          class="obj-card reveal" v-reveal
          :style="{ '--reveal-delay': i * 100 + 'ms' }"
        >
          <div class="obj-card__icon">
            <Icon :name="icons[o.icon] || 'target'" :size="26" />
          </div>
          <h3>{{ o.titre }}</h3>
          <p>{{ o.texte }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
