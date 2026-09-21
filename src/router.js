import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'accueil', component: () => import('./views/HomeView.vue'), meta: { title: 'Accueil' } },
  { path: '/apropos', name: 'apropos', component: () => import('./views/AboutView.vue'), meta: { title: 'À propos' } },
  { path: '/actions', name: 'actions', component: () => import('./views/ActionsView.vue'), meta: { title: 'Nos actions' } },
  { path: '/actions/:id', name: 'action-detail', component: () => import('./views/ActionDetailView.vue'), meta: { title: 'Action' } },
  { path: '/gouvernance', name: 'gouvernance', component: () => import('./views/GovernanceView.vue'), meta: { title: 'Gouvernance' } },
  { path: '/textes', name: 'textes', component: () => import('./views/LegalView.vue'), meta: { title: 'Textes juridiques' } },
  { path: '/adhesion', name: 'adhesion', component: () => import('./views/MembershipView.vue'), meta: { title: 'Adhésion' } },
  { path: '/partenaires', name: 'partenaires', component: () => import('./views/PartenairesView.vue'), meta: { title: 'Partenaires' } },
  { path: '/contact', name: 'contact', component: () => import('./views/ContactView.vue'), meta: { title: 'Contact' } },
  // NB : l'administration vit dans une app séparée (dossier admin/)
  { path: '/:pathMatch(.*)*', redirect: '/' }
]


const router = createRouter({
  // History mode : URLs propres (sans #) — ex. /gouvernance au lieu de /#/gouvernance.
  // Nécessite le fallback SPA côté serveur (voir rewrites dans vercel.json)
  // pour servir index.html sur chaque route.
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

const SITE_URL = 'https://www.regardfraternel.org'

router.afterEach((to) => {
  document.title = `${to.meta.title || 'Accueil'} — REGARD FRATERNEL`
  // SEO : URL canonique par page (évite le contenu dupliqué aux yeux de Google).
  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical) canonical.href = `${SITE_URL}${to.path}`
})

export default router
