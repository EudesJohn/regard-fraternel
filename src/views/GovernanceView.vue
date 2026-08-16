<script setup>
import { organes, presidium, bureauPostes, commissaires } from '../data.js'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

const icons = { users: 'users', briefcase: 'briefcase', compass: 'compass', scale: 'scale' }
</script>

<template>
  <div>
    <PageHeader
      title="Gouvernance"
      subtitle="Des organes structurés pour une gestion transparente et démocratique de l'organisation."
      image="/images/design/don-gouvernance.jpg"
      eyebrow="Organisation"
    />

    <section class="section">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Les organes</p>
        <h2 class="section-title reveal" v-reveal>Une gouvernance <em>clairement définie</em></h2>
        <p class="section-intro reveal" v-reveal>
          Conformément à nos statuts, l'organisation repose sur des organes clairement
          définis qui garantissent une gouvernance démocratique et responsable.
        </p>

        <div class="gov__grid">
          <article v-for="(o, i) in organes" :key="o.nom" class="gov-card reveal" v-reveal :style="{ '--reveal-delay': i * 100 + 'ms' }">
            <div class="gov-card__icon"><Icon :name="icons[o.icon] || 'target'" :size="24" /></div>
            <h3>{{ o.nom }}</h3>
            <p>{{ o.role }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Le Présidium</p>
        <h2 class="section-title reveal" v-reveal>Membres ayant <em>signé</em> les textes fondateurs</h2>
        <p class="section-intro reveal" v-reveal>
          Le Présidium de l'Assemblée Générale Constitutive, signataire du Procès-Verbal
          du 10 avril 2025.
        </p>

        <div class="bureau__grid" style="grid-template-columns: repeat(3, 1fr)">
          <article v-for="(m, i) in presidium" :key="m.poste" class="bureau-card reveal" v-reveal :style="{ '--reveal-delay': i * 90 + 'ms' }">
            <div class="bureau-card__avatar">{{ m.initiales }}</div>
            <div>
              <h4>{{ m.nom }}</h4>
              <span>{{ m.poste }}</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Le Bureau Exécutif</p>
        <h2 class="section-title reveal" v-reveal>Les cinq membres élus <em>en Assemblée Générale</em></h2>
        <p class="section-intro reveal" v-reveal>
          Conformément à l'article 17 des statuts, le Bureau Exécutif est composé de
          cinq (05) membres élus en Assemblée Générale.
        </p>

        <div class="membres__grid">
          <article v-for="(m, i) in bureauPostes" :key="m.poste" class="membre-card reveal" v-reveal :style="{ '--reveal-delay': i * 90 + 'ms' }">
            <div class="membre-card__head">
              <div class="membre-card__avatar">{{ m.initiales }}</div>
              <div>
                <span class="membre-card__poste">{{ m.poste }}</span>
                <h3>{{ m.nom }}</h3>
              </div>
            </div>
            <ul class="membre-card__infos">
              <li><span>Âge</span>{{ m.age }}</li>
              <li><span>Profession</span>{{ m.profession }}</li>
              <li><span>Adresse</span>{{ m.adresse }}</li>
              <li>
                <span>Téléphone</span>
                <a :href="`tel:${m.tel.replace(/\s/g, '')}`">{{ m.tel }}</a>
              </li>
              <li>
                <span>E-mail</span>
                <a :href="`mailto:${m.email}`">{{ m.email }}</a>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Le Commissariat aux Comptes</p>
        <h2 class="section-title reveal" v-reveal>La vérification <em>indépendante</em> des comptes</h2>
        <p class="section-intro reveal" v-reveal>
          Deux commissaires élus en Assemblée Générale vérifient, contrôlent et
          approuvent les comptes de l'organisation.
        </p>

        <div class="membres__grid membres__grid--2">
          <article v-for="(m, i) in commissaires" :key="m.poste" class="membre-card reveal" v-reveal :style="{ '--reveal-delay': i * 90 + 'ms' }">
            <div class="membre-card__head">
              <div class="membre-card__avatar" style="background: linear-gradient(135deg, var(--forest-700), var(--forest-900))">
                {{ m.initiales }}
              </div>
              <div>
                <span class="membre-card__poste">{{ m.poste }}</span>
                <h3>{{ m.nom }}</h3>
              </div>
            </div>
            <ul class="membre-card__infos">
              <li><span>Âge</span>{{ m.age }}</li>
              <li><span>Profession</span>{{ m.profession }}</li>
              <li><span>Adresse</span>{{ m.adresse }}</li>
              <li>
                <span>Téléphone</span>
                <a :href="`tel:${m.tel.replace(/\s/g, '')}`">{{ m.tel }}</a>
              </li>
              <li>
                <span>E-mail</span>
                <a :href="`mailto:${m.email}`">{{ m.email }}</a>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>
