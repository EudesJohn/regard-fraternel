export const site = {
  name: 'REGARD FRATERNEL',
  short: 'RF',
  slogan: 'Juste un regard et des vies humaines sont sauvées',
  devise: 'Solidarité, Espérance et Amour',
  recu: 'Récépissé N° 2013/0173/DEP-ATL-LITT/SG/SAG-ASSOC du 28 mai 2013',
  loi: 'Loi N° 2025-19 du 22 juillet 2025',
  siege: 'Carré 343 Ayélawadje, 3ᵉ Arrondissement, Département du Littoral — Maison BONOU',
  bp: '05 BP 487 — Cotonou, République du Bénin',
  tel: ['+229 01 97 26 96 54', '+229 01 21 33 08 15'],
  email: 'ongregardfraternel13@gmail.com',
  fondation: '2013'
}

export const organes = [
  {
    nom: 'Assemblée Générale (AG)',
    role: "Organe suprême de décision, souveraine. Elle définit la politique globale, adopte les programmes d'actions et les budgets, élit les membres des organes et statue sur toutes les questions relatives à la vie de l'ONG.",
    icon: 'users'
  },
  {
    nom: 'Bureau Exécutif (BE)',
    role: "Organe permanent de l'organisation, il assure la gestion quotidienne, supervise les activités et programmes, et se réunit une fois par mois.",
    icon: 'briefcase'
  },
  {
    nom: 'Direction Exécutive',
    role: "Chargée de la gestion journalière : coordination des activités, recrutement du personnel, mise en œuvre et suivi des projets et programmes.",
    icon: 'compass'
  },
  {
    nom: 'Commissariat aux Comptes (CC)',
    role: "Deux commissaires élus en Assemblée Générale vérifient, contrôlent et approuvent les comptes de l'organisation et rendent compte à l'AG.",
    icon: 'scale'
  }
]

export const presidium = [
  { poste: 'Président du Présidium', nom: 'Anani Maurice Eschyle DJOSSOU', initiales: 'AD' },
  { poste: 'Secrétaire du Présidium', nom: 'Firmin BOTON', initiales: 'FB' },
  { poste: 'Rapporteur du Présidium', nom: 'Eurudyce H. K. S. AKODJENOU', initiales: 'EA' }
]

export const bureauPostes = [
  {
    poste: 'Président',
    nom: 'BONOU Antoine',
    initiales: 'BA',
    profession: 'PDG BEREC SARL',
    adresse: 'Cotonou (3ᵉ Arr., Quartier Ayélawadjè, Maison Bonou)',
    tel: '01 97 26 96 54',
    email: 'abonou@yahoo.fr'
  },
  {
    poste: 'Secrétaire Général',
    nom: 'CUKAN Codjo Spéro Eudes',
    initiales: 'CE',
    profession: 'Entrepreneur',
    adresse: 'Cotonou (3ᵉ Arr., Quartier Ayélawadjè, Maison CUKAN)',
    tel: '01 66 74 15 96',
    email: 'codjosperoeudes@gmail.com'
  },
  {
    poste: 'Trésorier Général',
    nom: "BONOU Hermès Christophe N'Dèhouénou",
    initiales: 'HB',
    profession: 'Entrepreneur',
    adresse: 'Cotonou (3ᵉ Arr., Quartier Ayélawadjè, Maison Bonou)',
    tel: '01 97 02 77 77',
    email: 'hermesbonou@hotmail.com'
  },
  {
    poste: 'Secrétaire à l’Information, à l’Organisation et à la Communication',
    nom: 'GBAGUIDI Sylvain Yvon Agossou',
    initiales: 'SG',
    profession: 'Logisticien',
    adresse: 'Abomey-Calavi (Quartier Womey Centre, Maison Gbaguidi)',
    tel: '01 97 09 46 26',
    email: 'svangbaguidi19@gmail.com'
  },
  {
    poste: 'Secrétaire aux Relations Extérieures',
    nom: 'DONDJVI Koffi Arsène',
    initiales: 'DA',
    profession: 'Gestionnaire Projets',
    adresse: 'Cotonou (3ᵉ Arr., Quartier Dandji, Maison ZIDONXPE)',
    tel: '01 96 09 99 90',
    email: 'dondjviarsene@gmail.com'
  }
]

export const commissaires = [
  {
    poste: 'Commissaire aux Comptes',
    nom: "BONOU Yves Junior Tètèdé",
    initiales: 'YB',
    profession: 'Financier',
    adresse: 'Cotonou (2ᵉ Arr., Quartier KpONDÉHOU, Maison Bonou Yves Junior Tètèdé)',
    tel: '01 66 51 37 97',
    email: 'yjbonou@gmail.com'
  },
  {
    poste: '1ᵉʳ Adjoint Commissaire aux Comptes',
    nom: 'DEGBO DAHOVI GBENAKPON LÉONCE',
    initiales: 'DL',
    profession: 'Comptable',
    adresse: 'Cotonou (9ᵉ Arr., Quartier ZOGBOHOUÉ, Maison DEGBO DAHOVI)',
    tel: '01 96 10 20 20',
    email: 'maxdeg2007@gmail.com'
  }
]

/* Partenaires : les cartes sont désormais gérées en base (src/lib/partners.js)
   et éditables depuis l'admin. Cette liste ne sert plus à l'affichage. */

export const objectifs = [
  {
    titre: 'Droits humains',
    texte: 'Promouvoir la protection et le respect des droits humains au Bénin et en Afrique.',
    icon: 'shield'
  },
  {
    titre: 'Paix & Solidarité',
    texte: "Contribuer au renforcement de la paix, de la solidarité entre les peuples et de l'équité sociale au Bénin et en Afrique.",
    icon: 'handshake'
  },
  {
    titre: 'Développement communautaire',
    texte: "Promouvoir les initiatives de développement social, économique et culturel des communautés à la base.",
    icon: 'sprout'
  },
  {
    titre: 'Appuis & Formations',
    texte: "Appuyer les associations de femmes, de jeunes et de développement par des formations et des appuis-conseils.",
    icon: 'graduation'
  },
  {
    titre: 'Agriculture & Élevage',
    texte: "Promouvoir la production agricole, la pêche, l'élevage et l'artisanat à grande échelle auprès des populations.",
    icon: 'tractor'
  }
]

/*
 * Les quatre piliers d'intervention de l'ONG.
 * `photos` = clé de section Supabase pour la galerie et l'image de couverture.
 */
export const programmes = [
  {
    id: 'education',
    cle: 'education',
    numero: '01',
    titre: 'Garantir une éducation de qualité pour tous',
    sousTitre: 'Éducation inclusive, équitable et de qualité',
    texte: "Nous œuvrons pour favoriser l'accès à une éducation inclusive, équitable et de qualité, en accordant une attention particulière aux enfants et aux personnes en situation de vulnérabilité. Nos actions visent notamment à améliorer les conditions d'apprentissage, soutenir les enfants défavorisés, renforcer les infrastructures scolaires et contribuer à la lutte contre l'abandon scolaire.",
    photos: 'scolaire'
  },
  {
    id: 'genre',
    cle: 'genre',
    numero: '02',
    titre: "Promouvoir l'égalité des genres et l'autonomisation des femmes",
    sousTitre: "Égalité des chances & autonomisation des femmes",
    texte: "Nous œuvrons pour promouvoir l'égalité des chances entre les femmes et les hommes et renforcer la place des femmes et des filles dans la société. Nous soutenons leur autonomisation sociale et économique, l'accès aux opportunités, la sensibilisation aux droits et la prévention des violences et des discriminations liées au genre.",
    photos: 'genre'
  },
  {
    id: 'sante',
    cle: 'sante',
    numero: '03',
    titre: "Améliorer la santé et le bien-être des populations",
    sousTitre: "Accès aux soins & bien-être communautaire",
    texte: "Nous contribuons à améliorer l'accès aux soins et à renforcer la prévention auprès des populations, notamment les plus vulnérables. Nos interventions portent sur la sensibilisation, la prévention, l'accompagnement des personnes en situation de vulnérabilité et la promotion de meilleures conditions sanitaires et de bien-être au sein des communautés.",
    photos: 'sanitaire'
  },
  {
    id: 'environnement',
    cle: 'environnement',
    numero: '04',
    titre: "Protéger l'environnement et renforcer la résilience des communautés",
    sousTitre: "Environnement, hygiène & gestion des risques",
    texte: "Nous sensibilisons les communautés à la protection de l'environnement, à l'hygiène, à l'assainissement et à la gestion responsable des déchets. Nous intégrons également la gestion des risques et des catastrophes dans nos actions afin de renforcer la prévention, la préparation et la capacité des communautés à faire face aux situations d'urgence et aux différents risques auxquels elles peuvent être exposées.",
    photos: 'environnement'
  }
]

/** Texte d'introduction des piliers (page Nos actions et accueil). */
export const piliersIntro = "À travers ses actions, l'ONG REGARD FRATERNEL œuvre pour construire des communautés plus inclusives, autonomes, résilientes et durables. Nos interventions s'articulent autour de quatre piliers fondamentaux, avec une attention particulière portée à la prévention et à la gestion des risques."

/** Approche transversale : prévention et gestion des risques. */
export const piliersTransversal = {
  titre: "Une approche transversale : prévention et gestion des risques",
  texte: "La prévention et la gestion des risques constituent une dimension transversale de nos interventions. Nous encourageons les communautés à identifier les risques, à mieux s'y préparer et à développer des solutions adaptées pour protéger les personnes, les infrastructures et l'environnement. Notre ambition : agir aujourd'hui pour construire des communautés plus fortes, plus solidaires et plus résilientes demain."
}
