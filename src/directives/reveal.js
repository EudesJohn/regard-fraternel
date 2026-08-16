// Directive v-reveal : chaque élément s'observe lui-même au montage.
// Contrairement à un observer global monté une seule fois, cela fonctionne
// aussi pour les éléments montés après une navigation entre pages (SPA),
// évitant les « pages blanches » dues aux éléments restés en opacity: 0.
export default {
  mounted(el) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('is-visible')
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    el._revealObserver = observer
    observer.observe(el)
  },
  unmounted(el) {
    el._revealObserver?.disconnect()
  }
}
