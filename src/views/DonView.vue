<script setup>
import { ref, computed, onMounted } from 'vue'
import { getDonConfig } from '../lib/don.js'
import { site } from '../data.js'
import { useSectionSlots } from '../lib/useSectionSlots.js'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

/* Bannière remplaçable depuis l'admin (section « don ») */
const { url: slotUrl } = useSectionSlots('don')

const config = ref(null)
const loading = ref(true)

onMounted(async () => {
  config.value = await getDonConfig()
  loading.value = false
})

/* Sélection du montant : prédéfini ou libre */
const selectedAmount = ref(null)
const customAmount = ref('')

const effectiveAmount = computed(() => {
  const custom = Math.round(Number(String(customAmount.value).replace(/[^\d]/g, '')))
  if (customAmount.value !== '' && custom > 0) return custom
  return selectedAmount.value
})

const chooseAmount = (a) => {
  selectedAmount.value = selectedAmount.value === a ? null : a
  customAmount.value = ''
}

const formatFcfa = (n) => n.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')

const channels = computed(() => config.value?.payment_channels || [])
</script>

<template>
  <div>
    <PageHeader
      title="Faire un don"
      subtitle="Votre soutien finance directement l'éducation, la santé et l'autonomisation des communautés au Bénin."
      :image="slotUrl('header')"
      eyebrow="Solidarité"
    />

    <!-- Choix du montant -->
    <section class="section">
      <div class="container" style="max-width: 860px">
        <p class="eyebrow reveal" v-reveal>Votre générosité</p>
        <h2 class="section-title reveal" v-reveal>Choisissez votre <em>contribution</em></h2>
        <p class="section-intro reveal" v-reveal>
          Chaque montant compte. Sélectionnez une proposition ou saisissez le montant de votre choix.
        </p>

        <p v-if="loading" class="section-intro">Chargement…</p>

        <template v-else>
          <div class="don__amounts reveal" v-reveal>
            <button
              v-for="a in config.amounts"
              :key="a"
              type="button"
              class="don__amount"
              :class="{ 'is-selected': selectedAmount === a && customAmount === '' }"
              @click="chooseAmount(a)"
            >
              {{ formatFcfa(a) }} FCFA
            </button>
          </div>

          <div class="don__custom reveal" v-reveal>
            <label for="don-custom-amount">Autre montant (FCFA)</label>
            <input
              id="don-custom-amount"
              v-model="customAmount"
              type="text"
              inputmode="numeric"
              placeholder="Ex. 7 500"
              maxlength="12"
              @input="selectedAmount = null"
            />
          </div>

          <!-- Révélation des coordonnées après choix d'un montant -->
          <div v-if="effectiveAmount" class="don__reveal reveal" v-reveal>
            <h3>
              <Icon name="heart" :size="22" />
              Votre don de {{ formatFcfa(effectiveAmount) }} FCFA
            </h3>

            <template v-if="channels.length">
              <p class="don__reveal-intro">
                Voici comment procéder — envoyez votre don via l'un de ces canaux :
              </p>
              <div class="don__channels">
                <div v-for="(c, i) in channels" :key="i" class="don__channel">
                  <h4>{{ c.label }}</h4>
                  <p v-if="c.number" class="don__channel-number">
                    <Icon name="phone" :size="16" />
                    <strong>{{ c.number }}</strong>
                  </p>
                  <p v-if="c.holder" class="don__channel-holder">
                    <Icon name="users" :size="16" />
                    {{ c.holder }}
                  </p>
                  <p v-if="c.description" class="don__channel-desc">{{ c.description }}</p>
                </div>
              </div>
            </template>
            <p v-else class="don__reveal-intro">
              Les coordonnées de paiement seront affichées ici très prochainement.
              En attendant, contactez-nous au
              <a :href="`tel:${site.tel[0].replace(/\s/g, '')}`">{{ site.tel[0] }}</a>.
            </p>

            <div v-if="config.instructions" class="don__instructions">
              <h4>Après votre don</h4>
              <p>{{ config.instructions }}</p>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- Note + contact -->
    <section class="section section--alt">
      <div class="container" style="max-width: 860px">
        <div class="don__note reveal" v-reveal>
          <h3>Pourquoi donner ?</h3>
          <p>{{ config.note }}</p>
          <p style="margin-top: 14px">
            Une question sur votre don ?
            <RouterLink to="/contact" style="font-weight: 600; color: var(--forest-600)">Écrivez-nous</RouterLink>
            — ou devenez
            <RouterLink to="/adhesion" style="font-weight: 600; color: var(--forest-600)">membre de l'ONG</RouterLink>.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
