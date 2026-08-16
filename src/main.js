import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import reveal from './directives/reveal.js'
import './style.css'
import { registerSW } from 'virtual:pwa-register'

// Service Worker : met en cache les photos et les ressources pour un
// chargement instantané lors des visites suivantes (et hors connexion).
registerSW({ immediate: true })

const app = createApp(App)
app.directive('reveal', reveal)
app.use(router)
app.mount('#app')
