<script setup>
import { reactive, ref } from 'vue'
import { site } from '../data.js'
import Icon from './Icon.vue'

const form = reactive({ nom: '', email: '', telephone: '', message: '' })
const status = ref('') // '' | 'sending' | 'sent' | 'error'
const errorMsg = ref('')

// Envoi direct à FormSubmit (gratuit, illimité, sans clé API) : l'e-mail
// arrive à l'ONG bien structuré en tableau (_template: table).
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/ongregardfraternel13@gmail.com'

const contactItems = [
  { icon: 'mapPin', label: 'Siège social', titre: site.siege, texte: site.bp },
  { icon: 'phone', label: 'Téléphone', tel: true },
  { icon: 'mail', label: 'E-mail', mail: site.email },
  { icon: 'landmark', label: 'Références', titre: site.recu }
]

const submit = async () => {
  if (status.value === 'sending') return
  status.value = 'sending'
  errorMsg.value = ''
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        'Nom complet': form.nom,
        'E-mail': form.email,
        'Téléphone': form.telephone || 'Non renseigné',
        'Message': form.message,
        _template: 'table',
        _subject: `Nouveau message du site REGARD FRATERNEL — ${form.nom}`,
        _captcha: 'false'
      })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.success !== 'true') {
      throw new Error(data.message || "L'envoi a échoué, réessayez plus tard.")
    }
    status.value = 'sent'
    form.nom = ''
    form.email = ''
    form.telephone = ''
    form.message = ''
    setTimeout(() => (status.value = ''), 8000)
  } catch (e) {
    status.value = 'error'
    errorMsg.value = e.message
    setTimeout(() => (status.value = ''), 8000)
  }
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
          <button type="submit" class="btn btn--primary" style="margin-top: 24px; width: 100%; justify-content: center" :disabled="status === 'sending'">
            <template v-if="status === 'sending'">Envoi en cours…</template>
            <template v-else>Envoyer le message</template>
            <Icon v-if="status !== 'sending'" name="send" :size="18" />
          </button>
          <p v-if="status === 'sent'" class="form-success">
            ✓ Merci ! Votre message a bien été envoyé à REGARD FRATERNEL. Nous vous répondrons rapidement.
          </p>
          <p v-else-if="status === 'error'" class="form-error">
            ✗ {{ errorMsg }}
          </p>
        </form>
      </div>
    </div>
  </section>
</template>
