<script setup>
import { site, objectifs } from '../data.js'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

const icons = { shield: 'shield', handshake: 'handshake', sprout: 'sprout', graduation: 'graduation', tractor: 'wheat' }
</script>

<template>
  <div>
    <PageHeader
      title="À propos de l'ONG"
      subtitle="Organisation Non Gouvernementale béninoise à but non lucratif, apolitique et laïque."
      image="/images/design/scolaire-hero.jpg"
      eyebrow="Qui sommes-nous"
    />

    <section class="section">
      <div class="container">
        <div class="about__grid">
          <div class="about__media reveal" v-reveal>
            <div class="about__badge">Depuis {{ site.fondation }}</div>
            <img class="about__img-main" src="/images/design/don-float.jpg" alt="Action de REGARD FRATERNEL" />
            <img class="about__img-float" src="/images/design/scolaire-about.jpg" alt="Enfants bénéficiaires" />
          </div>

          <div class="about__text reveal" v-reveal style="--reveal-delay: 120ms">
            <p class="eyebrow">Notre histoire</p>
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
              <li><span class="check"><Icon name="check" :size="14" /></span> À but non lucratif</li>
              <li><span class="check"><Icon name="check" :size="14" /></span> Apolitique &amp; laïque</li>
              <li><span class="check"><Icon name="check" :size="14" /></span> Durée de vie illimitée</li>
              <li><span class="check"><Icon name="check" :size="14" /></span> Autonomie financière</li>
              <li><span class="check"><Icon name="check" :size="14" /></span> Personnalité morale</li>
              <li><span class="check"><Icon name="check" :size="14" /></span> Siège à Cotonou</li>
            </ul>
            <RouterLink to="/adhesion" class="btn btn--dark">
              Devenir membre
              <Icon name="arrowRight" :size="18" />
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Notre raison d'être</p>
        <h2 class="section-title reveal" v-reveal>Nos cinq objectifs <em>statutaires</em></h2>
        <div class="objectifs__grid">
          <article v-for="(o, i) in objectifs" :key="o.titre" class="obj-card reveal" v-reveal :style="{ '--reveal-delay': i * 100 + 'ms' }">
            <div class="obj-card__icon"><Icon :name="icons[o.icon] || 'target'" :size="26" /></div>
            <h3>{{ o.titre }}</h3>
            <p>{{ o.texte }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section values">
      <div class="container">
        <p class="eyebrow" style="color: var(--terracotta-400)">Notre devise</p>
        <h2 class="section-title" style="color: var(--white); margin-bottom: 54px">
          Solidarité · Espérance · <em>Amour</em>
        </h2>
        <div class="values__grid">
          <article v-for="v in [
            { icon: 'handshake', titre: 'Solidarité', texte: 'Être aux côtés des plus vulnérables, partager les ressources et les efforts pour bâtir une société plus juste et inclusive.' },
            { icon: 'sunrise', titre: 'Espérance', texte: 'Donner aux communautés les moyens de croire en l’avenir : éducation, santé, développement — chaque action fait naître une lueur d’espoir.' },
            { icon: 'heart', titre: 'Amour', texte: 'Agir avec humanité, dignité et respect pour chaque personne, car chaque regard posé avec bienveillance peut sauver une vie humaine.' }
          ]" :key="v.titre" class="value-card reveal" v-reveal>
            <div class="value-card__icon"><Icon :name="v.icon" :size="28" /></div>
            <h3>{{ v.titre }}</h3>
            <p>{{ v.texte }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="legal-doc reveal" v-reveal>
          <div>
            <h3>Nos références légales</h3>
            <p>{{ site.recu }} — régie par la {{ site.loi }}.</p>
          </div>
          <RouterLink class="btn btn--primary" to="/textes">
            <Icon name="fileText" :size="18" />
            Textes juridiques
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
