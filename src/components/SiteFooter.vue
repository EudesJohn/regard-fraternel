<script setup>
import { site } from '../data.js'
import Icon from './Icon.vue'

const links = [
  { label: 'Accueil', to: '/' },
  { label: 'À propos', to: '/apropos' },
  { label: 'Nos actions', to: '/actions' },
  { label: 'Gouvernance', to: '/gouvernance' },
  { label: 'Textes juridiques', to: '/textes' },
  { label: 'Adhésion', to: '/adhesion' },
  { label: 'Contact', to: '/contact' }
]

const contact = [
  { icon: 'mapPin', texte: site.siege },
  { icon: 'mail', texte: site.bp },
  { icon: 'phone', tel: true },
  { icon: 'mail', mail: site.email },
  { icon: 'facebook', lien: 'https://www.facebook.com/share/1HHDfUHRR5/', texte: 'Facebook — Regard Fraternel' }
]
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand">
          <RouterLink to="/">
            <img class="nav__logo" src="/logo-light.png" alt="Logo REGARD FRATERNEL" />
          </RouterLink>
          <h3 style="font-family: var(--font-display); color: var(--white); font-size: 1.4rem; margin-bottom: 12px">
            REGARD FRATERNEL
          </h3>
          <p>{{ site.slogan }} — {{ site.devise }}.</p>
        </div>

        <div>
          <h5>Navigation</h5>
          <ul class="footer__links">
            <li v-for="l in links" :key="l.to">
              <RouterLink :to="l.to">{{ l.label }}</RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <h5>Légal</h5>
          <ul class="footer__links">
            <li><RouterLink to="/textes">Statuts</RouterLink></li>
            <li><RouterLink to="/textes">Règlement Intérieur</RouterLink></li>
            <li><RouterLink to="/textes">Procès-Verbal</RouterLink></li>
            <li><a :href="site.documents" target="_blank" rel="noopener">Textes complets (PDF)</a></li>
          </ul>
        </div>

        <div>
          <h5>Contact</h5>
          <ul class="footer__contact">
            <li v-for="(c, i) in contact" :key="i">
              <span class="footer__contact-icon">
                <Icon :name="c.icon" :size="18" />
              </span>
              <template v-if="c.tel">
                <span>
                  <a :href="`tel:${site.tel[0].replace(/\s/g, '')}`">{{ site.tel[0] }}</a><br />
                  <a :href="`tel:${site.tel[1].replace(/\s/g, '')}`">{{ site.tel[1] }}</a>
                </span>
              </template>
              <template v-else-if="c.mail">
                <a :href="`mailto:${c.mail}`">{{ c.mail }}</a>
              </template>
              <template v-else-if="c.lien">
                <a :href="c.lien" target="_blank" rel="noopener">{{ c.texte }}</a>
              </template>
              <template v-else>
                <span>{{ c.texte }}</span>
              </template>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer__bottom">
        <p>© {{ new Date().getFullYear() }} REGARD FRATERNEL — Organisation Non Gouvernementale. Tous droits réservés.</p>
        <p>{{ site.recu }} · <RouterLink to="/admin" class="footer__admin">Espace admin</RouterLink></p>
      </div>
    </div>
  </footer>
</template>
