import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'accueil', component: () => import('./views/HomeView.vue'), meta: { title: 'Accueil' } },
  { path: '/apropos', name: 'apropos', component: () => import('./views/AboutView.vue'), meta: { title: 'À propos' } },
  { path: '/actions', name: 'actions', component: () => import('./views/ActionsView.vue'), meta: { title: 'Nos actions' } },
  { path: '/actions/:id', name: 'action-detail', component: () => import('./views/ActionDetailView.vue'), meta: { title: 'Action' } },
  { path: '/gouvernance', name: 'gouvernance', component: () => import('./views/GovernanceView.vue'), meta: { title: 'Gouvernance' } },
  { path: '/textes', name: 'textes', component: () => import('./views/LegalView.vue'), meta: { title: 'Textes juridiques' } },
  { path: '/adhesion', name: 'adhesion', component: () => import('./views/MembershipView.vue'), meta: { title: 'Adhésion' } },
  { path: '/contact', name: 'contact', component: () => import('./views/ContactView.vue'), meta: { title: 'Contact' } },
  { path: '/admin', name: 'admin', component: () => import('./views/AdminView.vue'), meta: { title: 'Administration' } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  // Hash history : fonctionne partout (file://, serveur statique simple,
  // hébergement sans configuration SPA fallback) — pas de pages blanches.
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

router.afterEach((to) => {
  document.title = `${to.meta.title || 'Accueil'} — REGARD FRATERNEL`
})

export default router
