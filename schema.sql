-- Im Supabase SQL Editor ausführen.
create extension if not exists pgcrypto;

-- Jede Familie ist ein eigener gemeinsamer Kalender.
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  primary key (family_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  date date not null,
  time time,
  member text not null default 'all',
  category text not null default 'Familie',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists events_family_date_idx on public.events (family_id, date, time);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;

-- Die Data API darf die Tabellen ansprechen; RLS-Policies darunter begrenzen
-- weiterhin alle Zeilen auf die jeweilige Familie.
grant usage on schema public to authenticated;
grant select on public.families to authenticated;
grant select on public.family_members to authenticated;
grant select, insert, update, delete on public.events to authenticated;

create policy "Members can read their family" on public.families
  for select to authenticated using (
    exists (select 1 from public.family_members m where m.family_id = id and m.user_id = auth.uid())
  );
create policy "Members can read family membership" on public.family_members
  for select to authenticated using (user_id = auth.uid());
create policy "Members can read family events" on public.events
  for select to authenticated using (
    exists (select 1 from public.family_members m where m.family_id = events.family_id and m.user_id = auth.uid())
  );
create policy "Members can add family events" on public.events
  for insert to authenticated with check (
    exists (select 1 from public.family_members m where m.family_id = events.family_id and m.user_id = auth.uid())
  );
create policy "Members can update family events" on public.events
  for update to authenticated using (
    exists (select 1 from public.family_members m where m.family_id = events.family_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.family_members m where m.family_id = events.family_id and m.user_id = auth.uid())
  );
create policy "Members can delete family events" on public.events
  for delete to authenticated using (
    exists (select 1 from public.family_members m where m.family_id = events.family_id and m.user_id = auth.uid())
  );
