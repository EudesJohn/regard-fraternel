-- ============================================================
-- REGARD FRATERNEL — Schéma Supabase
-- À exécuter dans l'éditeur SQL du dashboard Supabase
-- (SQL Editor → New query → coller → Run)
-- ============================================================

-- ---------- Table des photos ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  section text not null,                -- sanitaire | scolaire | jeux | donEcole | partenaires | hero | ...
  key text,                             -- emplacement fixe de mise en page (ex : 'header', 'cover', 'logo', 'cta')
                                        -- NULL = photo libre (galerie)
  url text not null,                    -- URL publique de l'image (bucket ou chemin local)
  caption text not null default '',     -- légende affichée sous la photo
  position integer not null default 0,  -- ordre d'affichage
  created_at timestamptz not null default now()
);

-- MIGRATION pour bases déjà existantes (idempotent, relançable sans risque).
-- Basée sur information_schema + SQL dynamique : aucune erreur 42703 possible,
-- et un message clair si le script tourne dans le mauvais projet Supabase.
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'photos') then
    raise notice 'Table photos créée ci-dessus — rien à migrer.';
  else
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'photos' and column_name = 'key') then
      execute 'alter table public.photos add column key text';
      raise notice 'Colonne key ajoutée.';
    else
      raise notice 'Colonne key déjà présente.';
    end if;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'photos' and column_name = 'section') then
    execute 'create index if not exists photos_section_idx on public.photos (section, position)';
    execute 'create unique index if not exists photos_section_key_idx on public.photos (section, key)';
    raise notice 'Index photos créés.';
  else
    raise exception 'Table photos sans colonne section : vérifiez que vous exécutez ce script dans le bon projet Supabase (l''URL du projet doit être celle utilisée par le site).';
  end if;
end $$;

-- MIGRATION description : texte affiché sous le nom d'un partenaire
-- (les photos de la section « partenaires » utilisent la légende comme nom).
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'photos' and column_name = 'description') then
    execute 'alter table public.photos add column description text not null default ''''';
    raise notice 'Colonne description ajoutée à photos.';
  else
    raise notice 'Colonne description déjà présente.';
  end if;
end $$;

-- ---------- Sécurité (RLS) ----------
-- Lecture : tout le monde peut voir les photos du site public.
-- Écriture : réservée au SEUL compte administrateur (défense en profondeur :
-- même un autre compte authentifié ne peut rien modifier).
alter table public.photos enable row level security;

-- Vrai uniquement pour le compte administrateur. Adaptez l'e-mail s'il change
-- (il doit rester identique à celui du trigger d'inscription ci-dessous).
-- Durcissement : SECURITY DEFINER + search_path verrouillé — sans cela, un
-- utilisateur malveillant (ou un schéma trompeur) pourrait détourner la
-- résolution des fonctions appelées à l'intérieur.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.jwt() ->> 'email' = 'ongregardfraternel13@gmail.com'
$$;

drop policy if exists "photos_select_public" on public.photos;
create policy "photos_select_public" on public.photos
  for select using (true);

drop policy if exists "photos_insert_auth" on public.photos;
create policy "photos_insert_auth" on public.photos
  for insert to authenticated with check (public.is_admin());

drop policy if exists "photos_update_auth" on public.photos;
create policy "photos_update_auth" on public.photos
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "photos_delete_auth" on public.photos;
create policy "photos_delete_auth" on public.photos
  for delete to authenticated using (public.is_admin());

-- ---------- Bucket de stockage (images uploadées) ----------
-- Limites serveur : 10 Mo max, images uniquement (doublent la validation
-- côté navigateur de src/lib/validation.js — défense en profondeur).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos_storage_select" on storage.objects;
create policy "photos_storage_select" on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists "photos_storage_insert" on storage.objects;
create policy "photos_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists "photos_storage_update" on storage.objects;
create policy "photos_storage_update" on storage.objects
  for update to authenticated using (bucket_id = 'photos' and public.is_admin());

drop policy if exists "photos_storage_delete" on storage.objects;
create policy "photos_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'photos' and public.is_admin());

-- ---------- BLOCAGE DES INSCRIPTIONS PUBLIQUES ----------
-- Empêche TOUTE création de compte en auto-inscription (y compris via la
-- console du navigateur), sauf pour l'e-mail administrateur.
-- Protection infaillible même si l'inscription est réactivée par erreur.
create or replace function public.prevent_public_signup()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email <> 'ongregardfraternel13@gmail.com' then
    raise exception 'Inscription publique desactivee (contactez l administrateur)';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_public_signup on auth.users;
create trigger prevent_public_signup
  before insert on auth.users
  for each row execute function public.prevent_public_signup();

-- ============================================================
-- FORMULAIRE DE CONTACT (Edge Function « contact »)
-- ============================================================

-- ---------- Table des messages ----------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- RLS : personne n'a accès via les clés anon/authenticated.
-- La fonction utilise service_role (contourne le RLS) ; l'administration
-- relit les messages via un outil SQL (pas d'exposition web).
alter table public.contact_messages enable row level security;

-- (Aucune policy : deny-by-default pour anon et authenticated.)

-- ---------- Rate limiting par IP (5 messages/heure) ----------
-- Requise pour encode(digest(...)) : extension pgcrypto
create extension if not exists pgcrypto;

-- Table de comptage (sans données personnelles : uniquement hash + horodatage)
create table if not exists public.contact_rate_limit (
  ip_hash text primary key,
  window_start timestamptz not null default now()
);

-- RLS activée, AUCUNE policy : la clé anon (publique dans le bundle) ne doit
-- ni lire ni surtout SUPPRIMER les compteurs (sinon bypass du rate limiting).
-- L'Edge Function passe par service_role qui contourne le RLS.
alter table public.contact_rate_limit enable row level security;

-- Appelée par l'Edge Function avec service_role. L'IP est hashée (SHA-256)
-- avant stockage : aucune donnée personnelle brute en base (RGPD).
-- La fonction est SECURITY DEFINER + search_path verrouillé (bonnes pratiques
-- de durcissement PostgreSQL) pour ne pas dépendre des policies RLS.
-- NB : la fonction est créée AVANT les revoke/grant ci-dessous, sinon PostgreSQL
-- échoue avec « function ... does not exist » (bug d'ordre du script initial).
create or replace function public.consume_contact_rate_limit(
  p_ip text,
  p_window_seconds integer default 3600,
  p_max integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip_hash text;
  v_count integer;
begin
  if p_ip is null or p_ip = '' or p_ip = 'unknown' then
    return false; -- fail-closed : IP inconnue → refus
  end if;

  v_ip_hash := encode(digest(p_ip, 'sha256'), 'hex');

  -- Purge des anciens choix (suppression best-effort)
  delete from public.contact_rate_limit
  where window_start < now() - make_interval(secs => p_window_seconds * 2);

  select count into v_count
  from public.contact_rate_limit
  where ip_hash = v_ip_hash
    and window_start > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into public.contact_rate_limit (ip_hash, window_start)
  values (v_ip_hash, now());

  return true;
end;
$$;

-- La fonction de rate limiting n'est exécutable que par service_role.
-- (Sans ces revoke, la clé anon pourrait l'appeler et saturer les compteurs
-- d'autres IPs — DoS du formulaire.)
revoke execute on function public.consume_contact_rate_limit(text, integer, integer) from public;
revoke execute on function public.consume_contact_rate_limit(text, integer, integer) from anon;
revoke execute on function public.consume_contact_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_contact_rate_limit(text, integer, integer) to service_role;

-- ============================================================
-- CONFIGURATION DES DONS (page /don — éditable dans l'admin)
-- ============================================================
-- Ligne unique (singleton) contenant :
--   amounts          : montants prédéfinis (FCFA) proposés au visiteur
--   payment_channels : canaux de paiement affichés après choix d'un montant
--                      [{ label, number, holder, description }]
--   instructions     : consignes à suivre après le paiement (modérées par l'admin)
--   note             : message libre affiché en bas de page (usage des dons…)

create table if not exists public.don_config (
  id smallint primary key default 1 check (id = 1),
  amounts jsonb not null default '[500, 1000, 2500, 5000, 10000, 25000, 50000]'::jsonb,
  payment_channels jsonb not null default '[]'::jsonb,
  instructions text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now()
);

-- Ligne par défaut (recréée si absente — idempotent)
insert into public.don_config (id) values (1)
on conflict (id) do nothing;

alter table public.don_config enable row level security;

-- Lecture publique (la page doit afficher montants et coordonnées)
drop policy if exists "don_config_select_public" on public.don_config;
create policy "don_config_select_public" on public.don_config
  for select using (true);

-- Écriture : réservée au compte administrateur (comme les photos)
drop policy if exists "don_config_update_admin" on public.don_config;
create policy "don_config_update_admin" on public.don_config
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "don_config_insert_admin" on public.don_config;
create policy "don_config_insert_admin" on public.don_config
  for insert to authenticated with check (public.is_admin());

drop policy if exists "don_config_delete_admin" on public.don_config;
create policy "don_config_delete_admin" on public.don_config
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- NOS HISTOIRES (page /histoires — éditable dans l'admin)
-- ============================================================

-- Récits : chaque histoire = une photo + textes.
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  url text not null,                    -- photo de l'histoire (bucket « photos » ou chemin local)
  caption text not null default '',     -- titre court de l'histoire
  kicker text not null default '',      -- sur-titre (ex : « Éducation », « Santé »)
  body text not null default '',        -- récit complet
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.stories enable row level security;

drop policy if exists "stories_select_public" on public.stories;
create policy "stories_select_public" on public.stories
  for select using (true);

drop policy if exists "stories_insert_admin" on public.stories;
create policy "stories_insert_admin" on public.stories
  for insert to authenticated with check (public.is_admin());

drop policy if exists "stories_update_admin" on public.stories;
create policy "stories_update_admin" on public.stories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "stories_delete_admin" on public.stories;
create policy "stories_delete_admin" on public.stories
  for delete to authenticated using (public.is_admin());

-- Textes de la page (bannière, intro, conclusion) — ligne unique éditable.
create table if not exists public.stories_config (
  id smallint primary key default 1 check (id = 1),
  subtitle text not null default '',
  intro text not null default '',
  outro text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.stories_config (id, subtitle, intro, outro) values (
  1,
  'Des histoires de courage, d''espoir et de changement',
  'Découvrez les récits inspirants des enfants, des familles et des communautés que Regard Fraternel accompagne au Bénin. À travers leurs parcours, découvrez les défis rencontrés, les espoirs retrouvés et les changements rendus possibles grâce à la solidarité et à l''engagement de nos partenaires, donateurs et bénévoles.',
  'Chaque histoire compte. Chaque geste peut changer une vie.'
)
on conflict (id) do nothing;

alter table public.stories_config enable row level security;

drop policy if exists "stories_config_select_public" on public.stories_config;
create policy "stories_config_select_public" on public.stories_config
  for select using (true);

drop policy if exists "stories_config_update_admin" on public.stories_config;
create policy "stories_config_update_admin" on public.stories_config
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "stories_config_insert_admin" on public.stories_config;
create policy "stories_config_insert_admin" on public.stories_config
  for insert to authenticated with check (public.is_admin());

drop policy if exists "stories_config_delete_admin" on public.stories_config;
create policy "stories_config_delete_admin" on public.stories_config
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- Créer le compte administrateur
-- ============================================================
-- 1. Dans le dashboard : Authentication → Users → Add user
--    (e-mail + mot de passe de l'admin)
-- 2. (Recommandé) Authentication → Sign In / Providers :
--    décocher « Allow new users to sign up » pour désactiver l'auto-inscription.
-- 3. Exécutez ce fichier : le trigger ci-dessus bloque toute inscription
--    non-admin, même si l'option est réactivée par erreur.
