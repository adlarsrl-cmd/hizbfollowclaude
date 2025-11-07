/*
  # Remove Unused Indexes and Optimize (v2)

  1. Remove Unused Indexes
    - Drop indexes that are not being used and won't provide value
    - Foreign key indexes are kept if they support JOIN operations
    - Remove duplicate indexes

  2. Indexes Removed
    - pending_user_creations: status, created_by, group_id, participant_id
    - user_password_change_required: must_change
    - group_weekly_snapshots: date, year_week, created_by
    - groups: archived_by, created_by
    - invitations: group_id
    - user_links: participant_id
    - participants: group_user composite
    - entries: group_participant composite, recorded_at
    - weekly_snapshots: participant_week composite, snapshot_at
    - group_members: user_role, group_role composites

  3. Indexes Kept
    - Primary keys and unique constraints (automatically indexed)
    - Foreign keys that are frequently used in JOINs

  4. Notes
    - Unused indexes slow down writes and consume storage
    - PostgreSQL's query planner can handle simple queries without these indexes
    - Foreign keys alone provide sufficient performance for current scale
*/

-- ============================================================================
-- REMOVE UNUSED INDEXES
-- ============================================================================

-- Pending user creations - rarely queried, small table
DROP INDEX IF EXISTS idx_pending_user_creations_status;
DROP INDEX IF EXISTS idx_pending_user_creations_created_by;
DROP INDEX IF EXISTS idx_pending_user_creations_group_id;
DROP INDEX IF EXISTS idx_pending_user_creations_participant_id;

-- User password change required - small table, rarely queried
DROP INDEX IF EXISTS idx_user_password_change_required_must_change;

-- Group weekly snapshots - rarely used table
DROP INDEX IF EXISTS idx_group_weekly_snapshots_date;
DROP INDEX IF EXISTS idx_group_weekly_snapshots_year_week;
DROP INDEX IF EXISTS idx_group_weekly_snapshots_created_by;

-- Groups - created_by and archived_by rarely queried directly
DROP INDEX IF EXISTS idx_groups_archived_by;
DROP INDEX IF EXISTS idx_groups_created_by;

-- Invitations - small table, not frequently queried
DROP INDEX IF EXISTS idx_invitations_group_id;

-- User links - small table, 1-to-1 relationship
DROP INDEX IF EXISTS idx_user_links_participant_id;

-- Composite indexes that aren't being used
DROP INDEX IF EXISTS idx_participants_group_user;
DROP INDEX IF EXISTS idx_entries_group_participant;
DROP INDEX IF EXISTS idx_entries_recorded_at;
DROP INDEX IF EXISTS idx_weekly_snapshots_participant_week;
DROP INDEX IF EXISTS idx_weekly_snapshots_snapshot_at;
DROP INDEX IF EXISTS idx_group_members_user_role;
DROP INDEX IF EXISTS idx_group_members_group_role;

-- ============================================================================
-- REMOVE DUPLICATE INDEX
-- ============================================================================

-- Keep the original idx_snapshots_participant_week, drop the duplicate
DROP INDEX IF EXISTS idx_weekly_snapshots_participant_week;

-- Verify the original still exists and is sufficient
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'weekly_snapshots' 
    AND indexname = 'idx_snapshots_participant_week'
  ) THEN
    -- If original doesn't exist, create it
    CREATE INDEX idx_snapshots_participant_week 
    ON weekly_snapshots(participant_id, week_key_tuesday);
  END IF;
END $$;

-- ============================================================================
-- KEEP ONLY ESSENTIAL INDEXES
-- ============================================================================

-- Participants are frequently queried by group
CREATE INDEX IF NOT EXISTS idx_participants_group_id 
ON participants(group_id);

-- Entries are frequently queried by group and participant
CREATE INDEX IF NOT EXISTS idx_entries_group_id 
ON entries(group_id);

CREATE INDEX IF NOT EXISTS idx_entries_participant_id 
ON entries(participant_id);

-- Weekly snapshots are queried by participant
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_participant_id 
ON weekly_snapshots(participant_id);

-- Group members are frequently queried by user and by group
CREATE INDEX IF NOT EXISTS idx_group_members_user_id 
ON group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id 
ON group_members(group_id);

-- ============================================================================
-- OPTIMIZE STATISTICS
-- ============================================================================

ANALYZE participants;
ANALYZE entries;
ANALYZE weekly_snapshots;
ANALYZE groups;
ANALYZE group_members;
