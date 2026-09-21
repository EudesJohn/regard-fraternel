# Design — Boîte de réception des messages de contact

**Feature :** lecture et gestion des messages reçus via le formulaire de contact,
dans l'application admin existante (`/admin/`).
**Statut :** implémenté (voir contraintes ci-dessous — implémentation directe
dans les fichiers existants plutôt que composant séparé, pour coller à la
convention actuelle du projet : une seule vue admin).

## 1. Exigences & critères d'acceptation

1. L'administrateur connecté voit la liste des messages (`contact_messages`),
   du plus récent au plus ancien, avec pagination par « Charger plus ».
2. L'administrateur peut marquer un message comme **lu / non lu**, et le
   **supprimer** définitivement (double confirmation).
3. Les visiteurs non connectés (clé anon) ne peuvent **rien** lire — la table
   reste deny-by-default pour `anon`, et ouverte **uniquement** à l'admin
   RLS pour `authenticated` (même modèle que `photos`).
4. Toute donnée affichée provient de la base : rendue via `{{ }}` (échappement
   Vue) — **jamais** `v-html`.
5. Aucune erreur technique brute à l'écran : messages génériques, détails en
   console structurée (conforme au reste de l'app).

## 2. Les trois perspectives

### Frontend
- Nouveau service `src/lib/contactInbox.js` (fabrique testable : `createContactInbox(supabaseClient)`).
- Switcher **Photos / Messages** dans `AdminView.vue` (état local `adminTab`),
  panneau messages avec compteur non-lus, actions par message (lu/non-lu,
  supprimer, charger plus).
- Le lien « E-mail » ouvre `mailto:` encodé (`encodeURIComponent`) — ne fait
  qu'ouvrir le client mail local de l'admin, aucune action serveur.

### Backend (BaaS Supabase)
- Migration SQL : colonne `is_read boolean not null default false`,
  index `(is_read, created_at desc)`, politiques RLS admin-only
  (`select`/`update`/`delete` via `public.is_admin()`), **aucune** policy
  insert pour `anon` (les messages sont créés par l'Edge Function en
  `service_role`, qui contourne le RLS).
- Lecture via le client Supabase **de l'admin** (clé anon + session JWT de
  l'administrateur) → le RLS filtre : un utilisateur authentifié non-admin
  ne reçoit rien (l'admin est le seul compte existant de toute façon).

### Sécurité
| Couche | Mesure |
|---|---|
| AuthN | Session Supabase requise (JWT porté par le SDK ; aucune route dédiée) |
| AuthZ | RLS : `is_admin()` sur select/update/delete ; deny-by-default sinon |
| Injection | Requêtes PostgREST paramétrées via supabase-js (jamais de SQL concaténé) |
| XSS | Affichage `{{ }}` uniquement ; pas de `v-html` ; aucun lien `href` construit depuis les données (mailto encodé) |
| IDOR | Les IDs sont des UUID non prédictibles ; chaque appel est re-filtré par le RLS côté base |
| Errors | Génériques à l'écran, `logError()` JSON en console (cohérent avec l'existant) |
| Logging | Les lectures de la boîte ne sont pas sensibles ; les suppressions sont des actions admin volontaires (déjà confirmées deux fois côté UI) |

## 3. Décisions & limites

- **Pas de composant séparé** : le projet admin tient dans une seule vue
  (`AdminView.vue`, ~750 lignes) — j'ajoute un switcher au lieu de refactorer,
  changement minimal conforme à la convention du projet.
- **Pas de route API dédiée** : le BaaS expose PostgREST ; le RLS EST la
  couche d'autorisation (modèle déjà utilisé pour `photos`).
- **Pagination simple** par lot de 20 (« Charger plus ») plutôt qu'un curseur
  complexe — volume attendu faible (formulaire rate-limité à 5/h/IP).
- Limite honnête : la suppression est définitive (pas de soft-delete) —
  assumé, le besoin est modeste et la table est déjà sauvegardée par Supabase
  (PITR selon plan).

## 4. Checklist sécurité (avant écriture du code)

- [x] AuthN côté serveur : JWT Supabase vérifié par PostgREST, pas par le front
- [x] AuthZ côté serveur : RLS admin-only, testable via clé anon (lecture vide)
- [x] Validation : entrées = UUID uniquement (ids issus de la base, jamais de l'utilisateur) ; aucune écriture de contenu utilisateur
- [x] Output encoding : `{{ }}` partout, `encodeURIComponent` sur le mailto
- [x] Requêtes paramétrées : oui (PostgREST)
- [x] Gestion d'erreur : générique + log console structuré
- [x] Pas de secret côté client : clé anon publique uniquement
