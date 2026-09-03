<script setup>
import AdminView from './views/AdminView.vue'

// URL du site public (lien « Voir le site ») — configurable via VITE_PUBLIC_SITE_URL
const publicSite = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://regard-fraternel.vercel.app'
</script>

<template>
  <div class="admin-shell">
    <header class="admin-shell__bar">
      <div class="admin-shell__inner">
        <div class="admin-shell__brand">
          <img class="admin-shell__logo" src="/logo-light.png" alt="Logo REGARD FRATERNEL" />
          <span class="admin-shell__name">
            REGARD FRATERNEL
            <small>Espace d'administration</small>
          </span>
        </div>
        <a class="admin-shell__site" :href="publicSite" target="_blank" rel="noopener">
          Voir le site public
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </header>
    <main class="admin-shell__main">
      <AdminView />
    </main>
  </div>
</template>
