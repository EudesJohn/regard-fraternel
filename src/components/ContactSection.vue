<script setup>
import { reactive, ref } from 'vue'
import { site } from '../data.js'
import Icon from './Icon.vue'

const form = reactive({ nom: '', email: '', telephone: '', message: '' })
const sent = ref(false)

const contactItems = [
  { icon: 'mapPin', label: 'Siège social', titre: site.siege, texte: site.bp },
  { icon: 'phone', label: 'Téléphone', tel: true },
  { icon: 'mail', label: 'E-mail', mail: site.email },
  { icon: 'landmark', label: 'Références', titre: site.recu }
]

const submit = () => {
  sent.value = true
  form.nom = ''
  form.email = ''
  form.telephone = ''
  form.message = ''
  setTimeout(() => (sent.value = false), 6000)
}
</script>

<template>
  <section id="contact" class="section section--alt">
    <div class="container">
      <p class="eyebrow reveal" v-reveal>Contact</p>
      <h2 class="section-title reveal" v-reveal>
        Parlons de <em>solidarité</em>
      </h2>
      <p class="section-intro reveal" v-reveal>
        Une question, un projet, une idée de partenariat ? Écrivez-nous — notre équipe
        vous répondra avec plaisir.
      </p>

      <div class="contact__grid">
        <div class="reveal" v-reveal>
          <ul class="contact__info">
            <li v-for="item in contactItems" :key="item.label">
              <div class="contact__icon">
                <Icon :name="item.icon" :size="22" />
              </div>
              <div>
                <h4>{{ item.label }}</h4>
                <template v-if="item.tel">
                  <p>
                    <a :href="`tel:${site.tel[0].replace(/\s/g, '')}`">{{ site.tel[0] }}</a>
                    <span style="color: var(--ink-soft)"> / </span>
                    <a :href="`tel:${site.tel[1].replace(/\s/g, '')}`">{{ site.tel[1] }}</a>
                  </p>
                </template>
                <template v-else-if="item.mail">
                  <p><a :href="`mailto:${item.mail}`">{{ item.mail }}</a></p>
                </template>
                <template v-else>
                  <p>{{ item.titre }}</p>
                  <p v-if="item.texte" style="margin-top: 4px; color: var(--ink-soft); font-weight: 400">{{ item.texte }}</p>
                </template>
              </div>
            </li>
          </ul>
        </div>

        <form class="contact__form reveal" v-reveal style="--reveal-delay: 120ms" @submit.prevent="submit">
          <h3 style="font-family: var(--font-display); font-size: 1.5rem; color: var(--forest-900); margin-bottom: 26px">
            Envoyez-nous un message
          </h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="nom">Nom complet</label>
              <input id="nom" v-model="form.nom" type="text" required placeholder="Votre nom" />
            </div>
            <div class="form-field">
              <label for="email">E-mail</label>
              <input id="email" v-model="form.email" type="email" required placeholder="vous@exemple.com" />
            </div>
            <div class="form-field form-field--full">
              <label for="telephone">Téléphone (optionnel)</label>
              <input id="telephone" v-model="form.telephone" type="tel" placeholder="+229 ..." />
            </div>
            <div class="form-field form-field--full">
              <label for="message">Votre message</label>
              <textarea id="message" v-model="form.message" required placeholder="Écrivez votre message ici..."></textarea>
            </div>
          </div>
          <button type="submit" class="btn btn--primary" style="margin-top: 24px; width: 100%; justify-content: center">
            Envoyer le message
            <Icon name="send" :size="18" />
          </button>
          <p v-if="sent" class="form-success">
            ✓ Merci ! Votre message a bien été pris en compte. Nous vous répondrons rapidement.
          </p>
        </form>
      </div>
    </div>
  </section>
</template>
