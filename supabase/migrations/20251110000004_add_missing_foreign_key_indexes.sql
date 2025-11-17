/*
  # Add Missing Foreign Key Indexes
  
  This migration adds indexes on foreign keys that are missing.
  These indexes improve query performance, especially for JOIN operations.
  
  ⚠️ SAFE: Only adds indexes, does not modify data or constraints
  ⚠️ REVERSIBLE: All indexes can be dropped if needed
  
  Impact: Low risk - only adds indexes, no data changes
  Performance: Improves query speed for foreign key lookups
*/

-- Indexes for foreign keys to auth.users
CREATE INDEX IF NOT EXISTS idx_group_weekly_snapshots_created_by 
  ON public.group_weekly_snapshots(created_by);

CREATE INDEX IF NOT EXISTS idx_groups_archived_by 
  ON public.groups(archived_by);

CREATE INDEX IF NOT EXISTS idx_groups_created_by 
  ON public.groups(created_by);

CREATE INDEX IF NOT EXISTS idx_pending_user_creations_created_by 
  ON public.pending_user_creations(created_by);

-- Indexes for foreign keys to groups
CREATE INDEX IF NOT EXISTS idx_invitations_group_id 
  ON public.invitations(group_id);

CREATE INDEX IF NOT EXISTS idx_pending_user_creations_group_id 
  ON public.pending_user_creations(group_id);

-- Indexes for foreign keys to participants
CREATE INDEX IF NOT EXISTS idx_pending_user_creations_participant_id 
  ON public.pending_user_creations(participant_id);

CREATE INDEX IF NOT EXISTS idx_user_links_participant_id 
  ON public.user_links(participant_id);

-- Comments for documentation
COMMENT ON INDEX idx_group_weekly_snapshots_created_by IS 
  'Index for foreign key to auth.users - improves queries filtering by creator';

COMMENT ON INDEX idx_groups_archived_by IS 
  'Index for foreign key to auth.users - improves queries filtering by archiver';

COMMENT ON INDEX idx_groups_created_by IS 
  'Index for foreign key to auth.users - improves queries filtering by creator';

COMMENT ON INDEX idx_invitations_group_id IS 
  'Index for foreign key to groups - improves JOIN performance';

COMMENT ON INDEX idx_pending_user_creations_group_id IS 
  'Index for foreign key to groups - improves queries filtering by group';

COMMENT ON INDEX idx_pending_user_creations_participant_id IS 
  'Index for foreign key to participants - improves JOIN performance';

COMMENT ON INDEX idx_user_links_participant_id IS 
  'Index for foreign key to participants - improves JOIN performance';

