<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'

const route = useRoute()
const scrolled = ref(false)
const open = ref(false)

const links = [
  { to: '/', label: 'Accueil', match: '/' },
  { to: '/apropos', label: 'À propos', match: '/apropos' },
  { to: '/actions', label: 'Nos actions', match: '/actions' },
  { to: '/gouvernance', label: 'Gouvernance', match: '/gouvernance' },
  { to: '/textes', label: 'Textes', match: '/textes' },
  { to: '/adhesion', label: 'Adhésion', match: '/adhesion' },
  { to: '/contact', label: 'Contact', match: '/contact' }
]

const isActive = (match) => {
  if (match === '/') return route.path === '/'
  return route.path.startsWith(match)
}

const onScroll = () => {
  scrolled.value = window.scrollY > 30
}

const onKey = (e) => {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKey)
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <header class="nav" :class="{ 'is-scrolled': scrolled || open }">
    <div class="container nav__inner">
      <RouterLink to="/" class="nav__brand" @click="open = false">
        <img class="nav__logo" src="/logo-light.png" alt="Logo REGARD FRATERNEL" />
        <span class="nav__name">
          REGARD FRATERNEL
          <small>ONG · Bénin</small>
        </span>
      </RouterLink>

      <nav class="nav__links" :class="{ 'is-open': open }" aria-label="Navigation principale">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav__link"
          :class="{ 'is-active': isActive(link.match) }"
          @click="open = false"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <RouterLink to="/adhesion" class="btn btn--primary nav__cta">Rejoindre l'ONG</RouterLink>

      <button
        class="nav__toggle"
        :aria-expanded="open"
        :aria-label="open ? 'Fermer le menu' : 'Ouvrir le menu'"
        @click="open = !open"
      >
        <Icon :name="open ? 'x' : 'menu'" :size="24" />
      </button>
    </div>
  </header>
</template>
