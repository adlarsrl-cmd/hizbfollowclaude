/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes on all foreign key columns that are missing them
    - This significantly improves JOIN performance and query optimization

  2. Indexes Added
    - `group_weekly_snapshots.created_by` - for user lookups
    - `groups.archived_by` - for archive auditing
    - `groups.created_by` - for ownership queries
    - `invitations.group_id` - for group invitation lookups
    - `pending_user_creations.created_by` - for creator tracking
    - `pending_user_creations.group_id` - for group-based queries
    - `pending_user_creations.participant_id` - for participant linkage
    - `user_links.participant_id` - for participant-user mappings

  3. Notes
    - These indexes prevent full table scans when filtering by foreign keys
    - Essential for good performance as the database grows
*/

-- Add index for group_weekly_snapshots.created_by
CREATE INDEX IF NOT EXISTS idx_group_weekly_snapshots_created_by 
ON group_weekly_snapshots(created_by);

-- Add index for groups.archived_by
CREATE INDEX IF NOT EXISTS idx_groups_archived_by 
ON groups(archived_by);

-- Add index for groups.created_by
CREATE INDEX IF NOT EXISTS idx_groups_created_by 
ON groups(created_by);

-- Add index for invitations.group_id
CREATE INDEX IF NOT EXISTS idx_invitations_group_id 
ON invitations(group_id);

-- Add index for pending_user_creations.created_by
CREATE INDEX IF NOT EXISTS idx_pending_user_creations_created_by 
ON pending_user_creations(created_by);

-- Add index for pending_user_creations.group_id
CREATE INDEX IF NOT EXISTS idx_pending_user_creations_group_id 
ON pending_user_creations(group_id);

-- Add index for pending_user_creations.participant_id
CREATE INDEX IF NOT EXISTS idx_pending_user_creations_participant_id 
ON pending_user_creations(participant_id);

-- Add index for user_links.participant_id
CREATE INDEX IF NOT EXISTS idx_user_links_participant_id 
ON user_links(participant_id);
