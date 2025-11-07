/*
  # ROW LEVEL SECURITY POLICIES FOR GROUPS SYSTEM

  1. RLS Enablement
    - Enables RLS on groups, group_members, participants, entries tables
    - Ensures data isolation between groups

  2. Security Policies Created
    
    ## group_members table:
    - SELECT: Users can view their own memberships
    - INSERT/UPDATE/DELETE: Only owners and managers can manage memberships
    
    ## groups table:
    - SELECT: Users can view groups they are members of
    - INSERT: Authenticated users can create groups
    - UPDATE/DELETE: Only owners can modify/delete groups
    
    ## participants table:
    - SELECT: Users can view participants in their groups
    - INSERT: Managers and owners can add participants
    - UPDATE: Managers and owners can update, members can update if can_write_self
    - DELETE: Only owners and managers can delete
    
    ## entries table:
    - SELECT: Users can view entries in their groups
    - INSERT: Members with write permission can create entries
    - UPDATE/DELETE: Only entry owner or group managers/owners can modify
    
  3. Security Notes
    - All policies check group membership via group_members
    - Restrictive by default: no access without explicit membership
    - Role-based access control (owner > manager > member > viewer)
    - Uses auth.uid() for current user identification
*/

-- =============== 1) ENABLE ROW LEVEL SECURITY ===============

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.participants enable row level security;
alter table public.entries enable row level security;

-- =============== 2) GROUP_MEMBERS POLICIES ===============

-- Allow users to view their own memberships
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='group_members' 
      and policyname='gm_select'
  ) then
    create policy gm_select on public.group_members
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- Allow group owners/managers to manage memberships
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='group_members' 
      and policyname='gm_insert'
  ) then
    create policy gm_insert on public.group_members
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.group_members m
          where m.group_id = group_members.group_id
            and m.user_id = auth.uid()
            and m.role in ('owner','manager')
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='group_members' 
      and policyname='gm_update'
  ) then
    create policy gm_update on public.group_members
      for update
      to authenticated
      using (
        exists (
          select 1 from public.group_members m
          where m.group_id = group_members.group_id
            and m.user_id = auth.uid()
            and m.role in ('owner','manager')
        )
      )
      with check (
        exists (
          select 1 from public.group_members m
          where m.group_id = group_members.group_id
            and m.user_id = auth.uid()
            and m.role in ('owner','manager')
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='group_members' 
      and policyname='gm_delete'
  ) then
    create policy gm_delete on public.group_members
      for delete
      to authenticated
      using (
        exists (
          select 1 from public.group_members m
          where m.group_id = group_members.group_id
            and m.user_id = auth.uid()
            and m.role in ('owner','manager')
        )
      );
  end if;
end $$;

-- =============== 3) GROUPS POLICIES ===============

-- Users can view groups they belong to
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='groups' 
      and policyname='groups_select'
  ) then
    create policy groups_select on public.groups
      for select
      to authenticated
      using (
        exists (
          select 1 from public.group_members m
          where m.group_id = groups.id 
            and m.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Authenticated users can create groups
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='groups' 
      and policyname='groups_insert'
  ) then
    create policy groups_insert on public.groups
      for insert
      to authenticated
      with check (auth.uid() is not null);
  end if;
end $$;

-- Only owners can update groups
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='groups' 
      and policyname='groups_update'
  ) then
    create policy groups_update on public.groups
      for update
      to authenticated
      using (
        exists (
          select 1 from public.group_members m
          where m.group_id = groups.id 
            and m.user_id = auth.uid()
            and m.role = 'owner'
        )
      )
      with check (
        exists (
          select 1 from public.group_members m
          where m.group_id = groups.id 
            and m.user_id = auth.uid()
            and m.role = 'owner'
        )
      );
  end if;
end $$;

-- Only owners can delete groups
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='groups' 
      and policyname='groups_delete'
  ) then
    create policy groups_delete on public.groups
      for delete
      to authenticated
      using (
        exists (
          select 1 from public.group_members m
          where m.group_id = groups.id 
            and m.user_id = auth.uid()
            and m.role = 'owner'
        )
      );
  end if;
end $$;

-- =============== 4) PARTICIPANTS POLICIES ===============

-- Users can view participants in their groups
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='participants' 
      and policyname='participants_select'
  ) then
    create policy participants_select on public.participants
      for select
      to authenticated
      using (
        exists (
          select 1 from public.group_members m
          where m.group_id = participants.group_id 
            and m.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Managers and owners can add participants
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='participants' 
      and policyname='participants_insert'
  ) then
    create policy participants_insert on public.participants
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.group_members m
          where m.group_id = participants.group_id 
            and m.user_id = auth.uid()
            and m.role in ('owner','manager')
        )
      );
  end if;
end $$;

-- Managers and owners can update, or members if it's their own participant record
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='participants' 
      and policyname='participants_update'
  ) then
    create policy participants_update on public.participants
      for update
      to authenticated
      using (
        exists (
          select 1 from public.group_members m
          where m.group_id = participants.group_id 
            and m.user_id = auth.uid()
            and (m.role in ('owner','manager') or (m.can_write_self and participants.user_id = auth.uid()))
        )
      )
      with check (
        exists (
          select 1 from public.group_members m
          where m.group_id = participants.group_id 
            and m.user_id = auth.uid()
            and (m.role in ('owner','manager') or (m.can_write_self and participants.user_id = auth.uid()))
        )
      );
  end if;
end $$;

-- Only owners and managers can delete participants
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='participants' 
      and policyname='participants_delete'
  ) then
    create policy participants_delete on public.participants
      for delete
      to authenticated
      using (
        exists (
          select 1 from public.group_members m
          where m.group_id = participants.group_id 
            and m.user_id = auth.uid()
            and m.role in ('owner','manager')
        )
      );
  end if;
end $$;

-- =============== 5) ENTRIES POLICIES ===============

-- Users can view entries in their groups
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='entries' 
      and policyname='entries_select'
  ) then
    create policy entries_select on public.entries
      for select
      to authenticated
      using (
        exists (
          select 1 from public.group_members m
          where m.group_id = entries.group_id 
            and m.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Members with write permission can create entries
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='entries' 
      and policyname='entries_insert'
  ) then
    create policy entries_insert on public.entries
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.group_members m
          where m.group_id = entries.group_id 
            and m.user_id = auth.uid()
            and (m.role in ('owner','manager','member') and m.can_write_self)
        )
      );
  end if;
end $$;

-- Entry owner or group managers/owners can update
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='entries' 
      and policyname='entries_update'
  ) then
    create policy entries_update on public.entries
      for update
      to authenticated
      using (
        entries.owner_id = auth.uid() or
        exists (
          select 1 from public.group_members m
          where m.group_id = entries.group_id 
            and m.user_id = auth.uid()
            and m.role in ('owner','manager')
        )
      )
      with check (
        entries.owner_id = auth.uid() or
        exists (
          select 1 from public.group_members m
          where m.group_id = entries.group_id 
            and m.user_id = auth.uid()
            and m.role in ('owner','manager')
        )
      );
  end if;
end $$;

-- Entry owner or group managers/owners can delete
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' 
      and tablename='entries' 
      and policyname='entries_delete'
  ) then
    create policy entries_delete on public.entries
      for delete
      to authenticated
      using (
        entries.owner_id = auth.uid() or
        exists (
          select 1 from public.group_members m
          where m.group_id = entries.group_id 
            and m.user_id = auth.uid()
            and m.role in ('owner','manager')
        )
      );
  end if;
end $$;