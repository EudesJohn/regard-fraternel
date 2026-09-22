<script setup>
import { reactive, ref, onMounted } from 'vue'
import { site } from '../data.js'
import { getPhotos, photoUrl } from '../lib/photos.js'
import { useSectionSlots } from '../lib/useSectionSlots.js'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import {
  sanitizeName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeMultiline,
  honeypotTripped,
  fakeDelay,
  LIMITS
} from '../lib/validation.js'
import { sendContactMessage, sendViaFormSubmit } from '../lib/contact.js'

// Bannière de la page (remplaçable depuis l'application d'administration)
const { url: slotUrl } = useSectionSlots('contact')

// `website` = champ honeypot : invisible à l'écran, rempli uniquement par les bots.
const form = reactive({ nom: '', email: '', telephone: '', message: '', website: '' })
const status = ref('') // '' | 'sending' | 'sent' | 'error'
const errorMsg = ref('')

// Envoi via l'Edge Function Supabase « contact » (repli FormSubmit automatique).
// Voir src/lib/contact.js — la validation définitive est côté serveur.

const submit = async () => {
  if (status.value === 'sending') return
  status.value = 'sending'
  errorMsg.value = ''

  // 1. Honeypot : rejet SILENCIEUX des bots (fausse réussite, pour ne pas les éduquer).
  if (honeypotTripped(form, 'website')) {
    status.value = 'sent'
    setTimeout(() => (status.value = ''), 8000)
    return
  }

  // 2. Validation stricte avant envoi (miroir local de la validation attendue).
  const nom = sanitizeName(form.nom)
  const email = sanitizeEmail(form.email)
  const tel = sanitizePhone(form.telephone) // '' si absent, null si invalide
  const message = sanitizeMultiline(form.message, LIMITS.message)
  if (!nom || !email || tel === null || message.length < 10) {
    status.value = 'error'
    errorMsg.value =
      'Vérifiez vos champs : nom (lettres), e-mail valide, téléphone valide (si renseigné) et message de 10 caractères minimum.'
    setTimeout(() => (status.value = ''), 8000)
    return
  }

  // 3. Débit artificiel : décourage l'envoi automatisé en rafale.
  await fakeDelay(600)

  // 4. Envoi : Edge Function Supabase (validation serveur + rate limiting),
  //    avec repli FormSubmit si la fonction n'est pas encore déployée.
  const payload = { name: nom, email, phone: tel || '', message }
  const result = await sendContactMessage(payload)

  if (result === 'fallback-needed') {
    const ok = (await sendViaFormSubmit(payload)) === 'sent'
    if (ok) {
      status.value = 'sent'
      form.nom = ''
      form.email = ''
      form.telephone = ''
      form.message = ''
      form.website = ''
      setTimeout(() => (status.value = ''), 8000)
      return
    }
    status.value = 'error'
    errorMsg.value = "L'envoi a échoué, réessayez plus tard."
    setTimeout(() => (status.value = ''), 8000)
    return
  }

  if (result === 'sent') {
    status.value = 'sent'
    form.nom = ''
    form.email = ''
    form.telephone = ''
    form.message = ''
    form.website = ''
    setTimeout(() => (status.value = ''), 8000)
  } else {
    // 'sent-error' : message générique — aucune erreur technique exposée.
    status.value = 'error'
    errorMsg.value = "L'envoi a échoué, réessayez plus tard."
    setTimeout(() => (status.value = ''), 8000)
  }
}

/* Photos partenaires gérées depuis l'admin (légende = nom, description affichée dessous) */
const photos = ref([])
onMounted(async () => {
  photos.value = await getPhotos('partenaires')
})

const contactItems = [
  { icon: 'mapPin', label: 'Siège social', titre: site.siege, texte: site.bp },
  { icon: 'phone', label: 'Téléphone', tel: true },
  { icon: 'mail', label: 'E-mail', mail: site.email },
  { icon: 'landmark', label: 'Références', titre: site.recu }
]
</script>

<template>
  <div>
    <PageHeader
      title="Contact"
      subtitle="Une question, un projet, une idée de partenariat ? Écrivez-nous — notre équipe vous répondra avec plaisir."
      :image="slotUrl('header')"
      eyebrow="Parlons de solidarité"
    />

    <section class="section">
      <div class="container">
        <div class="contact__grid">
          <div class="reveal" v-reveal>
            <ul class="contact__info">
              <li v-for="item in contactItems" :key="item.label">
                <div class="contact__icon"><Icon :name="item.icon" :size="22" /></div>
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
            <!-- Honeypot anti-bots : champ réel pour les parseurs HTML, invisible et hors tabulation -->
            <div class="hp-field" aria-hidden="true">
              <label for="website">Ne pas remplir ce champ</label>
              <input id="website" v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" />
            </div>
            <h3 style="font-family: var(--font-display); font-size: 1.5rem; color: var(--rose-900); margin-bottom: 26px">
              Envoyez-nous un message
            </h3>
            <div class="form-grid">
              <div class="form-field">
                <label for="nom">Nom complet</label>
                <input id="nom" v-model="form.nom" type="text" required maxlength="80" placeholder="Votre nom" />
              </div>
              <div class="form-field">
                <label for="email">E-mail</label>
                <input id="email" v-model="form.email" type="email" required maxlength="254" placeholder="vous@exemple.com" />
              </div>
              <div class="form-field form-field--full">
                <label for="telephone">Téléphone (optionnel)</label>
                <input id="telephone" v-model="form.telephone" type="tel" maxlength="20" placeholder="+229 ..." />
              </div>
              <div class="form-field form-field--full">
                <label for="message">Votre message</label>
                <textarea id="message" v-model="form.message" required maxlength="2000" placeholder="Écrivez votre message ici..."></textarea>
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

    <section class="section section--alt">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Nos partenaires</p>
        <h2 class="section-title reveal" v-reveal>Ils nous <em>soutiennent</em></h2>
        <div class="partenaires__grid">
          <!-- Photos ajoutées par l'admin : légende = nom, description affichée dessous -->
          <article
            v-for="(photo, i) in photos"
            :key="photo.id || photo.url"
            class="partenaire-card partenaire-card--logo reveal"
            v-reveal
            :style="{ '--reveal-delay': i * 100 + 'ms' }"
          >
            <img class="partenaire-card__logo-img" :src="photoUrl(photo.url, 480)" :alt="photo.caption || 'Partenaire'" loading="lazy" />
            <div v-if="photo.caption || photo.description">
              <h3 v-if="photo.caption">{{ photo.caption }}</h3>
              <p v-if="photo.description">{{ photo.description }}</p>
            </div>
          </article>

        </div>
      </div>
    </section>
  </div>
</template>
