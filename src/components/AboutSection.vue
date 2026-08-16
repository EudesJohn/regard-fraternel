<script setup>
import { site } from '../data.js'
</script>

<template>
  <section id="apropos" class="section">
    <div class="container">
      <div class="about__grid">
        <div class="about__media reveal" v-reveal>
          <div class="about__badge">Depuis {{ site.fondation }}</div>
          <img
            class="about__img-main"
            src="/images/design/don-float.jpg"
            alt="Action de REGARD FRATERNEL"
          />
          <img
            class="about__img-float"
            src="/images/design/scolaire-about.jpg"
            alt="Enfants bénéficiaires"
          />
        </div>

        <div class="about__text reveal" v-reveal style="--reveal-delay: 120ms">
          <p class="eyebrow">Qui sommes-nous</p>
          <h2 class="section-title">
            Une ONG citoyenne au service de <em>la solidarité</em> et des droits humains
          </h2>
          <p>
            REGARD FRATERNEL (RF) est une Organisation Non Gouvernementale de droit
            béninois, à but non lucratif, apolitique et laïque. Fondée le
            {{ site.fondation }} à Cotonou, elle est régie par la {{ site.loi }}
            relative aux associations et fondations en République du Bénin.
          </p>
          <p>
            Conscients de leur responsabilité citoyenne et sociale, les membres de
            REGARD FRATERNEL œuvrent chaque jour pour la protection des droits humains,
            l'équité sociale et le développement des communautés à la base — en
            particulier les femmes, les enfants et les couches sociales les plus
            vulnérables.
          </p>
          <ul class="about__list">
            <li><span class="check">✓</span> À but non lucratif</li>
            <li><span class="check">✓</span> Apolitique &amp; laïque</li>
            <li><span class="check">✓</span> Durée de vie illimitée</li>
            <li><span class="check">✓</span> Autonomie financière</li>
            <li><span class="check">✓</span> Personnalité morale</li>
            <li><span class="check">✓</span> Siège à Cotonou</li>
          </ul>
          <a href="#adhesion" class="btn btn--dark">Devenir membre →</a>
        </div>
      </div>
    </div>
  </section>
</template>
