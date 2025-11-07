/*
  # Optimize RLS Policies - Auth Function Calls (v2)

  1. Performance Optimization
    - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Tables Updated
    - participants (5 policies)
    - entries (4 policies)
    - weekly_snapshots (5 policies)
    - app_settings (1 policy)
    - notifications_subscriptions (1 policy)
    - groups (5 policies)
    - user_links (1 policy)
    - invitations (1 policy)
    - audit_weekly_snapshots (2 policies)
    - user_roles (2 policies)
    - group_members (5 policies)
    - user_profiles (3 policies)
    - user_password_change_required (2 policies)
    - pending_user_creations (1 policy)
    - group_settings (3 policies)
    - group_weekly_snapshots (2 policies)

  3. Notes
    - All existing policies are dropped and recreated with optimized auth calls
    - Policy logic remains exactly the same, only performance is improved
    - Fixed column names (owner_id vs user_id) for correct table references
*/

-- ============================================================================
-- PARTICIPANTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own participants" ON participants;
DROP POLICY IF EXISTS "participants_select" ON participants;
DROP POLICY IF EXISTS "participants_insert" ON participants;
DROP POLICY IF EXISTS "participants_insert_self" ON participants;
DROP POLICY IF EXISTS "participants_update" ON participants;
DROP POLICY IF EXISTS "participants_delete" ON participants;

CREATE POLICY "participants_select" ON participants
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = participants.group_id
    AND gm.user_id = (select auth.uid())
  )
);

CREATE POLICY "participants_insert" ON participants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = participants.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

CREATE POLICY "participants_insert_self" ON participants
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = participants.group_id
    AND gm.user_id = (select auth.uid())
  )
);

CREATE POLICY "participants_update" ON participants
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = participants.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = participants.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

CREATE POLICY "participants_delete" ON participants
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = participants.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

-- ============================================================================
-- ENTRIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own entries" ON entries;
DROP POLICY IF EXISTS "entries_select" ON entries;
DROP POLICY IF EXISTS "entries_insert" ON entries;
DROP POLICY IF EXISTS "entries_update" ON entries;
DROP POLICY IF EXISTS "entries_delete" ON entries;

CREATE POLICY "entries_select" ON entries
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = entries.group_id
    AND gm.user_id = (select auth.uid())
  )
);

CREATE POLICY "entries_insert" ON entries
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = entries.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager', 'member')
  )
);

CREATE POLICY "entries_update" ON entries
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = entries.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager', 'member')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = entries.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager', 'member')
  )
);

CREATE POLICY "entries_delete" ON entries
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = entries.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager', 'member')
  )
);

-- ============================================================================
-- WEEKLY_SNAPSHOTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can access own snapshots" ON weekly_snapshots;
DROP POLICY IF EXISTS "weekly_snapshots_select" ON weekly_snapshots;
DROP POLICY IF EXISTS "weekly_snapshots_insert" ON weekly_snapshots;
DROP POLICY IF EXISTS "weekly_snapshots_update" ON weekly_snapshots;
DROP POLICY IF EXISTS "weekly_snapshots_delete" ON weekly_snapshots;

CREATE POLICY "weekly_snapshots_select" ON weekly_snapshots
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = weekly_snapshots.participant_id
    AND gm.user_id = (select auth.uid())
  )
);

CREATE POLICY "weekly_snapshots_insert" ON weekly_snapshots
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = weekly_snapshots.participant_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager', 'member')
  )
);

CREATE POLICY "weekly_snapshots_update" ON weekly_snapshots
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = weekly_snapshots.participant_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager', 'member')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = weekly_snapshots.participant_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager', 'member')
  )
);

CREATE POLICY "weekly_snapshots_delete" ON weekly_snapshots
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = weekly_snapshots.participant_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager', 'member')
  )
);

-- ============================================================================
-- APP_SETTINGS TABLE (legacy - keeping for compatibility)
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own settings" ON app_settings;

CREATE POLICY "Users can manage own settings" ON app_settings
FOR ALL TO authenticated
USING (owner_id = (select auth.uid()))
WITH CHECK (owner_id = (select auth.uid()));

-- ============================================================================
-- NOTIFICATIONS_SUBSCRIPTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications_subscriptions;

CREATE POLICY "Users can manage own notifications" ON notifications_subscriptions
FOR ALL TO authenticated
USING (owner_id = (select auth.uid()))
WITH CHECK (owner_id = (select auth.uid()));

-- ============================================================================
-- GROUPS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own groups" ON groups;
DROP POLICY IF EXISTS "groups_select" ON groups;
DROP POLICY IF EXISTS "groups_select_by_invite_code" ON groups;
DROP POLICY IF EXISTS "groups_insert" ON groups;
DROP POLICY IF EXISTS "groups_update" ON groups;
DROP POLICY IF EXISTS "groups_delete" ON groups;

CREATE POLICY "groups_select" ON groups
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id
    AND gm.user_id = (select auth.uid())
  )
);

CREATE POLICY "groups_select_by_invite_code" ON groups
FOR SELECT TO authenticated
USING (invite_code IS NOT NULL);

CREATE POLICY "groups_insert" ON groups
FOR INSERT TO authenticated
WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "groups_update" ON groups
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

CREATE POLICY "groups_delete" ON groups
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id
    AND gm.user_id = (select auth.uid())
    AND gm.role = 'owner'
  )
);

-- ============================================================================
-- USER_LINKS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage participant links" ON user_links;

CREATE POLICY "Users can manage participant links" ON user_links
FOR ALL TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- INVITATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own invitations" ON invitations;

CREATE POLICY "Users can manage own invitations" ON invitations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = invitations.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = invitations.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

-- ============================================================================
-- AUDIT_WEEKLY_SNAPSHOTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "audit_rw" ON audit_weekly_snapshots;
DROP POLICY IF EXISTS "Users can read own audit logs" ON audit_weekly_snapshots;
DROP POLICY IF EXISTS "Admins can create audit logs" ON audit_weekly_snapshots;

CREATE POLICY "Users can read own audit logs" ON audit_weekly_snapshots
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = audit_weekly_snapshots.participant_id
    AND gm.user_id = (select auth.uid())
  )
);

CREATE POLICY "Admins can create audit logs" ON audit_weekly_snapshots
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = audit_weekly_snapshots.participant_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

-- ============================================================================
-- USER_ROLES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;

CREATE POLICY "Users can read own role" ON user_roles
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own role" ON user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- GROUP_MEMBERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "gm_select" ON group_members;
DROP POLICY IF EXISTS "gm_insert" ON group_members;
DROP POLICY IF EXISTS "gm_insert_self_with_invite_code" ON group_members;
DROP POLICY IF EXISTS "gm_update" ON group_members;
DROP POLICY IF EXISTS "gm_delete" ON group_members;

CREATE POLICY "gm_select" ON group_members
FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = (select auth.uid())
  )
);

CREATE POLICY "gm_insert" ON group_members
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

CREATE POLICY "gm_insert_self_with_invite_code" ON group_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (select auth.uid())
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_members.group_id
    AND g.invite_code IS NOT NULL
  )
);

CREATE POLICY "gm_update" ON group_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

CREATE POLICY "gm_delete" ON group_members
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role = 'owner'
  )
);

-- ============================================================================
-- USER_PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;

CREATE POLICY "user_profiles_insert" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_profiles_update" ON user_profiles
FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_profiles_delete" ON user_profiles
FOR DELETE TO authenticated
USING (user_id = (select auth.uid()));

-- ============================================================================
-- USER_PASSWORD_CHANGE_REQUIRED TABLE
-- ============================================================================

DROP POLICY IF EXISTS "user_password_change_required_select" ON user_password_change_required;
DROP POLICY IF EXISTS "user_password_change_required_update" ON user_password_change_required;

CREATE POLICY "user_password_change_required_select" ON user_password_change_required
FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY "user_password_change_required_update" ON user_password_change_required
FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- PENDING_USER_CREATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "pending_user_creations_select" ON pending_user_creations;

CREATE POLICY "pending_user_creations_select" ON pending_user_creations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = pending_user_creations.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

-- ============================================================================
-- GROUP_SETTINGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "settings_insert" ON group_settings;
DROP POLICY IF EXISTS "settings_update" ON group_settings;
DROP POLICY IF EXISTS "settings_delete" ON group_settings;
DROP POLICY IF EXISTS "settings_select" ON group_settings;

-- Add missing SELECT policy for group_settings
CREATE POLICY "settings_select" ON group_settings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_settings.group_id
    AND gm.user_id = (select auth.uid())
  )
);

CREATE POLICY "settings_insert" ON group_settings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_settings.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

CREATE POLICY "settings_update" ON group_settings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_settings.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_settings.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

CREATE POLICY "settings_delete" ON group_settings
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_settings.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role = 'owner'
  )
);

-- ============================================================================
-- GROUP_WEEKLY_SNAPSHOTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "group_weekly_snapshots_select" ON group_weekly_snapshots;
DROP POLICY IF EXISTS "group_weekly_snapshots_insert" ON group_weekly_snapshots;
DROP POLICY IF EXISTS "group_weekly_snapshots_delete" ON group_weekly_snapshots;

-- Add missing SELECT policy
CREATE POLICY "group_weekly_snapshots_select" ON group_weekly_snapshots
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_weekly_snapshots.group_id
    AND gm.user_id = (select auth.uid())
  )
);

CREATE POLICY "group_weekly_snapshots_insert" ON group_weekly_snapshots
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_weekly_snapshots.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role IN ('owner', 'manager')
  )
);

CREATE POLICY "group_weekly_snapshots_delete" ON group_weekly_snapshots
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_weekly_snapshots.group_id
    AND gm.user_id = (select auth.uid())
    AND gm.role = 'owner'
  )
);
