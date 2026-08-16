<script setup>
import Icon from './Icon.vue'

const steps = [
  {
    titre: 'Adresser une demande',
    texte: "Envoyez une demande manuscrite d'adhésion au Président du Bureau Exécutif, adressée au siège de l'ONG."
  },
  {
    titre: 'Remplir la fiche d’adhésion',
    texte: "Remplissez en bonne et due forme la fiche d'adhésion et certifiez-la sur honneur, en vous engageant à respecter les textes fondamentaux."
  },
  {
    titre: 'Régler les droits d’adhésion',
    texte: 'Payez vos droits d’adhésion ainsi que vos cotisations. Le dossier est ensuite étudié par le Bureau Exécutif.'
  },
  {
    titre: 'Recevoir votre carte de membre',
    texte: 'Une fois votre adhésion acceptée, une Carte de Membre vous est délivrée, faisant de vous un membre actif à part entière.'
  }
]

const fees = [
  { label: "Droits d'adhésion", montant: '10 000 FCFA' },
  { label: 'Cotisation mensuelle', montant: '1 000 FCFA' },
  { label: 'Souscriptions', montant: 'Selon événements' }
]
</script>

<template>
  <section id="adhesion" class="section">
    <div class="container">
      <div class="join__grid">
        <div class="reveal" v-reveal>
          <p class="eyebrow">Adhésion</p>
          <h2 class="section-title">
            Rejoignez <em>REGARD FRATERNEL</em> et agissez avec nous
          </h2>
          <p class="section-intro" style="margin-bottom: 30px">
            L'ONG est ouverte à toute personne désireuse de contribuer à
            l'accomplissement de ses objectifs : membres fondateurs, adhérents,
            sympathisants et membres d'honneur.
          </p>

          <div class="join__steps">
            <div v-for="(s, i) in steps" :key="s.titre" class="join__step reveal" v-reveal :style="{ '--reveal-delay': i * 90 + 'ms' }">
              <div class="join__step__num">{{ i + 1 }}</div>
              <div>
                <h4>{{ s.titre }}</h4>
                <p>{{ s.texte }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="join__card reveal" v-reveal style="--reveal-delay: 150ms">
          <h3>Modalités financières</h3>
          <div v-for="f in fees" :key="f.label" class="join__fee">
            <span>{{ f.label }}</span>
            <strong>{{ f.montant }}</strong>
          </div>
          <p class="join__note">
            Les fonctions au sein des organes sont gratuites ; les frais de mission
            sont à la charge de l'ONG. Seuls les membres actifs (fondateurs et
            adhérents) ont voix délibérative et sont éligibles aux postes.
          </p>
          <a class="btn btn--primary" style="width: 100%; justify-content: center" href="#contact">
            Demander l'adhésion
            <Icon name="arrowRight" :size="18" />
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
