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
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/scolaire/scolaire-02.jpg' }
    ]
  },
  {
    slug: 'apropos',
    name: 'À propos',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/scolaire/scolaire-02.jpg' },
      { key: 'media-1', label: 'Grande photo « Notre histoire »', default: '/images/photos/don/don-05.jpg' },
      { key: 'media-2', label: 'Petite photo « Notre histoire »', default: '/images/photos/scolaire/scolaire-03.jpg' }
    ]
  },
  {
    slug: 'gouvernance',
    name: 'Gouvernance',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/don/don-04.jpg' }
    ]
  },
  {
    slug: 'textes',
    name: 'Textes juridiques',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/don/don-02.jpg' }
    ]
  },
  {
    slug: 'adhesion',
    name: 'Adhésion',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/scolaire/scolaire-04.jpg' }
    ]
  },
  {
    slug: 'contact',
    name: 'Contact',
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/don/don-03.jpg' }
    ]
  },
  {
    slug: 'partenaires',
    name: 'Partenaires',
    freePhotos: true,
    slots: [
      { key: 'header', label: 'Bannière de page', default: '/images/photos/don/don-04.jpg' },
      { key: 'logo', label: 'Logo partenaire (Mama Yovo)', default: '/images/partenaires/mama-yovo.jpg' },
      { key: 'cta', label: 'Fond « Devenir partenaire »', default: '/images/photos/scolaire/scolaire-02.jpg' }
    ]
  },
  {
    slug: 'sanitaire',
    name: 'Appui sanitaire',
    freePhotos: true,
    slots: [
      { key: 'cover', label: 'Image de couverture', default: '/images/photos/sanitaire/sanitaire-01.jpg' }
    ]
  },
  {
    slug: 'scolaire',
    name: 'Appui scolaire',
    freePhotos: true,
    slots: [
      { key: 'cover', label: 'Image de couverture', default: '/images/photos/scolaire/scolaire-01.jpg' }
    ]
  },
  {
    slug: 'jeux',
    name: 'Espaces de jeux',
    freePhotos: true,
    slots: [
      { key: 'cover', label: 'Image de couverture', default: '/images/photos/jeux/jeux-01.jpg' }
    ]
  },
  {
    slug: 'donEcole',
    name: 'Dons aux écoles',
    freePhotos: true,
    slots: [
      { key: 'cover', label: 'Image de couverture', default: '/images/photos/don/don-01.jpg' }
    ]
  }
]

export const SECTION_BY_SLUG = Object.fromEntries(SECTIONS.map((s) => [s.slug, s]))

export const sectionLabel = (slug) => SECTION_BY_SLUG[slug]?.name || slug

/** Photo locale par défaut d'un emplacement fixe (repli affiché tant que rien n'est personnalisé). */
export const slotDefault = (slug, key) =>
  SECTION_BY_SLUG[slug]?.slots?.find((s) => s.key === key)?.default || ''
