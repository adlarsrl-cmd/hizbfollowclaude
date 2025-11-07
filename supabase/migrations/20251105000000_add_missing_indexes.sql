-- Add missing indexes for better query performance
-- Based on actual database structure from your Supabase

-- ========================================
-- PARTICIPANTS TABLE (has group_id + user_id)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_participants_group_user ON participants(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_participants_group_active ON participants(group_id, active);
CREATE INDEX IF NOT EXISTS idx_participants_owner_active ON participants(owner_id, active);

-- ========================================
-- ENTRIES TABLE (has group_id)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_entries_group_participant ON entries(group_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_entries_participant_recorded ON entries(participant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_owner_participant ON entries(owner_id, participant_id);

-- ========================================
-- WEEKLY_SNAPSHOTS TABLE (NO group_id, only owner_id)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_snapshots_owner_participant ON weekly_snapshots(owner_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_participant_week ON weekly_snapshots(participant_id, week_key_tuesday);

-- ========================================
-- APP_SETTINGS TABLE (NO group_id, only owner_id)
-- ========================================
-- Primary key is already on owner_id, no additional index needed

-- ========================================
-- NOTIFICATIONS_SUBSCRIPTIONS TABLE (NO group_id)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_notifications_owner ON notifications_subscriptions(owner_id);

-- ========================================
-- GROUP_MEMBERS TABLE (has group_id)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_role ON group_members(user_id, role);

-- ========================================
-- GROUPS TABLE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code) WHERE invite_code IS NOT NULL;

