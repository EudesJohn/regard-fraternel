/**
 * Registre des sections du site et de leurs emplacements fixes (slots).
 *
 * Chaque emplacement correspond à une image de mise en page précise (bannière
 * de page, fond de section, logo, couverture de programme...). L'admin peut
 * remplacer chacune ; tant qu'aucune photo personnalisée n'est enregistrée,
 * la photo locale `default` est affichée (repli automatique).
 *
 * `freePhotos: true` = la section accepte en plus des photos libres (galeries).
 */

export const SECTIONS = [
  {
    slug: 'hero',
    name: 'Accueil',
    path: '/',
    freePhotos: true, // diaporama d'accueil (photos libres ordonnées)
    slots: [
      { key: 'split', label: '« Qui sommes-nous » — grande image', default: '/images/photos/don/don-05.jpg' },
      { key: 'split-float', label: '« Qui sommes-nous » — petite image', default: '/images/photos/scolaire/scolaire-03.jpg' },
      { key: 'valeurs', label: 'Fond « Notre devise »', default: '/images/photos/scolaire/scolaire-02.jpg' },
      { key: 'cta', label: 'Fond « Rejoignez REGARD FRATERNEL »', default: '/images/photos/don/don-03.jpg' }
    ]
  },
  {
    slug: 'actions',
    name: 'Nos actions',
    path: '/actions',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/scolaire/scolaire-02.jpg' }
    ]
  },
  {
    slug: 'apropos',
    name: 'À propos',
    path: '/apropos',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/scolaire/scolaire-02.jpg' },
      { key: 'media-1', label: 'Grande photo « Notre histoire »', default: '/images/photos/don/don-05.jpg' },
      { key: 'media-2', label: 'Petite photo « Notre histoire »', default: '/images/photos/scolaire/scolaire-03.jpg' }
    ]
  },
  {
    slug: 'histoires',
    name: 'Nos histoires',
    path: '/histoires',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/don/don-06.jpg' }
    ]
  },
  {
    slug: 'don',
    name: 'Faire un don',
    path: '/don',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/don/don-02.jpg' }
    ]
  },
  {
    slug: 'adhesion',
    name: 'Adhésion',
    path: '/adhesion',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/scolaire/scolaire-04.jpg' }
    ]
  },
  {
    slug: 'contact',
    name: 'Contact',
    path: '/contact',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/don/don-03.jpg' }
    ]
  },
  {
    slug: 'partenaires',
    name: 'Partenaires',
    path: '/partenaires',
    freePhotos: true,
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/don/don-04.jpg' },
      { key: 'logo', label: 'Logo partenaire (Mama Yovo)', default: '/images/partenaires/mama-yovo.jpg' },
      { key: 'cta', label: 'Fond « Devenir partenaire »', default: '/images/photos/scolaire/scolaire-02.jpg' }
    ]
  },
  {
    slug: 'scolaire',
    name: 'Pilier 1 · Garantir une éducation de qualité pour tous',
    path: '/actions/education',
    freePhotos: true,
    slots: [
      { key: 'cover', label: 'Image de couverture', default: '/images/photos/scolaire/scolaire-01.jpg' }
    ]
  },
  {
    slug: 'genre',
    name: "Pilier 2 · Promouvoir l'égalité des genres et l'autonomisation des femmes",
    path: '/actions/genre',
    freePhotos: true,
    slots: [
      { key: 'cover', label: 'Image de couverture', default: '/images/photos/scolaire/scolaire-02.jpg' }
    ]
  },
  {
    slug: 'sanitaire',
    name: 'Pilier 3 · Améliorer la santé et le bien-être des populations',
    path: '/actions/sante',
    freePhotos: true,
    slots: [
      { key: 'cover', label: 'Image de couverture', default: '/images/photos/sanitaire/sanitaire-01.jpg' }
    ]
  },
  {
    slug: 'environnement',
    name: "Pilier 4 · Protéger l'environnement et renforcer la résilience des communautés",
    path: '/actions/environnement',
    freePhotos: true,
    slots: [
      { key: 'cover', label: 'Image de couverture', default: '/images/photos/don/don-02.jpg' }
    ]
  }
]

export const SECTION_BY_SLUG = Object.fromEntries(SECTIONS.map((s) => [s.slug, s]))

export const sectionLabel = (slug) => SECTION_BY_SLUG[slug]?.name || slug

/** Photo locale par défaut d'un emplacement fixe (repli affiché tant que rien n'est personnalisé). */
export const slotDefault = (slug, key) =>
  SECTION_BY_SLUG[slug]?.slots?.find((s) => s.key === key)?.default || ''
