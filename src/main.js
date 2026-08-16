import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import reveal from './directives/reveal.js'
import './style.css'

const app = createApp(App)
app.directive('reveal', reveal)
app.use(router)
app.mount('#app')
