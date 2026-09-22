<script setup>
import { site } from '../data.js'
import Icon from './Icon.vue'
</script>

<template>
  <section id="accueil" class="hero">
    <div class="hero__bg" :style="{ backgroundImage: 'url(/images/photos/don/don-01.jpg)' }"></div>
    <div class="hero__overlay"></div>

    <div class="container">
      <div class="hero__content">
        <img class="hero__logo" src="/logo-light.png" alt="Logo REGARD FRATERNEL" />
        <p class="hero__kicker">Organisation Non Gouvernementale · Bénin</p>
        <h1 class="hero__title">
          REGARD FRATERNEL
          <span>— des vies humaines sauvées</span>
        </h1>
        <p class="hero__slogan-band">
          <span class="hero__slogan-band__mark" aria-hidden="true">“</span>
          <span class="hero__slogan-band__text">
            Juste un <em>regard</em> et des vies humaines sont sauvées
          </span>
        </p>
        <div class="hero__cta">
          <a href="#actions" class="btn btn--primary">
            Découvrir nos actions
            <Icon name="arrowRight" :size="18" />
          </a>
          <a href="#apropos" class="btn btn--ghost">Notre mission</a>
        </div>
        <p class="hero__devise">Devise — {{ site.devise }}</p>
      </div>
    </div>

    <a href="#apropos" class="hero__scroll" aria-label="Défiler vers le bas"></a>
  </section>
</template>
