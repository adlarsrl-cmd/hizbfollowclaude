/*
  # PATCH GROUPS SYSTEM - SAFE & IDEMPOTENT MIGRATION

  1. Tables & Columns Modified
    - `groups`: Adds settings JSONB and created_by columns if missing
    - `group_members`: Creates complete membership table with roles

  2. Columns Added (if not exists)
    - `participants.group_id`: Foreign key to groups
    - `participants.user_id`: Foreign key to auth.users
    - `entries.group_id`: Foreign key to groups

  3. Foreign Keys & Indexes
    - FK constraints added with cascade delete for referential integrity
    - Performance indexes on group_id and user_id columns
    - Composite index on entries for efficient queries

  4. Data Migration
    - Creates default "Mardi" group if absent
    - Backfills all existing participants and entries with default group
    - Creates owner membership for first user in default group
    - Auto-creates member records for all participants linked to users

  5. Security
    - Trigger to auto-assign owner role when creating a group
    - All operations are idempotent and safe to re-run

  Notes:
    - NO data loss: all existing data is preserved
    - NO breaking changes: existing queries continue to work
    - Handles edge cases: missing users, duplicate memberships
    - Aligns with existing schema (owner_id instead of created_by)
*/

-- =============== 1) ALTER GROUPS TABLE (IDEMPOTENT) ===============

-- Add settings column if missing
alter table public.groups add column if not exists settings jsonb not null default '{}'::jsonb;

-- Add created_by column (mirrors owner_id for compatibility)
alter table public.groups add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Sync created_by with owner_id for existing records
update public.groups set created_by = owner_id where created_by is null and owner_id is not null;

-- =============== 2) CREATE GROUP_MEMBERS TABLE (IDEMPOTENT) ===============

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','member','viewer')),
  can_write_self boolean not null default true,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- =============== 3) ADD COLUMNS TO EXISTING TABLES (IDEMPOTENT) ===============

alter table public.participants add column if not exists group_id uuid;
alter table public.participants add column if not exists user_id uuid;
alter table public.entries add column if not exists group_id uuid;

-- =============== 4) ADD FOREIGN KEYS (IDEMPOTENT) ===============

do $$ begin
  if not exists (select 1 from pg_constraint where conname='participants_group_fk') then
    alter table public.participants
      add constraint participants_group_fk
      foreign key (group_id) references public.groups(id) on delete cascade;
  end if;
  
  if not exists (select 1 from pg_constraint where conname='participants_user_fk') then
    alter table public.participants
      add constraint participants_user_fk
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
  
  if not exists (select 1 from pg_constraint where conname='entries_group_fk') then
    alter table public.entries
      add constraint entries_group_fk
      foreign key (group_id) references public.groups(id) on delete cascade;
  end if;
end $$;

-- =============== 5) ADD INDEXES (IDEMPOTENT) ===============

create index if not exists idx_participants_group on public.participants(group_id);
create index if not exists idx_participants_user on public.participants(user_id);
create index if not exists idx_entries_group on public.entries(group_id);
create index if not exists idx_entries_participant_recorded_at 
  on public.entries(participant_id, recorded_at);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);

-- =============== 6) CREATE DEFAULT GROUP (IDEMPOTENT) ===============

do $$
declare
  v_group_id uuid;
  v_first_user_id uuid;
begin
  -- Get or create default group
  insert into public.groups (name, description, settings, owner_id, created_by, is_private)
  select 
    'Mardi', 
    'Groupe par défaut créé lors de la migration',
    '{"description":"Groupe par défaut créé lors de la migration"}'::jsonb,
    (select id from auth.users order by created_at asc limit 1),
    (select id from auth.users order by created_at asc limit 1),
    true
  where not exists (select 1 from public.groups where name = 'Mardi')
  returning id into v_group_id;

  -- Get the group id if it already exists
  if v_group_id is null then
    select id into v_group_id from public.groups where name = 'Mardi' order by created_at asc limit 1;
  end if;

  -- =============== 7) BACKFILL GROUP_ID ON EXISTING DATA ===============

  -- Backfill participants
  update public.participants p 
  set group_id = v_group_id
  where p.group_id is null;

  -- Backfill entries
  update public.entries e 
  set group_id = v_group_id
  where e.group_id is null;

  -- =============== 8) CREATE OWNER MEMBERSHIP (IDEMPOTENT) ===============

  -- Get first user
  select id into v_first_user_id from auth.users order by created_at asc limit 1;

  -- Create owner membership
  if v_first_user_id is not null then
    insert into public.group_members (group_id, user_id, role, can_write_self)
    values (v_group_id, v_first_user_id, 'owner', true)
    on conflict (group_id, user_id) do nothing;
  end if;

  -- =============== 9) CREATE MEMBER RECORDS FROM PARTICIPANTS ===============

  -- Auto-create member records for all participants with user_id
  insert into public.group_members (group_id, user_id, role, can_write_self)
  select distinct p.group_id, p.user_id, 'member', true
  from public.participants p
  where p.user_id is not null
    and p.group_id is not null
    and not exists (
      select 1 from public.group_members gm
      where gm.group_id = p.group_id and gm.user_id = p.user_id
    )
  on conflict (group_id, user_id) do nothing;
end $$;

-- =============== 10) CREATE TRIGGER FOR AUTO-OWNER ASSIGNMENT ===============

create or replace function public.trg_groups_owner()
returns trigger
language plpgsql
security definer
as $$
declare 
  v_uid uuid;
begin
  -- Use created_by if set, otherwise fall back to auth.uid()
  v_uid := coalesce(new.created_by, new.owner_id, auth.uid());
  if v_uid is not null then
    insert into public.group_members (group_id, user_id, role, can_write_self)
    values (new.id, v_uid, 'owner', true)
    on conflict (group_id, user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trg_groups_owner on public.groups;
create trigger trg_groups_owner
after insert on public.groups
for each row execute function public.trg_groups_owner();