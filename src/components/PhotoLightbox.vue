<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  photos: { type: Array, required: true },
  index: { type: Number, required: true }
})

const emit = defineEmits(['close', 'prev', 'next'])

const onKey = (e) => {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') emit('prev')
  if (e.key === 'ArrowRight') emit('next')
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="lightbox" role="dialog" aria-modal="true" @click.self="emit('close')">
    <button class="lightbox__close" aria-label="Fermer" @click="emit('close')">
      <Icon name="x" :size="24" />
    </button>
    <button
      class="lightbox__nav lightbox__nav--prev"
      aria-label="Photo précédente"
      @click.stop="emit('prev')"
    >
      <Icon name="chevronLeft" :size="28" />
    </button>
    <img class="lightbox__img" :src="photos[index].url" :alt="photos[index].caption || 'Photo agrandie'" />
    <button
      class="lightbox__nav lightbox__nav--next"
      aria-label="Photo suivante"
      @click.stop="emit('next')"
    >
      <Icon name="chevronRight" :size="28" />
    </button>
    <p v-if="photos[index].caption" class="lightbox__caption">{{ photos[index].caption }}</p>
    <p class="lightbox__count">{{ index + 1 }} / {{ photos.length }}</p>
  </div>
</template>
