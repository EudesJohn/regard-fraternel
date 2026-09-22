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
        <div class="hero__brand">
          <img class="hero__logo" src="/logo-light.png" alt="Logo REGARD FRATERNEL" />
          <div class="hero__heading">
            <p class="hero__kicker">ONG à but non lucratif</p>
            <h1 class="hero__title">
              REGARD FRATERNEL (RF)
              <span>Ensemble pour le bien-être de tous</span>
            </h1>
          </div>
        </div>
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
