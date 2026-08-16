<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { site, programmes, objectifs } from '../data.js'
import { getPhotos, photoUrl } from '../lib/photos.js'
import Icon from '../components/Icon.vue'

const defaultSlides = [
  { image: '/images/design/hero-main.jpg', kicker: 'ONG · République du Bénin', title: 'REGARD FRATERNEL', span: 'des vies humaines sauvées' },
  { image: '/images/design/scolaire-hero.jpg', kicker: 'Campagne de distribution', title: 'Des kits scolaires', span: 'pour chaque enfant' },
  { image: '/images/design/don-hero.jpg', kicker: 'Actions sur le terrain', title: 'Des infrastructures', span: 'au service des écoles' }
]

const cover = {
  sanitaire: '/images/design/cover-sanitaire.jpg',
  scolaire: '/images/design/cover-scolaire.jpg',
  jeux: '/images/design/cover-jeux.jpg',
  donEcole: '/images/design/cover-don.jpg'
}

const heroSlides = ref([...defaultSlides])
const partenairePhotos = ref([])
const slide = ref(0)
let timer

const nextSlide = () => {
  slide.value = (slide.value + 1) % heroSlides.value.length
}

const heroLoaded = ref(false)

// Précharge une image (pleine taille pour le diaporama, miniature pour les grilles)
const preloadImage = (url) => {
  if (!url) return
  const img = new Image()
  img.src = url
}

onMounted(async () => {
  // Diaporama d'accueil géré depuis Supabase (section « hero »)
  const heroPhotos = await getPhotos('hero')
  if (heroPhotos.length) {
    heroSlides.value = heroPhotos.map((p, i) => ({
      image: p.url,
      kicker: i === 0 ? 'ONG · République du Bénin' : 'Actions sur le terrain',
      title: p.caption || (i === 0 ? 'REGARD FRATERNEL' : 'Des actions concrètes'),
      span: i === 0 ? 'des vies humaines sauvées' : 'au service des communautés'
    }))
    // Précharge la 1ʳᵉ diapositive (la plus importante) et les suivantes en miniature
    preloadImage(heroSlides.value[0].image)
    heroSlides.value.slice(1).forEach((s) => preloadImage(photoUrl(s.image, 1200)))
    heroLoaded.value = true
  }

  // Galerie des partenaires (section « partenaires »)
  partenairePhotos.value = await getPhotos('partenaires')

  timer = setInterval(nextSlide, 6500)
})

onBeforeUnmount(() => clearInterval(timer))

const stats = [
  { valeur: '2025', label: "Année de fondation" },
  { valeur: '4', label: 'Programmes d’action' },
  { valeur: '93', label: 'Actions documentées' },
  { valeur: '3', label: 'Partenaires engagés' }
]
</script>

<template>
  <div>
    <!-- ============ ENTÊTE / HERO ============ -->
    <section class="hero hero--slides" id="accueil">
      <div
        v-for="(s, i) in heroSlides"
        :key="s.image"
        class="hero__slide"
        :class="{ 'is-active': slide === i }"
      >
        <div class="hero__bg" :style="{ backgroundImage: `url(${s.image})` }"></div>
      </div>
      <div class="hero__overlay"></div>

      <div class="container">
        <div class="hero__content">
          <img class="hero__logo" src="/logo-light.png" alt="Logo REGARD FRATERNEL" />
          <p class="hero__kicker">{{ heroSlides[slide].kicker }}</p>
          <h1 class="hero__title">
            {{ heroSlides[slide].title }}
            <span>{{ heroSlides[slide].span }}</span>
          </h1>
          <p class="hero__sub">
            {{ site.slogan }}. Une ONG béninoise à but non lucratif, apolitique et laïque,
            au service des droits humains, de l'éducation, de la santé et du développement
            des communautés vulnérables.
          </p>
          <div class="hero__cta">
            <RouterLink to="/actions" class="btn btn--primary">
              Découvrir nos actions
              <Icon name="arrowRight" :size="18" />
            </RouterLink>
            <RouterLink to="/apropos" class="btn btn--ghost">Notre mission</RouterLink>
          </div>
          <p class="hero__devise">Devise — {{ site.devise }}</p>
        </div>
      </div>

      <div class="hero__dots">
        <button
          v-for="(s, i) in heroSlides"
          :key="i"
          class="hero__dot"
          :class="{ 'is-active': slide === i }"
          :aria-label="`Diapositive ${i + 1}`"
          @click="slide = i"
        ></button>
      </div>

      <a href="#chiffres" class="hero__scroll" aria-label="Défiler vers le bas"></a>
    </section>

    <!-- ============ CHIFFRES CLÉS ============ -->
    <section id="chiffres" class="stats-band">
      <div class="container stats-band__grid">
        <div v-for="(s, i) in stats" :key="s.label" class="stats-band__item reveal" v-reveal :style="{ '--reveal-delay': i * 80 + 'ms' }">
          <strong>{{ s.valeur }}</strong>
          <span>{{ s.label }}</span>
        </div>
      </div>
    </section>

    <!-- ============ ACCUEIL / APERÇU MISSION ============ -->
    <section class="section">
      <div class="container">
        <div class="split">
          <div class="split__content reveal" v-reveal>
            <p class="eyebrow">Qui sommes-nous</p>
            <h2 class="section-title">
              Une ONG citoyenne au service de <em>la solidarité</em> et des droits humains
            </h2>
            <p>
              REGARD FRATERNEL (RF) est une Organisation Non Gouvernementale de droit
              béninois, à but non lucratif, apolitique et laïque. Fondée le
              {{ site.fondation }} à Cotonou, elle est régie par la {{ site.loi }}.
            </p>
            <p>
              Conscients de leur responsabilité citoyenne et sociale, les membres de
              REGARD FRATERNEL œuvrent chaque jour pour la protection des droits humains,
              l'équité sociale et le développement des communautés à la base.
            </p>
            <RouterLink to="/apropos" class="btn btn--dark" style="margin-top: 12px">
              En savoir plus
              <Icon name="arrowRight" :size="18" />
            </RouterLink>
          </div>
          <div class="split__media reveal" v-reveal style="--reveal-delay: 120ms">
            <img src="/images/design/don-split.jpg" alt="Action de REGARD FRATERNEL sur le terrain" />
            <img class="split__media-float" src="/images/design/don-float.jpg" alt="Bénéficiaires de l'ONG" />
          </div>
        </div>
      </div>
    </section>

    <!-- ============ VALEURS (photo fond) ============ -->
    <section class="section values values--photo">
      <div class="values__bg" :style="{ backgroundImage: 'url(/images/design/scolaire-band.jpg)' }"></div>
      <div class="values__scrim"></div>
      <div class="container">
        <p class="eyebrow reveal" v-reveal style="color: var(--terracotta-400)">Notre devise</p>
        <h2 class="section-title reveal" v-reveal style="color: var(--white); margin-bottom: 54px">
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

    <!-- ============ APERÇU OBJECTIFS ============ -->
    <section class="section section--alt">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Nos objectifs</p>
        <h2 class="section-title reveal" v-reveal>Cinq axes pour <em>transformer</em> les communautés</h2>
        <div class="objectifs__grid">
          <RouterLink
            v-for="(o, i) in objectifs.slice(0, 3)"
            :key="o.titre"
            :to="'/actions'"
            class="obj-card reveal" v-reveal
            :style="{ '--reveal-delay': i * 100 + 'ms' }"
          >
            <div class="obj-card__icon"><Icon :name="o.icon === 'handshake' ? 'handshake' : o.icon === 'shield' ? 'shield' : o.icon === 'sprout' ? 'sprout' : 'target'" :size="26" /></div>
            <h3>{{ o.titre }}</h3>
            <p>{{ o.texte }}</p>
          </RouterLink>
        </div>
        <div class="gallery__more reveal" v-reveal>
          <RouterLink to="/actions" class="btn btn--dark">
            Voir tous nos objectifs et actions
            <Icon name="arrowRight" :size="18" />
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ============ APERÇU PROGRAMMES (cartes photo) ============ -->
    <section class="section">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Nos actions</p>
        <h2 class="section-title reveal" v-reveal>Des programmes <em>concrets</em> sur le terrain</h2>
        <p class="section-intro reveal" v-reveal>
          Santé, éducation, loisirs et dons : découvrez les actions menées par
          REGARD FRATERNEL auprès des communautés.
        </p>

        <div class="program-cards">
          <RouterLink
            v-for="(p, i) in programmes"
            :key="p.id"
            :to="`/actions/${p.id}`"
            class="program-card reveal" v-reveal
            :style="{ '--reveal-delay': i * 100 + 'ms' }"
          >
            <img :src="cover[p.photos]" :alt="p.titre" />
            <div class="program-card__scrim"></div>
            <div class="program-card__body">
              <span class="program-card__num">{{ p.numero }}</span>
              <h3>{{ p.titre }}</h3>
              <p>{{ p.sousTitre }}</p>
              <span class="program-card__link">
                Découvrir
                <Icon name="arrowRight" :size="16" />
              </span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ============ PARTENAIRES (galerie photos) ============ -->
    <section v-if="partenairePhotos.length" class="section section--alt">
      <div class="container">
        <p class="eyebrow reveal" v-reveal>Nos partenaires</p>
        <h2 class="section-title reveal" v-reveal>Ils nous <em>soutiennent</em></h2>
        <p class="section-intro reveal" v-reveal>
          Nos partenaires italiens soutiennent les actions éducatives et solidaires de
          l'ONG au Bénin.
        </p>

        <div class="gallery">
          <figure
            v-for="(photo, i) in partenairePhotos"
            :key="photo.id || photo.url"
            class="gallery__item"
            :class="{ 'gallery__item--tall': i % 5 === 2 }"
          >
            <img :src="photoUrl(photo.url, 480)" :alt="photo.caption || 'Nos partenaires'" loading="lazy" />
            <figcaption v-if="photo.caption" class="gallery__caption">{{ photo.caption }}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- ============ CTA / ADHÉSION (photo fond) ============ -->
    <section class="cta-band">
      <div class="cta-band__bg" :style="{ backgroundImage: 'url(/images/design/scolaire-cta.jpg)' }"></div>
      <div class="cta-band__scrim"></div>
      <div class="container cta-band__content reveal" v-reveal>
        <h2>Rejoignez REGARD FRATERNEL</h2>
        <p>L'ONG est ouverte à toute personne désireuse de contribuer à l'accomplissement de ses objectifs : membres fondateurs, adhérents, sympathisants et membres d'honneur.</p>
        <div>
          <RouterLink to="/adhesion" class="btn btn--primary">
            Devenir membre
            <Icon name="arrowRight" :size="18" />
          </RouterLink>
          <RouterLink to="/contact" class="btn btn--ghost">Nous contacter</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
