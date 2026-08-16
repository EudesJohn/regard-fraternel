<script setup>
import { site } from '../data.js'
import Icon from './Icon.vue'
</script>

<template>
  <section id="accueil" class="hero">
    <div class="hero__bg" :style="{ backgroundImage: 'url(/images/design/hero-main.jpg)' }"></div>
    <div class="hero__overlay"></div>

    <div class="container">
      <div class="hero__content">
        <img class="hero__logo" src="/logo-light.png" alt="Logo REGARD FRATERNEL" />
        <p class="hero__kicker">Organisation Non Gouvernementale · Bénin</p>
        <h1 class="hero__title">
          REGARD FRATERNEL
          <span>— des vies humaines sauvées</span>
        </h1>
        <p class="hero__sub">
          {{ site.slogan }}. Une ONG béninoise à but non lucratif, apolitique et laïque,
          au service des droits humains, de l'éducation, de la santé et du développement
          des communautés vulnérables.
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
