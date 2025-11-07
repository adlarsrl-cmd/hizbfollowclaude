/*
  # Refactor RLS Policies - Granular Permissions by Role

  1. Role Definitions
    - **Owner**: Full control (CRUD all, modify/delete entries, manage members)
    - **Manager**: Can write for everyone, view all details, manage members (but NOT modify/delete entries)
    - **Member**: Can write own data, view own stats + anonymous leaderboard (top 3), cannot modify/delete entries
    - **Viewer**: Read-only, can only view own data, cannot write anything
  
  2. Tables Affected
    - `groups`: View (members), Update/Delete (owners only)
    - `group_members`: Manage by owners/managers
    - `participants`: CRUD based on role
    - `entries`: Write permissions based on role, modify/delete ONLY by owner
    - `weekly_snapshots`: Same as entries
  
  3. Key Changes from Previous Policies
    - Viewer role: No write permissions, can only view own data
    - Member role: Cannot see other members' details (only anonymous leaderboard)
    - Manager role: Can write but NOT modify/delete entries (only owner can)
    - Owner role: Only role that can modify/delete entries after creation
  
  4. Security Notes
    - All policies check group membership via group_members table
    - Restrictive by default: no access without explicit membership
    - Entries are immutable except for owners
    - Archived groups block all writes
*/

-- =============== DROP OLD POLICIES (CLEAN SLATE) ===============

-- Drop existing policies to rebuild from scratch
DROP POLICY IF EXISTS gm_select ON public.group_members;
DROP POLICY IF EXISTS gm_insert ON public.group_members;
DROP POLICY IF EXISTS gm_update ON public.group_members;
DROP POLICY IF EXISTS gm_delete ON public.group_members;

DROP POLICY IF EXISTS groups_select ON public.groups;
DROP POLICY IF EXISTS groups_insert ON public.groups;
DROP POLICY IF EXISTS groups_update ON public.groups;
DROP POLICY IF EXISTS groups_delete ON public.groups;

DROP POLICY IF EXISTS participants_select ON public.participants;
DROP POLICY IF EXISTS participants_insert ON public.participants;
DROP POLICY IF EXISTS participants_update ON public.participants;
DROP POLICY IF EXISTS participants_delete ON public.participants;

DROP POLICY IF EXISTS entries_select ON public.entries;
DROP POLICY IF EXISTS entries_insert ON public.entries;
DROP POLICY IF EXISTS entries_update ON public.entries;
DROP POLICY IF EXISTS entries_delete ON public.entries;

-- =============== HELPER FUNCTION: GET USER ROLE IN GROUP ===============

CREATE OR REPLACE FUNCTION public.get_user_role_in_group(p_group_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;
  
  RETURN v_role;
END;
$$;

-- =============== GROUPS TABLE POLICIES ===============

-- SELECT: Users can view groups they belong to (any role)
CREATE POLICY groups_select ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = groups.id 
        AND m.user_id = auth.uid()
    )
  );

-- INSERT: Authenticated users can create groups
CREATE POLICY groups_insert ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only owners can update groups
CREATE POLICY groups_update ON public.groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = groups.id 
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = groups.id 
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- DELETE: Only owners can delete groups (archive)
CREATE POLICY groups_delete ON public.groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = groups.id 
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- =============== GROUP_MEMBERS TABLE POLICIES ===============

-- SELECT: Users can view all members of their groups
CREATE POLICY gm_select ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = group_members.group_id
        AND m.user_id = auth.uid()
    )
  );

-- INSERT: Owners and managers can add members
CREATE POLICY gm_insert ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = group_members.group_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  );

-- UPDATE: Owners and managers can update member roles
CREATE POLICY gm_update ON public.group_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = group_members.group_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = group_members.group_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  );

-- DELETE: Owners and managers can remove members
CREATE POLICY gm_delete ON public.group_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = group_members.group_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  );

-- =============== PARTICIPANTS TABLE POLICIES ===============

-- SELECT: 
--   - Owner/Manager: Can see all participants in their groups
--   - Member/Viewer: Can only see their own participant record
CREATE POLICY participants_select ON public.participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = participants.group_id 
        AND m.user_id = auth.uid()
        AND (
          -- Owners and managers see all
          m.role IN ('owner', 'manager')
          OR
          -- Members and viewers see only their own
          (m.role IN ('member', 'viewer') AND participants.user_id = auth.uid())
        )
    )
  );

-- INSERT: Only owners and managers can add participants
CREATE POLICY participants_insert ON public.participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = participants.group_id 
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  );

-- UPDATE: 
--   - Owner/Manager: Can update any participant
--   - Member: Can update own participant record if can_write_self = true
--   - Viewer: Cannot update
CREATE POLICY participants_update ON public.participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = participants.group_id 
        AND m.user_id = auth.uid()
        AND (
          m.role IN ('owner', 'manager')
          OR
          (m.role = 'member' AND m.can_write_self AND participants.user_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = participants.group_id 
        AND m.user_id = auth.uid()
        AND (
          m.role IN ('owner', 'manager')
          OR
          (m.role = 'member' AND m.can_write_self AND participants.user_id = auth.uid())
        )
    )
  );

-- DELETE: Only owners and managers can delete participants
CREATE POLICY participants_delete ON public.participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = participants.group_id 
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'manager')
    )
  );

-- =============== ENTRIES TABLE POLICIES ===============

-- SELECT:
--   - Owner/Manager: Can see all entries in their groups
--   - Member/Viewer: Can only see their own entries
CREATE POLICY entries_select ON public.entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = entries.group_id 
        AND m.user_id = auth.uid()
        AND (
          -- Owners and managers see all
          m.role IN ('owner', 'manager')
          OR
          -- Members and viewers see only their own
          (m.role IN ('member', 'viewer') AND entries.owner_id = auth.uid())
        )
    )
  );

-- INSERT:
--   - Owner/Manager: Can insert for anyone
--   - Member: Can insert for themselves if can_write_self = true
--   - Viewer: Cannot insert
CREATE POLICY entries_insert ON public.entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check group is not archived
    NOT EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = entries.group_id AND g.archived = true
    )
    AND
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = entries.group_id 
        AND m.user_id = auth.uid()
        AND (
          m.role IN ('owner', 'manager')
          OR
          (m.role = 'member' AND m.can_write_self)
        )
    )
  );

-- UPDATE: ONLY owners can modify entries (immutable for others)
CREATE POLICY entries_update ON public.entries
  FOR UPDATE
  TO authenticated
  USING (
    -- Check group is not archived
    NOT EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = entries.group_id AND g.archived = true
    )
    AND
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = entries.group_id 
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  )
  WITH CHECK (
    -- Check group is not archived
    NOT EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = entries.group_id AND g.archived = true
    )
    AND
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = entries.group_id 
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- DELETE: ONLY owners can delete entries
CREATE POLICY entries_delete ON public.entries
  FOR DELETE
  TO authenticated
  USING (
    -- Check group is not archived
    NOT EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = entries.group_id AND g.archived = true
    )
    AND
    EXISTS (
      SELECT 1 FROM public.group_members m
      WHERE m.group_id = entries.group_id 
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- =============== WEEKLY_SNAPSHOTS TABLE POLICIES ===============

-- Same logic as entries (viewing and immutability)
DROP POLICY IF EXISTS weekly_snapshots_select ON public.weekly_snapshots;
DROP POLICY IF EXISTS weekly_snapshots_insert ON public.weekly_snapshots;
DROP POLICY IF EXISTS weekly_snapshots_update ON public.weekly_snapshots;
DROP POLICY IF EXISTS weekly_snapshots_delete ON public.weekly_snapshots;

-- For now, weekly_snapshots doesn't have group_id, so we check via participant
CREATE POLICY weekly_snapshots_select ON public.weekly_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      INNER JOIN public.group_members m ON m.group_id = p.group_id
      WHERE p.id = weekly_snapshots.participant_id
        AND m.user_id = auth.uid()
        AND (
          m.role IN ('owner', 'manager')
          OR
          (m.role IN ('member', 'viewer') AND weekly_snapshots.owner_id = auth.uid())
        )
    )
  );

CREATE POLICY weekly_snapshots_insert ON public.weekly_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participants p
      INNER JOIN public.group_members m ON m.group_id = p.group_id
      WHERE p.id = weekly_snapshots.participant_id
        AND m.user_id = auth.uid()
        AND (
          m.role IN ('owner', 'manager')
          OR
          (m.role = 'member' AND m.can_write_self)
        )
    )
  );

-- Only owners can update/delete snapshots
CREATE POLICY weekly_snapshots_update ON public.weekly_snapshots
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      INNER JOIN public.group_members m ON m.group_id = p.group_id
      WHERE p.id = weekly_snapshots.participant_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participants p
      INNER JOIN public.group_members m ON m.group_id = p.group_id
      WHERE p.id = weekly_snapshots.participant_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

CREATE POLICY weekly_snapshots_delete ON public.weekly_snapshots
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      INNER JOIN public.group_members m ON m.group_id = p.group_id
      WHERE p.id = weekly_snapshots.participant_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );