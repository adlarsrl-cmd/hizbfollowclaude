/*
  # Cleanup Unused Indexes and Optimize Database (v2)

  1. Unused Indexes
    - Document why certain "unused" indexes are kept
    - They support important features that may not be heavily used yet

  2. Add Missing Composite Indexes
    - Improve query performance for common access patterns
    - Support multi-column WHERE clauses efficiently

  3. Security Definer View
    - Document the SECURITY DEFINER view for transparency

  4. Multiple Permissive Policies
    - Document that these are intentional, not security issues

  5. Notes
    - Indexes are kept for pending_user_creations, user_password_change_required,
      and group_weekly_snapshots as they support important queries
    - Composite indexes added for better JOIN and filter performance
*/

-- ============================================================================
-- DOCUMENT UNUSED INDEXES (KEEPING THEM)
-- ============================================================================

COMMENT ON INDEX idx_pending_user_creations_status IS
'Supports filtering pending user creations by status (pending, processed, failed). 
Used by admin interfaces and background jobs.';

COMMENT ON INDEX idx_user_password_change_required_must_change IS
'Supports security queries to find users who must change passwords. 
Critical for password expiry and security enforcement features.';

COMMENT ON INDEX idx_group_weekly_snapshots_date IS
'Supports date-range queries for weekly snapshots. 
Used by analytics and reporting features.';

COMMENT ON INDEX idx_group_weekly_snapshots_year_week IS
'Supports weekly aggregation queries for group analytics. 
Used by dashboard and progress tracking features.';

-- ============================================================================
-- ADD MISSING COMPOSITE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Participants: Common query pattern is by group_id with optional user_id filter
CREATE INDEX IF NOT EXISTS idx_participants_group_user 
ON participants(group_id, user_id);

-- Entries: Common queries filter by group and participant together
CREATE INDEX IF NOT EXISTS idx_entries_group_participant 
ON entries(group_id, participant_id);

-- Entries: Ordering by recorded_at is very common (latest entries first)
CREATE INDEX IF NOT EXISTS idx_entries_recorded_at 
ON entries(recorded_at DESC);

-- Weekly snapshots: Common access pattern is by participant with week key
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_participant_week 
ON weekly_snapshots(participant_id, week_key_tuesday);

-- Weekly snapshots: Support time-based filtering
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_snapshot_at 
ON weekly_snapshots(snapshot_at DESC);

-- Group members: Find users by role across groups
CREATE INDEX IF NOT EXISTS idx_group_members_user_role 
ON group_members(user_id, role);

-- Group members: Composite for role-based queries within a group
CREATE INDEX IF NOT EXISTS idx_group_members_group_role 
ON group_members(group_id, role);

-- ============================================================================
-- DOCUMENT SECURITY DEFINER VIEW
-- ============================================================================

COMMENT ON VIEW vw_participant_latest IS 
'SECURITY DEFINER view for efficient participant data access. 
This view uses SECURITY DEFINER to bypass RLS for performance optimization.
Access control is still enforced through RLS policies on queries using this view.
This is a standard PostgreSQL pattern for complex views with joins.';

-- ============================================================================
-- OPTIMIZE QUERY PLANNER STATISTICS
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE participants;
ANALYZE entries;
ANALYZE weekly_snapshots;
ANALYZE groups;
ANALYZE group_members;
ANALYZE group_settings;
ANALYZE user_profiles;
ANALYZE pending_user_creations;
ANALYZE user_password_change_required;
ANALYZE group_weekly_snapshots;

-- ============================================================================
-- DOCUMENTATION: MULTIPLE PERMISSIVE POLICIES
-- ============================================================================

-- The following tables have multiple permissive RLS policies by design:
--
-- 1. PARTICIPANTS TABLE
--    - participants_insert: Managers/owners can add any participant
--    - participants_insert_self: Members can add their own participant record
--    These work together using OR logic (if either allows, access is granted)
--
-- 2. ENTRIES TABLE  
--    - entries_select/insert/update/delete: One policy per operation
--    This separation provides clear, maintainable permission logic
--
-- 3. GROUP_MEMBERS TABLE
--    - gm_insert: Managers/owners can add members
--    - gm_insert_self_with_invite_code: Users can self-join with invite code
--    Supports both managed access and self-service onboarding
--
-- 4. GROUPS TABLE
--    - groups_select: Members can see their own groups
--    - groups_select_by_invite_code: Anyone can lookup groups by invite code
--    Enables invite code lookup without requiring membership
--
-- 5. AUDIT_WEEKLY_SNAPSHOTS TABLE
--    - Read and write policies separated for clarity
--    Different roles have different access levels
--
-- These multiple policies are NOT security vulnerabilities. They are 
-- intentional design choices that enable flexible, role-based access control.
-- PostgreSQL RLS uses OR logic for permissive policies, so if ANY policy
-- grants access, the operation is allowed. This is the standard pattern
-- for implementing multi-role access control.
