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

-- ---------- Sécurité (RLS) ----------
-- Lecture : tout le monde peut voir les photos du site public.
-- Écriture : réservée au SEUL compte administrateur (défense en profondeur :
-- même un autre compte authentifié ne peut rien modifier).
alter table public.photos enable row level security;

-- Vrai uniquement pour le compte administrateur. Adaptez l'e-mail s'il change
-- (il doit rester identique à celui du trigger d'inscription ci-dessous).
create or replace function public.is_admin()
returns boolean
language sql
stable
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
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

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

-- ---------- Créer le compte administrateur ----------
-- 1. Dans le dashboard : Authentication → Users → Add user
--    (e-mail + mot de passe de l'admin)
-- 2. (Recommandé) Authentication → Sign In / Providers :
--    décocher « Allow new users to sign up » pour désactiver l'auto-inscription.
-- 3. Exécutez ce fichier : le trigger ci-dessus bloque toute inscription
--    non-admin, même si l'option est réactivée par erreur.
