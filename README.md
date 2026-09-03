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

## Architecture — un seul déploiement, admin protégée

Le projet contient **deux applications** construites ensemble et déployées sur un
**seul projet Vercel** :

| Application | URL | Rôle |
| --- | --- | --- |
| **Site public** | `https://regard-fraternel.vercel.app/` | Vitrine publique. Ne contient **aucun code d'administration**. |
| **Administration** | `https://regard-fraternel.vercel.app/admin/` | Gestion des photos, **protégée par mot de passe** (voir plus bas). |

Au build, les deux applications sont fusionnées dans `dist/` :
`dist/` = site public, `dist/admin/` = application admin (script
`scripts/merge-admin.mjs`). L'administration n'est **plus** une page du site
public (`#/admin` a disparu) : son code n'est servi qu'après authentification.

### Sécurité de l'administration (verrous + surveillance)

1. **Porte d'accès serveur (middleware Vercel, `middleware.js`)** : tout ce qui
   commence par `/admin` (page, JS, CSS, images…) est refusé par le serveur sans
   l'e-mail administrateur (`ADMIN_GATE_EMAIL`) **et** le mot de passe d'accès
   (`ADMIN_GATE_PASSWORD`). Sans ces identifiants, un navigateur reçoit la page
   de connexion, **pas le code source**. C'est le même principe que la protection
   Vercel, implémenté en propre (fonctionne sur tous les plans).
2. **Anti force brute** : au-delà de `ADMIN_GATE_MAX_ATTEMPTS` échecs (défaut 10)
   dans une fenêtre de `ADMIN_GATE_WINDOW_SECONDS` secondes (défaut 600), l'IP
   est bloquée (HTTP 429) — la connexion réussie réinitialise le compteur.
   Compteur **partagé** si Upstash est configuré (`UPSTASH_REDIS_REST_URL` +
   `UPSTASH_REDIS_REST_TOKEN`), sinon repli en mémoire par instance.
3. **Connexion Supabase** (e-mail + mot de passe du compte administrateur) pour
   accéder à l'interface de gestion.
4. **RLS Supabase** : les écritures (table `photos` + bucket `photos`) sont
   réservées au **seul e-mail administrateur** (`public.is_admin()` dans
   `supabase/schema.sql`).
5. **Journalisation** : chaque événement de la porte (échec de connexion, succès,
   blocage, accès refusé, erreur backend) est enregistré en JSON structuré
   (`app: admin-gate`) avec IP, pays, chemin et user-agent. À consulter dans
   Vercel : **Deployments → votre déploiement → View Functions Logs** (ou
   `vercel logs <url>`).

> ⚠️ Limite honnête : une application web doit envoyer son code au navigateur pour
> fonctionner. La porte d'accès garantit que le code de l'admin n'est **délivré
> qu'après authentification** ; elle ne le rend pas « invisible » pour un visiteur
> déjà authentifié. C'est le niveau de protection maximal possible côté serveur.

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
    photos.js              Service photos (lecture côté public ; CRUD utilisé par l'admin)
  views/                   Pages du site public (sans admin)
  components/              Sections & composants Vue
admin/
  src/
    views/AdminView.vue    Interface d'administration (gestion des photos)
    admin.css              Styles de l'admin
  vite.config.js           Build de l'application admin
  .env.example             Variables d'environnement de l'admin
middleware.js              Porte d'accès /admin (Edge Middleware Vercel)
scripts/
  merge-admin.mjs          Fusionne admin/dist → dist/admin
  test-admin.mjs           Test de bout en bout de l'admin
supabase/
  schema.sql               Schéma à exécuter dans le dashboard Supabase
.env.example               Variables d'environnement du site public
```

## Démarrage (développement)

```bash
npm install            # installe les dépendances du site ET de l'admin (workspaces)
npm run dev            # site public — http://localhost:5173
npm run dev:admin      # admin — http://localhost:5174

npm run build:all      # build des deux applications + fusion → dist/
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

(L'administration n'est volontairement ni listée ni liée depuis le site public.)

## Administration — accès et configuration

### 1. Activer la porte d'accès (obligatoire)

Dans le projet Vercel existant : **Settings → Environment Variables**, ajouter :

| Variable | Requis | Rôle |
| --- | --- | --- |
| `ADMIN_GATE_PASSWORD` | ✅ | Mot de passe d'accès à `/admin/` (phrase longue et difficile à deviner) |
| `ADMIN_GATE_EMAIL` | recommandé | E-mail administrateur exigé à la connexion (sinon mot de passe seul) |
| `ADMIN_GATE_MAX_ATTEMPTS` | non | Échecs tolérés avant blocage (défaut : 10) |
| `ADMIN_GATE_WINDOW_SECONDS` | non | Fenêtre de blocage (défaut : 600 s) |
| `UPSTASH_REDIS_REST_URL` | recommandé | Compteur anti force brute **partagé** (Upstash) — sinon repli en mémoire |
| `UPSTASH_REDIS_REST_TOKEN` | recommandé | Jeton REST Upstash (voir `UPSTASH_REDIS_REST_URL`) |

Pour Upstash : créez une base Redis gratuite sur
[console.upstash.com](https://console.upstash.com) → **REST API** → copiez
l'URL et le jeton. Sans Upstash, la protection fonctionne quand même (compteur
en mémoire par instance, moins fiable sur plusieurs régions).

Redéployez. Dès lors, tout accès à `/admin/` (ou `/admin`) demande ce mot de
passe ; sans lui, le serveur ne sert **aucun** fichier de l'admin.

### 2. Configurer Supabase

1. Copiez `.env.example` vers `.env` (racine) et `admin/.env.example` vers
   `admin/.env`, renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API) dans les deux.
2. Dans le **SQL Editor**, exécutez le contenu de `supabase/schema.sql`
   (crée la table `photos`, le bucket `photos`, les règles RLS — écritures
   réservées au seul e-mail administrateur, blocage des inscriptions publiques).
3. Créez le compte administrateur : **Authentication → Users → Add user**
   (e-mail + mot de passe).
4. (Recommandé) **Authentication → Providers** : décochez « Email » pour
   empêcher les inscriptions publiques.
5. Connectez-vous sur `https://regard-fraternel.vercel.app/admin/` : d'abord le
   mot de passe d'accès, puis le compte Supabase.

### 3. (Facultatif) Développer l'admin

`npm run dev:admin` lance l'admin seule sur `http://localhost:5174` — la porte
d'accès n'existe qu'en production (c'est le middleware Vercel qui la sert).

## Gestion des photos (application admin)

L'administrateur peut, pour **chaque section** (Appui sanitaire, Appui scolaire,
Espaces de jeux, Dons aux écoles, Partenaires, Accueil/hero) :

- **Ajouter** des photos (avec légende)
- **Modifier** les légendes
- **Remplacer** une photo par une autre
- **Supprimer** une photo
- **Réordonner** les photos (↑ / ↓)

Toutes les photos des galeries sont stockées dans **Supabase** : les fichiers dans
le bucket `photos`, les métadonnées (section, légende, position) dans la table
`photos`. Le site public lit les photos depuis Supabase à chaque affichage.

## Notes

- Les images de mise en page (hero, en-têtes de pages, couvertures, fonds de
  sections) sont dans `public/images/design/` — elles ne sont pas gérées par
  l'admin.
- Le formulaire de contact est actuellement une maquette front (aucun backend) ;
  il peut être branché sur un service d'e-mail ou une API.
- Test de bout en bout de l'admin :
  `ADMIN_GATE_PASSWORD=… node scripts/test-admin.mjs <EMAIL> <MOT_DE_PASSE>`
  (voir l'en-tête du script).
