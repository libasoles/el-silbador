-- Supabase persistence schema for Silabeo.
-- This migration is safe to re-run: objects are created conditionally and
-- replaceable objects (functions, triggers, policies) are refreshed below.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  content jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  forked_from uuid references public.songs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- SECURITY DEFINER lets this role check bypass profiles RLS while retaining
-- the request identity supplied by Supabase in auth.uid().
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, role)
  values (new.id, null, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- A user may update their profile, but cannot promote their own role through
-- the client-facing UPDATE policy. Dashboard/service-role updates have no
-- auth.uid() and can still assign the initial administrator by hand.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and new.role is distinct from old.role
     and not public.is_admin() then
    new.role = old.role;
  end if;
  return new;
end;
$$;

-- Non-admin owners can still save other changes in the same UPDATE; only the
-- attempted is_public value is reverted.
create or replace function public.guard_song_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_public is distinct from old.is_public
     and not public.is_admin() then
    new.is_public = old.is_public;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists protect_profiles_role on public.profiles;
create trigger protect_profiles_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

drop trigger if exists guard_songs_publication on public.songs;
create trigger guard_songs_publication
  before update on public.songs
  for each row execute function public.guard_song_publication();

drop trigger if exists set_songs_updated_at on public.songs;
create trigger set_songs_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Users can read own or public songs" on public.songs;
create policy "Users can read own or public songs"
  on public.songs for select to authenticated
  using (owner_id = auth.uid() or is_public = true);

drop policy if exists "Users can create their own songs" on public.songs;
create policy "Users can create their own songs"
  on public.songs for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners and admins can update songs" on public.songs;
create policy "Owners and admins can update songs"
  on public.songs for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "Owners can delete songs" on public.songs;
create policy "Owners can delete songs"
  on public.songs for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Users can read their own favorites" on public.favorites;
create policy "Users can read their own favorites"
  on public.favorites for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can add public songs to favorites" on public.favorites;
create policy "Users can add public songs to favorites"
  on public.favorites for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.songs
      where songs.id = favorites.song_id
        and songs.is_public = true
    )
  );

drop policy if exists "Users can delete their own favorites" on public.favorites;
create policy "Users can delete their own favorites"
  on public.favorites for delete to authenticated
  using (user_id = auth.uid());
