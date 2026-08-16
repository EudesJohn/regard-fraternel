<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  image: { type: String, required: true },
  eyebrow: { type: String, default: 'REGARD FRATERNEL' }
})
</script>

<template>
  <header class="page-header">
    <div class="page-header__bg" :style="{ backgroundImage: `url(${image})` }"></div>
    <div class="page-header__overlay"></div>
    <div class="container page-header__content">
      <p class="page-header__eyebrow">{{ eyebrow }}</p>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__sub">{{ subtitle }}</p>
    </div>
  </header>
</template>
