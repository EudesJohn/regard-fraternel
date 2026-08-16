-- ============================================================
-- REGARD FRATERNEL — Schéma Supabase
-- À exécuter dans l'éditeur SQL du dashboard Supabase
-- (SQL Editor → New query → coller → Run)
-- ============================================================

-- ---------- Table des photos ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  section text not null,                -- sanitaire | scolaire | jeux | donEcole | partenaires | hero
  url text not null,                    -- URL publique de l'image (bucket ou chemin local)
  caption text not null default '',     -- légende affichée sous la photo
  position integer not null default 0,  -- ordre d'affichage
  created_at timestamptz not null default now()
);

create index if not exists photos_section_idx on public.photos (section, position);

-- ---------- Sécurité (RLS) ----------
-- Lecture : tout le monde peut voir les photos du site public.
-- Écriture : réservée aux utilisateurs authentifiés (admin).
alter table public.photos enable row level security;

drop policy if exists "photos_select_public" on public.photos;
create policy "photos_select_public" on public.photos
  for select using (true);

drop policy if exists "photos_insert_auth" on public.photos;
create policy "photos_insert_auth" on public.photos
  for insert to authenticated with check (true);

drop policy if exists "photos_update_auth" on public.photos;
create policy "photos_update_auth" on public.photos
  for update to authenticated using (true) with check (true);

drop policy if exists "photos_delete_auth" on public.photos;
create policy "photos_delete_auth" on public.photos
  for delete to authenticated using (true);

-- ---------- Bucket de stockage (images uploadées) ----------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos_storage_select" on storage.objects;
create policy "photos_storage_select" on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists "photos_storage_insert" on storage.objects;
create policy "photos_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');

drop policy if exists "photos_storage_update" on storage.objects;
create policy "photos_storage_update" on storage.objects
  for update to authenticated using (bucket_id = 'photos');

drop policy if exists "photos_storage_delete" on storage.objects;
create policy "photos_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');

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
