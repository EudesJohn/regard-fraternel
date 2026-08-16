# REGARD FRATERNEL — Site web officiel

Site web vitrine de l'ONG **REGARD FRATERNEL (RF)**, Organisation Non
Gouvernementale béninoise à but non lucratif, apolitique et laïque, dont la devise
est **« Solidarité, Espérance et Amour »**.

## Technologies

- **Vue 3** (Composition API) + **Vite**
- **Supabase** (PostgreSQL + Auth + Storage) pour la base de données et la gestion
  des photos par l'administrateur
- CSS personnalisé (design system maison) — palette vert forêt / terracotta / sable
- Polices : Fraunces (titres) + Inter (texte)

## Structure

```
public/
  logo.png                 Logo extrait des statuts (PDF)
  images/
    design/                Images de mise en page (hero, en-têtes, couvertures, fonds)
  docs/
    textes-juridiques.pdf  Statuts · Règlement intérieur · PV
src/
  data.js                  Contenu du site (ONG, organes, programmes…)
  lib/
    supabase.js            Client Supabase
    photos.js              Service photos (lecture + CRUD admin)
  views/
    AdminView.vue          Section admin — gestion des photos par section
  components/              Sections & composants Vue
supabase/
  schema.sql               Schéma à exécuter dans le dashboard Supabase
.env.example               Variables d'environnement à copier en .env
```

## Démarrage

```bash
npm install
npm run dev      # développement — http://localhost:5173
npm run build    # build de production → dist/
npm run preview  # prévisualisation du build
```

## Sections du site

1. **Accueil** — hero plein écran, valeurs, objectifs, programmes, galerie partenaires
2. **À propos** — présentation de l'ONG, valeurs, références légales
3. **Objectifs** — les 5 axes définis dans les statuts
4. **Nos actions** — 4 programmes avec galeries photos + lightbox :
   Appui sanitaire · Appui scolaire · Espaces de jeux · Dons aux écoles
5. **Gouvernance** — organes (AG, BE, Direction Exécutive, Commissariat aux Comptes)
6. **Textes juridiques** — statuts, règlement intérieur, PV (PDF téléchargeable)
7. **Adhésion** — démarches et modalités financières
8. **Contact** — coordonnées et formulaire
9. **Administration** (`#/admin`) — connexion sécurisée et gestion des photos

## Gestion des photos (section admin)

L'administrateur peut, pour **chaque section** (Appui sanitaire, Appui scolaire,
Espaces de jeux, Dons aux écoles, Partenaires, Accueil/hero) :

- **Ajouter** des photos (avec légende)
- **Modifier** les légendes
- **Remplacer** une photo par une autre
- **Supprimer** une photo
- **Réordonner** les photos (↑ / ↓)

Toutes les photos des galeries (Appui sanitaire, Appui scolaire, Espaces de jeux,
Dons aux écoles) sont stockées dans **Supabase** : les fichiers dans le bucket
`photos`, les métadonnées (section, légende, position) dans la table `photos`.
Le site public lit les photos depuis Supabase à chaque affichage.

### Configuration Supabase

1. Copiez `.env.example` vers `.env` et renseignez `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
2. Dans le **SQL Editor**, exécutez le contenu de `supabase/schema.sql`
   (crée la table `photos`, le bucket de stockage `photos`, les règles de
   sécurité RLS).
3. Créez le compte administrateur : **Authentication → Users → Add user**
   (e-mail + mot de passe).
4. (Recommandé) **Authentication → Providers** : décochez « Email » pour
   empêcher les inscriptions publiques.
5. Connectez-vous sur `#/admin` avec le compte créé.

## Notes

- Les images de mise en page (hero, en-têtes de pages, couvertures, fonds de
  sections) sont dans `public/images/design/` — elles ne sont pas gérées par
  l'admin.
- Le formulaire de contact est actuellement une maquette front (aucun backend) ;
  il peut être branché sur un service d'e-mail ou une API.
